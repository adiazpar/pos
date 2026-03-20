/**
 * Hook for managing product CRUD operations
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useAiProductPipeline, useImageCompression } from '@/hooks'
import type { Product, ProductCategory } from '@/types'

// ============================================
// HOOK INTERFACE
// ============================================

export interface ProductFormState {
  name: string
  price: string
  category: ProductCategory | ''
  active: boolean
  iconPreview: string | null
  generatedIconBlob: Blob | null
}

export interface UseProductCrudOptions {
  onProductSaved?: (product: Product) => void
  onProductDeleted?: (productId: string) => void
}

export interface UseProductCrudReturn {
  // Form state
  formState: ProductFormState
  setName: (name: string) => void
  setPrice: (price: string) => void
  setCategory: (category: ProductCategory | '') => void
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
}: UseProductCrudOptions = {}): UseProductCrudReturn {
  const { pb } = useAuth()

  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
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
    setCategory('')
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
  }, [pipeline, compression])

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
    setCategory('')
    setActive(true)
    setError('')
  }, [pipeline, compression])

  // Handle open add modal
  const handleOpenAdd = useCallback(() => {
    resetForm()
  }, [resetForm])

  // Handle open edit modal
  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategory(product.category || '')
    setActive(product.active)
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
      setError('No hay imagen procesada para regenerar')
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
  const handleSubmit = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      setError('El nombre es requerido')
      return false
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Ingresa un precio valido')
      return false
    }

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('price', priceNum.toString())
      if (category) {
        formData.append('category', category)
      }
      formData.append('active', active.toString())

      if (generatedIconBlob) {
        formData.append('icon', generatedIconBlob, 'icon.png')
      }

      let record: Product
      if (editingProduct) {
        record = await pb.collection('products').update<Product>(editingProduct.id, formData)
      } else {
        record = await pb.collection('products').create<Product>(formData)
      }

      setProductSaved(true)
      onProductSaved?.(record)
      return true
    } catch (err) {
      console.error('Error saving product:', err)
      setError('Error al guardar el producto')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [name, price, category, active, generatedIconBlob, editingProduct, pb, onProductSaved])

  // Save stock adjustment
  const handleSaveAdjustment = useCallback(async () => {
    if (!editingProduct) return

    const currentStock = editingProduct.stock ?? 0
    if (newStockValue === currentStock) return

    setIsAdjusting(true)
    setError('')

    try {
      await pb.collection('products').update(editingProduct.id, {
        stock: newStockValue
      })
      onProductSaved?.({ ...editingProduct, stock: newStockValue })
    } catch (err) {
      console.error('Error adjusting stock:', err)
      setError('Error al ajustar el inventario')
    } finally {
      setIsAdjusting(false)
    }
  }, [editingProduct, newStockValue, pb, onProductSaved])

  // Delete product
  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!editingProduct) return false

    setIsDeleting(true)
    setError('')

    try {
      await pb.collection('products').delete(editingProduct.id)
      setProductDeleted(true)
      onProductDeleted?.(editingProduct.id)
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      setError('Error al eliminar el producto')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [editingProduct, pb, onProductDeleted])

  return {
    formState: {
      name,
      price,
      category,
      active,
      iconPreview,
      generatedIconBlob,
    },
    setName,
    setPrice,
    setCategory,
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
