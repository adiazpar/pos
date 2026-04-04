'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import type { Product } from '@/types'
import type { PipelineStep } from '@/hooks'

// ============================================
// TYPES
// ============================================

interface ProductFormState {
  // Form fields
  name: string
  price: string
  categoryId: string
  active: boolean
  iconPreview: string | null
  generatedIconBlob: Blob | null

  // Editing state
  editingProduct: Product | null

  // Stock adjustment
  newStockValue: number
  isAdjusting: boolean

  // Operation states
  isSaving: boolean
  isDeleting: boolean
  error: string

  // Success states
  productSaved: boolean
  productDeleted: boolean

  // AI Pipeline
  pipelineStep: PipelineStep
  isCompressing: boolean
  aiProcessing: boolean
}

interface ProductFormActions {
  // Form field setters
  setName: (name: string) => void
  setPrice: (price: string) => void
  setCategoryId: (categoryId: string) => void
  setActive: (active: boolean) => void
  setIconPreview: (preview: string | null) => void
  setGeneratedIconBlob: (blob: Blob | null) => void
  clearIcon: () => void

  // Editing state
  setEditingProduct: (product: Product | null) => void

  // Stock adjustment
  setNewStockValue: (value: number) => void
  setIsAdjusting: (value: boolean) => void

  // Operation states
  setIsSaving: (value: boolean) => void
  setIsDeleting: (value: boolean) => void
  setError: (error: string) => void

  // Success states
  setProductSaved: (value: boolean) => void
  setProductDeleted: (value: boolean) => void

  // AI Pipeline
  setPipelineStep: (step: PipelineStep) => void
  setIsCompressing: (value: boolean) => void

  // Camera ref
  cameraInputRef: React.MutableRefObject<HTMLInputElement | null>

  // Composite actions
  resetForm: (defaultCategoryId?: string | null) => void
  populateFromProduct: (product: Product, getIconUrl: (p: Product) => string | null) => void
}

type ProductFormContextValue = ProductFormState & ProductFormActions

// ============================================
// CONTEXT
// ============================================

const ProductFormContext = createContext<ProductFormContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

interface ProductFormProviderProps {
  children: React.ReactNode
  defaultCategoryId?: string | null
}

export function ProductFormProvider({ children, defaultCategoryId }: ProductFormProviderProps) {
  // Form fields
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

  // AI Pipeline state (these come from hooks in the parent, passed via setPipelineStep/setIsCompressing)
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle')
  const [isCompressing, setIsCompressing] = useState(false)

  // Camera ref
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Derived state
  const aiProcessing = pipelineStep !== 'idle' && pipelineStep !== 'complete' && pipelineStep !== 'error'

  // Clear icon
  const clearIcon = useCallback(() => {
    setIconPreview(null)
    setGeneratedIconBlob(null)
  }, [])

  // Reset form
  const resetForm = useCallback((defaultCatId?: string | null) => {
    setName('')
    setPrice('')
    setCategoryId(defaultCatId || '')
    setActive(true)
    setIconPreview(null)
    setGeneratedIconBlob(null)
    setEditingProduct(null)
    setError('')
    setProductDeleted(false)
    setProductSaved(false)
    setPipelineStep('idle')
    setIsCompressing(false)
  }, [])

  // Populate from product (for editing)
  const populateFromProduct = useCallback((product: Product, getIconUrl: (p: Product) => string | null) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategoryId(product.categoryId || '')
    setActive(product.status === 'active')
    setIconPreview(getIconUrl(product))
    setGeneratedIconBlob(null)
    setNewStockValue(product.stock ?? 0)
    setError('')
    setPipelineStep('idle')
    setIsCompressing(false)
  }, [])

  const value = useMemo<ProductFormContextValue>(() => ({
    // State
    name,
    price,
    categoryId,
    active,
    iconPreview,
    generatedIconBlob,
    editingProduct,
    newStockValue,
    isAdjusting,
    isSaving,
    isDeleting,
    error,
    productSaved,
    productDeleted,
    pipelineStep,
    isCompressing,
    aiProcessing,

    // Actions
    setName,
    setPrice,
    setCategoryId,
    setActive,
    setIconPreview,
    setGeneratedIconBlob,
    clearIcon,
    setEditingProduct,
    setNewStockValue,
    setIsAdjusting,
    setIsSaving,
    setIsDeleting,
    setError,
    setProductSaved,
    setProductDeleted,
    setPipelineStep,
    setIsCompressing,
    cameraInputRef,
    resetForm,
    populateFromProduct,
  }), [
    name, price, categoryId, active, iconPreview, generatedIconBlob,
    editingProduct, newStockValue, isAdjusting, isSaving, isDeleting,
    error, productSaved, productDeleted, pipelineStep, isCompressing,
    aiProcessing, clearIcon, resetForm, populateFromProduct, cameraInputRef,
  ])

  return (
    <ProductFormContext.Provider value={value}>
      {children}
    </ProductFormContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useProductForm() {
  const context = useContext(ProductFormContext)
  if (!context) {
    throw new Error('useProductForm must be used within a ProductFormProvider')
  }
  return context
}

// ============================================
// DERIVED HOOKS
// ============================================

/** Hook for form validation state */
export function useProductFormValidation() {
  const { name, price, editingProduct, categoryId, active } = useProductForm()

  const isFormValid = name.trim() && price && parseFloat(price) >= 0

  const hasChanges = !editingProduct || (
    name.trim() !== editingProduct.name ||
    parseFloat(price) !== editingProduct.price ||
    (categoryId || null) !== (editingProduct.categoryId || null) ||
    active !== (editingProduct.status === 'active')
  )

  return { isFormValid, hasChanges }
}
