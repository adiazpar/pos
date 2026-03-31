/**
 * useAiProductPipeline - AI product creation with proper cancellation
 *
 * This hook manages the AI pipeline for product creation with true cancellation:
 * 1. AbortController cancels fetch requests mid-flight
 * 2. Pipeline run IDs ensure stale operations don't update state
 * 3. Background removal runs with abort signal awareness
 *
 * The key insight: you can't actually stop a running ML inference,
 * but you CAN ensure its results are ignored if the pipeline was cancelled.
 */

import { useState, useCallback, useRef } from 'react'
import { apiPost, ApiError, type ApiResponse } from '@/lib/api-client'

// API response types
type IdentifyProductResponse = ApiResponse & {
  data: { name: string }
}

type GenerateIconResponse = ApiResponse & {
  data: { icon: string }
}

type RemoveBackgroundResponse = ApiResponse & {
  data: { image: string }
}

// Pipeline steps for progress indication
export type PipelineStep =
  | 'idle'           // Not running
  | 'compressing'    // Compressing/converting image
  | 'identifying'    // GPT identifying product
  | 'generating'     // Generating emoji icon
  | 'removing-bg'    // Removing background from emoji
  | 'complete'       // Done successfully
  | 'error'          // Failed

export interface PipelineResult {
  name: string
  iconPreview: string      // base64 data URL
  iconBlob: Blob
  cachedBgRemoved: string  // For regeneration
}

export interface PipelineState {
  step: PipelineStep
  error: string | null
  result: PipelineResult | null
}

interface PipelineOptions {
  /** Skip background removal steps (much faster on mobile, but icons have white bg) */
  skipBgRemoval?: boolean
}

interface UseAiProductPipelineReturn {
  state: PipelineState
  startPipeline: (imageBase64: string, options?: PipelineOptions) => Promise<void>
  regenerateIcon: (cachedBgRemoved: string, options?: PipelineOptions) => Promise<PipelineResult | null>
  cancel: () => void
  reset: () => void
}

/**
 * Server-side background removal using BiRefNet via fal.ai
 * Much faster than client-side (~1-3s vs ~10-15s)
 */
async function removeBackgroundServerSide(imageBase64: string): Promise<string> {
  const result = await apiPost<RemoveBackgroundResponse>(
    '/api/ai/remove-background',
    { image: imageBase64 }
  )
  return result.data.image
}

/**
 * Generate a unique run ID for pipeline execution tracking
 */
function generateRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Trim transparent pixels from an image, cropping to the bounding box of content.
 * This ensures the subject fills the frame instead of being a tiny icon in a large transparent canvas.
 */
async function _trimTransparentPixels(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { data, width, height } = imageData

      // Find bounding box of non-transparent pixels
      let minX = width, minY = height, maxX = 0, maxY = 0
      let hasContent = false

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3]
          if (alpha > 10) { // Threshold to ignore near-transparent pixels
            hasContent = true
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }

      if (!hasContent) {
        // No content found, return original
        resolve(blob)
        return
      }

      // Add padding (5% of the larger dimension) to avoid edge cropping
      const contentWidth = maxX - minX + 1
      const contentHeight = maxY - minY + 1
      const padding = Math.max(contentWidth, contentHeight) * 0.05

      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = Math.min(width - 1, maxX + padding)
      maxY = Math.min(height - 1, maxY + padding)

      const cropWidth = maxX - minX + 1
      const cropHeight = maxY - minY + 1

      // Create cropped canvas
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = cropWidth
      croppedCanvas.height = cropHeight
      const croppedCtx = croppedCanvas.getContext('2d')
      if (!croppedCtx) {
        reject(new Error('Failed to get cropped canvas context'))
        return
      }

      croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

      croppedCanvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('Failed to create trimmed blob'))
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('Failed to load image for trimming'))
    img.src = URL.createObjectURL(blob)
  })
}

/**
 * Compress and resize an image blob to fit within size limits.
 * Target ~70KB to stay under 100KB server limit after base64 encoding (~33% overhead).
 */
async function compressIconBlob(blob: Blob, maxSize = 70000, targetDimension = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Create canvas with target dimensions
      const canvas = document.createElement('canvas')
      canvas.width = targetDimension
      canvas.height = targetDimension
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Helper to draw image centered and scaled to fill the canvas
      const drawCenteredScaled = (targetCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D, dim: number): void => {
        targetCanvas.width = dim
        targetCanvas.height = dim
        targetCtx.clearRect(0, 0, dim, dim)

        // Scale to fill (cover), maintaining aspect ratio
        const s = Math.max(dim / img.width, dim / img.height)
        const sw = img.width * s
        const sh = img.height * s
        const ox = (dim - sw) / 2
        const oy = (dim - sh) / 2

        targetCtx.drawImage(img, ox, oy, sw, sh)
      }

      // Try PNG first, if too large fall back to smaller dimensions
      const tryCompress = (dimension: number): void => {
        if (dimension < 64) {
          // Give up, just use smallest size
          drawCenteredScaled(canvas, ctx, 64)
          canvas.toBlob((result) => {
            if (result) resolve(result)
            else reject(new Error('Failed to create blob'))
          }, 'image/png')
          return
        }

        drawCenteredScaled(canvas, ctx, dimension)

        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error('Failed to create blob'))
            return
          }
          if (result.size <= maxSize) {
            resolve(result)
          } else {
            // Try smaller dimension
            tryCompress(Math.floor(dimension * 0.75))
          }
        }, 'image/png')
      }

      tryCompress(targetDimension)
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = URL.createObjectURL(blob)
  })
}

export function useAiProductPipeline(): UseAiProductPipelineReturn {
  const [state, setState] = useState<PipelineState>({
    step: 'idle',
    error: null,
    result: null,
  })

  // Current run tracking - only the active run can update state
  const currentRunIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Cancel any running pipeline.
   * - Aborts fetch requests immediately
   * - Marks the run as cancelled so background removal results are ignored
   */
  const cancel = useCallback(() => {
    // Abort any in-flight fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Invalidate the current run (background removal will complete but be ignored)
    currentRunIdRef.current = null

    // Reset state immediately for responsive UI
    setState({
      step: 'idle',
      error: null,
      result: null,
    })
  }, [])

  /**
   * Reset to initial state (e.g., when starting fresh)
   */
  const reset = useCallback(() => {
    cancel()
  }, [cancel])

  /**
   * Check if this run is still active (hasn't been cancelled)
   */
  const isRunActive = useCallback((runId: string): boolean => {
    return currentRunIdRef.current === runId
  }, [])

  /**
   * Update state only if the run is still active
   */
  const safeSetState = useCallback((runId: string, update: Partial<PipelineState> | ((prev: PipelineState) => PipelineState)) => {
    if (!isRunActive(runId)) {
      return false
    }

    if (typeof update === 'function') {
      setState(update)
    } else {
      setState(prev => ({ ...prev, ...update }))
    }
    return true
  }, [isRunActive])

  /**
   * Run the full AI pipeline with PARALLEL execution:
   * 1. Identify product + Generate emoji (run in parallel)
   * 2. Remove background from emoji
   *
   * Parallel execution saves ~2-3s since identify and generate don't depend on each other.
   */
  const startPipeline = useCallback(async (imageBase64: string, options?: PipelineOptions): Promise<void> => {
    const { skipBgRemoval = false } = options || {}

    // Cancel any existing run
    cancel()

    // Start new run
    const runId = generateRunId()
    currentRunIdRef.current = runId
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setState({
      step: 'generating', // Show "generating" since both run in parallel
      error: null,
      result: null,
    })

    try {
      // PARALLEL EXECUTION: Run identify and generate simultaneously
      // This saves ~2-3s since they both only need the original image
      const [identifyResult, iconResult] = await Promise.all([
        // Task 1: Identify product using GPT-4o Mini Vision
        apiPost<IdentifyProductResponse>(
          '/api/ai/identify-product',
          { image: imageBase64 },
          { signal }
        ),
        // Task 2: Generate emoji icon using Nano Banana Edit
        apiPost<GenerateIconResponse>(
          '/api/ai/generate-icon',
          { image: imageBase64 },
          { signal }
        ),
      ])

      if (!isRunActive(runId)) return

      const productName = identifyResult.data.name

      // Step 3: Remove background from generated icon (optional, slow on mobile)
      const iconDataUrl = iconResult.data.icon
      const iconFetchResponse = await fetch(iconDataUrl)
      const iconBlob = await iconFetchResponse.blob()

      if (!isRunActive(runId)) return

      let trimmedBlob: Blob

      if (skipBgRemoval) {
        trimmedBlob = iconBlob
      } else {
        if (!safeSetState(runId, { step: 'removing-bg' })) return

        // Use server-side BiRefNet - much faster than client-side (~1-3s vs ~10-15s)
        const transparentBase64 = await removeBackgroundServerSide(iconDataUrl)

        if (!isRunActive(runId)) {
          return
        }

        // Convert base64 to blob
        const fetchRes = await fetch(transparentBase64)
        trimmedBlob = await fetchRes.blob()

        if (!isRunActive(runId)) return
      }

      // Compress to fit file upload size limits (target 400KB)
      const transparentIconBlob = await compressIconBlob(trimmedBlob)

      if (!isRunActive(runId)) return

      // Convert to base64 for preview
      const transparentIconBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(transparentIconBlob)
      })

      if (!isRunActive(runId)) return

      // Success!
      setState({
        step: 'complete',
        error: null,
        result: {
          name: productName,
          iconPreview: transparentIconBase64,
          iconBlob: transparentIconBlob,
          cachedBgRemoved: imageBase64, // Cache original for regeneration
        },
      })

    } catch (err) {
      // Check if this was an abort
      if (err instanceof Error && err.name === 'AbortError') {
        // Don't set error state - the cancel() already reset state
        return
      }

      // Check if run was cancelled
      if (!isRunActive(runId)) {
        return
      }

      // Handle ApiError or generic errors
      const errorMessage = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to process image'

      setState({
        step: 'error',
        error: errorMessage,
        result: null,
      })
    }
  }, [cancel, isRunActive, safeSetState])

  /**
   * Regenerate just the icon using cached background-removed image.
   * This skips steps 1-2 and only runs steps 3-4.
   */
  const regenerateIcon = useCallback(async (cachedBgRemoved: string, options?: PipelineOptions): Promise<PipelineResult | null> => {
    const { skipBgRemoval = false } = options || {}

    // Cancel any existing run
    cancel()

    // Start new run
    const runId = generateRunId()
    currentRunIdRef.current = runId
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setState(prev => ({
      ...prev,
      step: 'generating',
      error: null,
    }))

    try {
      // Step 3: Generate new emoji
      const iconResult = await apiPost<GenerateIconResponse>(
        '/api/ai/generate-icon',
        { image: cachedBgRemoved },
        { signal }
      )

      if (!isRunActive(runId)) return null

      // Step 4: Remove background from generated icon (optional, slow on mobile)
      const iconDataUrl = iconResult.data.icon
      const iconFetchResponse = await fetch(iconDataUrl)
      const iconBlob = await iconFetchResponse.blob()

      if (!isRunActive(runId)) return null

      let trimmedBlob: Blob

      if (skipBgRemoval) {
        trimmedBlob = iconBlob
      } else {
        if (!safeSetState(runId, prev => ({ ...prev, step: 'removing-bg' }))) return null

        // Use server-side BiRefNet - much faster than client-side (~1-3s vs ~10-15s)
        const transparentBase64 = await removeBackgroundServerSide(iconDataUrl)

        if (!isRunActive(runId)) return null

        // Convert base64 to blob
        const fetchRes = await fetch(transparentBase64)
        trimmedBlob = await fetchRes.blob()

        if (!isRunActive(runId)) return null
      }

      // Compress to fit file upload size limits (target 400KB)
      const transparentIconBlob = await compressIconBlob(trimmedBlob)

      if (!isRunActive(runId)) return null

      const transparentIconBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(transparentIconBlob)
      })

      if (!isRunActive(runId)) return null

      const result: PipelineResult = {
        name: '', // Will use existing name
        iconPreview: transparentIconBase64,
        iconBlob: transparentIconBlob,
        cachedBgRemoved: cachedBgRemoved, // Keep the same cache
      }

      setState(prev => ({
        ...prev,
        step: 'complete',
        error: null,
        result: {
          ...result,
          name: prev.result?.name || '',
        },
      }))

      return result

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null
      }

      if (!isRunActive(runId)) return null

      // Handle ApiError or generic errors
      const errorMessage = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to regenerate icon'

      setState(prev => ({
        ...prev,
        step: 'error',
        error: errorMessage,
      }))
      return null
    }
  }, [cancel, isRunActive, safeSetState])

  return {
    state,
    startPipeline,
    regenerateIcon,
    cancel,
    reset,
  }
}
