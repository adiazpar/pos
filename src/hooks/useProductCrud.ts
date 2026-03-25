/**
 * Hook for managing product CRUD operations
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAiProductPipeline, useImageCompression } from '@/hooks'
import type { Product } from '@/types'

// ============================================
// HOOK INTERFACE
// ============================================

export interface ProductFormState {
  name: string
  price: string
  categoryId: string
  active: boolean
  iconPreview: string | null
  generatedIconBlob: Blob | null
}

export interface UseProductCrudOptions {
  onProductSaved?: (product: Product) => void
  onProductDeleted?: (productId: string) => void
  defaultCategoryId?: string | null
}

export interface UseProductCrudReturn {
  // Form state
  formState: ProductFormState
  setName: (name: string) => void
  setPrice: (price: string) => void
  setCategoryId: (categoryId: string) => void
  setActive: (active: boolean) => void
  setIconPreview: (preview: string | null) => void

  // Editing state
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void

  // Stock adjustment
  newStockValue: number
  setNewStockValue: (value: number) => void

  // Operation states
  isSaving: boolean
  isDeleting: boolean
  isAdjusting: boolean
  error: string
  setError: (error: string) => void

  // Success states
  productSaved: boolean
  productDeleted: boolean
  setProductSaved: (saved: boolean) => void
  setProductDeleted: (deleted: boolean) => void

  // AI Pipeline
  pipeline: ReturnType<typeof useAiProductPipeline>
  compression: ReturnType<typeof useImageCompression>
  aiProcessing: boolean
  cameraInputRef: React.RefObject<HTMLInputElement | null>

  // Handlers
  resetForm: () => void
  handleOpenAdd: () => void
  handleOpenEdit: (product: Product) => void
  handleAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleRegenerateIcon: () => Promise<void>
  handleClearIcon: () => void
  handleSubmit: () => Promise<boolean>
  handleSaveAdjustment: () => Promise<void>
  handleDelete: () => Promise<boolean>
  abortAiProcessing: () => void
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useProductCrud({
  onProductSaved,
  onProductDeleted,
  defaultCategoryId,
}: UseProductCrudOptions = {}): UseProductCrudReturn {
  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '')
  const [active, setActive] = useState(true)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [generatedIconBlob, setGeneratedIconBlob] = useState<Blob | null>(null)

  // Editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Stock adjustment
  const [newStockValue, setNewStockValue] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Operation states
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Success states
  const [productSaved, setProductSaved] = useState(false)
  const [productDeleted, setProductDeleted] = useState(false)

  // AI Pipeline
  const pipeline = useAiProductPipeline()
  const compression = useImageCompression()
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Derived state
  const aiProcessing = pipeline.state.step !== 'idle' && pipeline.state.step !== 'complete' && pipeline.state.step !== 'error'

  // Sync pipeline results to local state when complete
  useEffect(() => {
    if (pipeline.state.step === 'complete' && pipeline.state.result) {
      const result = pipeline.state.result
      setName(result.name)
      setIconPreview(result.iconPreview)
      setGeneratedIconBlob(result.iconBlob)
    }
  }, [pipeline.state.step, pipeline.state.result])

  // Show pipeline errors
  useEffect(() => {
    if (pipeline.state.step === 'error' && pipeline.state.error) {
      setError(pipeline.state.error)
    }
  }, [pipeline.state.step, pipeline.state.error])

  // Reset form
  const resetForm = useCallback(() => {
    setName('')
    setPrice('')
    setCategoryId(defaultCategoryId || '')
    setActive(true)
    setIconPreview(null)
    setGeneratedIconBlob(null)
    setEditingProduct(null)
    setError('')
    setProductDeleted(false)
    setProductSaved(false)
    // Only reset AI pipeline if it's actually running
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
  }, [pipeline, compression, defaultCategoryId])

  // Abort AI processing
  const abortAiProcessing = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.cancel()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setIconPreview(null)
    setGeneratedIconBlob(null)
    setName('')
    setPrice('')
    setCategoryId(defaultCategoryId || '')
    setActive(true)
    setError('')
  }, [pipeline, compression, defaultCategoryId])

  // Handle open add modal
  const handleOpenAdd = useCallback(() => {
    resetForm()
  }, [resetForm])

  // Handle open edit modal
  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategoryId(product.categoryId || '')
    setActive(product.active ?? true)
    // Note: iconPreview should be set by caller using getProductIconUrl
    setGeneratedIconBlob(null)
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setNewStockValue(product.stock ?? 0)
    setError('')
  }, [pipeline, compression])

  // Handle AI photo capture
  const handleAiPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    const compressedBase64 = await compression.compressImage(file)

    if (compression.state.error) {
      setError(compression.state.error)
      return
    }

    if (!compressedBase64) return

    await pipeline.startPipeline(compressedBase64)
  }, [compression, pipeline])

  // Regenerate icon
  const handleRegenerateIcon = useCallback(async () => {
    const cachedBgRemoved = pipeline.state.result?.cachedBgRemoved
    if (!cachedBgRemoved) {
      setError('No processed image to regenerate')
      return
    }

    setError('')
    const result = await pipeline.regenerateIcon(cachedBgRemoved)

    if (result) {
      setIconPreview(result.iconPreview)
      setGeneratedIconBlob(result.iconBlob)
    }
  }, [pipeline])

  // Clear icon
  const handleClearIcon = useCallback(() => {
    setIconPreview(null)
    setGeneratedIconBlob(null)
  }, [])

  // Submit product
  // TODO: Implement with Drizzle API routes
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      setError('Name is required')
      return false
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Enter a valid price')
      return false
    }

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('price', priceNum.toString())
      if (categoryId) {
        formData.append('categoryId', categoryId)
      }
      formData.append('active', active.toString())

      if (generatedIconBlob) {
        formData.append('icon', generatedIconBlob, 'icon.png')
      }

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      const method = editingProduct ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to save product')
        return false
      }

      setProductSaved(true)
      onProductSaved?.(data.product)
      return true
    } catch (err) {
      console.error('Error saving product:', err)
      setError('Failed to save product')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [name, price, categoryId, active, generatedIconBlob, editingProduct, onProductSaved])

  // Save stock adjustment
  // TODO: Implement with Drizzle API routes
  const handleSaveAdjustment = useCallback(async () => {
    if (!editingProduct) return

    const currentStock = editingProduct.stock ?? 0
    if (newStockValue === currentStock) return

    setIsAdjusting(true)
    setError('')

    try {
      const response = await fetch(`/api/products/${editingProduct.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStockValue }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to adjust inventory')
        return
      }

      onProductSaved?.({ ...editingProduct, stock: newStockValue })
    } catch (err) {
      console.error('Error adjusting stock:', err)
      setError('Failed to adjust inventory')
    } finally {
      setIsAdjusting(false)
    }
  }, [editingProduct, newStockValue, onProductSaved])

  // Delete product
  // TODO: Implement with Drizzle API routes
  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!editingProduct) return false

    setIsDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete product')
        return false
      }

      setProductDeleted(true)
      onProductDeleted?.(editingProduct.id)
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      setError('Failed to delete product')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [editingProduct, onProductDeleted])

  return {
    formState: {
      name,
      price,
      categoryId,
      active,
      iconPreview,
      generatedIconBlob,
    },
    setName,
    setPrice,
    setCategoryId,
    setActive,
    setIconPreview,
    editingProduct,
    setEditingProduct,
    newStockValue,
    setNewStockValue,
    isSaving,
    isDeleting,
    isAdjusting,
    error,
    setError,
    productSaved,
    productDeleted,
    setProductSaved,
    setProductDeleted,
    pipeline,
    compression,
    aiProcessing,
    cameraInputRef,
    resetForm,
    handleOpenAdd,
    handleOpenEdit,
    handleAiPhotoCapture,
    handleRegenerateIcon,
    handleClearIcon,
    handleSubmit,
    handleSaveAdjustment,
    handleDelete,
    abortAiProcessing,
  }
}
