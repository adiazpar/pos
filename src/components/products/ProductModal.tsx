'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { Trash2, ImageIcon, ArrowUp, ArrowDown, Pencil, SlidersHorizontal, Focus } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, StockStepper, DeleteConfirmationStep } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import type { ProductCategory } from '@/types'

// ============================================
// AI PIPELINE NAVIGATOR
// ============================================

/** Navigator for AI flow - watches pipeline state and handles step transitions */
function AiPipelineNavigator() {
  const { pipelineStep, isCompressing } = useProductForm()
  const { goToStep, currentStep } = useMorphingModal()
  const goToStepRef = useRef(goToStep)

  // Keep ref updated without triggering effect
  useLayoutEffect(() => {
    goToStepRef.current = goToStep
  })

  // Navigate to processing step when compression starts or pipeline starts
  useEffect(() => {
    if (currentStep === 0 && (isCompressing || (pipelineStep !== 'idle' && pipelineStep !== 'complete' && pipelineStep !== 'error'))) {
      goToStepRef.current(2) // Go to AI Processing step
    }
  }, [isCompressing, pipelineStep, currentStep])

  // Navigate to review step when pipeline completes
  useEffect(() => {
    if (currentStep === 2 && pipelineStep === 'complete') {
      goToStepRef.current(3) // Go to AI Review step
    }
  }, [pipelineStep, currentStep])

  return null
}

// ============================================
// TYPES
// ============================================

export interface ProductFormData {
  name: string
  price: string
  categoryId: string
  active: boolean
  generatedIconBlob: Blob | null
}

export interface StockAdjustmentData {
  productId: string
  newStockValue: number
}

// ============================================
// PROPS INTERFACE (Reduced from 35+ to 11)
// ============================================

export interface ProductModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  // Data from page
  categories: ProductCategory[]

  // Handlers receive data from context, letting page stay decoupled
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onDelete: (productId: string) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>

  // Permissions
  canDelete: boolean
}

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveProductButtonProps {
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
}

function SaveProductButton({ onSubmit }: SaveProductButtonProps) {
  const { name, price, categoryId, active, generatedIconBlob, editingProduct, isSaving } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onSubmit(
      { name, price, categoryId, active, generatedIconBlob },
      editingProduct?.id || null
    )
    if (success) {
      goToStep(7) // Go to save success step
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={isSaving || !isFormValid || !hasChanges}
    >
      {isSaving ? <Spinner /> : 'Save'}
    </button>
  )
}

// ============================================
// COMPONENT
// ============================================

export function ProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onDelete,
  onSaveAdjustment,
  onAbortAiProcessing,
  onPipelineReset,
  onAiPhotoCapture,
  canDelete,
}: ProductModalProps) {
  // Get all form state from context
  const {
    name,
    setName,
    price,
    setPrice,
    categoryId,
    setCategoryId,
    active,
    setActive,
    iconPreview,
    clearIcon,
    editingProduct,
    newStockValue,
    setNewStockValue,
    isAdjusting,
    isSaving,
    isDeleting,
    error,
    productSaved,
    productDeleted,
    aiProcessing,
    cameraInputRef,
  } = useProductForm()

  // Wrap handlers to pass context data to page handlers
  const handleDelete = async (): Promise<boolean> => {
    if (!editingProduct) return false
    return onDelete(editingProduct.id)
  }

  const handleSaveAdjustment = async (): Promise<void> => {
    if (!editingProduct) return
    return onSaveAdjustment({ productId: editingProduct.id, newStockValue })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={editingProduct ? 'Edit product' : 'Add product'}
      initialStep={editingProduct ? 1 : 0}
    >
      {/* Step 0: Mode Selection (only for new products) */}
      <Modal.Step title="Add product">
        {/* AI Navigation Helper - handles step transitions for AI flow */}
        <AiPipelineNavigator />

        <Modal.Item>
          <div className="caja-actions caja-actions--stacked">
            {/* AI Mode Button */}
            <button
              type="button"
              onClick={() => {
                cameraInputRef.current?.click()
              }}
              className="caja-action-btn caja-action-btn--large"
            >
              <Focus className="caja-action-btn__icon text-brand" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Snap to Add</span>
                <span className="caja-action-btn__desc">Take a photo and AI fills the data</span>
              </div>
            </button>

            {/* Manual Mode Button */}
            <Modal.GoToStepButton
              step={1}
              className="caja-action-btn caja-action-btn--large"
            >
              <Pencil className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Add manually</span>
                <span className="caja-action-btn__desc">Enter the product data yourself</span>
              </div>
            </Modal.GoToStepButton>
          </div>
        </Modal.Item>

        {/* Hidden camera input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={onAiPhotoCapture}
          className="hidden"
        />

        <Modal.Footer>
          <Modal.CancelBackButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Manual Form */}
      <Modal.Step title={editingProduct ? 'Edit product' : 'Add product'}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Icon Preview (if exists) */}
        {iconPreview && (
          <Modal.Item>
            <label className="label">Icon</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-muted flex items-center justify-center border border-border">
                <Image
                  src={iconPreview}
                  alt="Product icon"
                  width={64}
                  height={64}
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={clearIcon}
                className="btn btn-secondary btn-sm"
              >
                Delete
              </button>
            </div>
          </Modal.Item>
        )}

        {/* Name */}
        <Modal.Item>
          <label htmlFor="name" className="label">Name <span className="text-error">*</span></label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="E.g.: Large Chips"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Price and Category inline */}
        <Modal.Item>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="price" className="label">Price ($) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      setPrice((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Increase price"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      setPrice(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Decrease price"
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="category" className="label">Category</label>
              <select
                id="category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`input ${categoryId === '' ? 'select-placeholder' : ''}`}
              >
                <option value="">N/A</option>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Modal.Item>

        {/* Active toggle */}
        <Modal.Item>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">Active</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Show in sales list
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="toggle"
            />
          </div>
        </Modal.Item>

        <Modal.Footer>
          {editingProduct && (
            <>
              {canDelete && (
                <Modal.GoToStepButton step={5} className="btn btn-secondary">
                  <Trash2 className="w-5 h-5" />
                </Modal.GoToStepButton>
              )}
              <Modal.GoToStepButton step={4} className="btn btn-secondary">
                <SlidersHorizontal className="w-5 h-5" />
              </Modal.GoToStepButton>
            </>
          )}
          <SaveProductButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: AI Processing */}
      <Modal.Step title="Analyzing..." backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="spinner-lg mb-4" />
            <p className="text-sm text-text-secondary">Analyzing product...</p>
            <p className="text-xs text-text-tertiary mt-1">This may take a few seconds</p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton>Cancel</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: AI Review */}
      <Modal.Step title="Review product" backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Generated Icon - Large, centered, prominent */}
        <Modal.Item>
          <div className="flex flex-col items-center py-2">
            <div className="w-40 h-40 flex items-center justify-center">
              {iconPreview ? (
                <Image
                  src={iconPreview}
                  alt="Product icon"
                  width={160}
                  height={160}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <ImageIcon className="w-20 h-20 text-text-tertiary" />
              )}
            </div>
          </div>
        </Modal.Item>

        {/* Name (editable) */}
        <Modal.Item>
          <label htmlFor="ai-name" className="label">Name <span className="text-error">*</span></label>
          <input
            id="ai-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="E.g.: Large Chips"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Price and Category - Inline */}
        <Modal.Item>
          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div>
              <label htmlFor="ai-price" className="label">Price ($) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="ai-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      setPrice((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Increase price"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      setPrice(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Decrease price"
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="ai-category" className="label">Category</label>
              <select
                id="ai-category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={`input ${categoryId === '' ? 'select-placeholder' : ''}`}
              >
                <option value="">N/A</option>
                {categories
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.BackButton
            onClick={() => {
              onPipelineReset()
              setName('')
              setPrice('')
            }}
            disabled={isSaving || aiProcessing}
          >
            Back
          </Modal.BackButton>
          <SaveProductButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Adjust inventory */}
      <Modal.Step title="Adjust inventory" backStep={1}>
        {editingProduct && (
          <Modal.Item>
            <div className="flex flex-col items-center py-6">
              <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center">
                {editingProduct.icon ? (
                  <Image
                    src={iconPreview!}
                    alt={editingProduct.name}
                    width={224}
                    height={224}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-20 h-20 text-text-tertiary" />
                )}
              </div>
              <div className="font-medium text-lg mt-4">{editingProduct.name}</div>
            </div>
          </Modal.Item>
        )}

        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <StockStepper
            value={newStockValue}
            onChange={setNewStockValue}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1" disabled={isAdjusting}>
            Cancel
          </Modal.CancelBackButton>
          <button
            type="button"
            onClick={handleSaveAdjustment}
            className="btn btn-primary flex-1"
            disabled={isAdjusting || newStockValue === (editingProduct?.stock ?? 0)}
          >
            {isAdjusting ? <Spinner /> : 'Save'}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Delete confirmation */}
      <DeleteConfirmationStep
        title="Delete product"
        itemName={editingProduct?.name || ''}
        cancelStep={1}
        onConfirm={handleDelete}
        successStep={6}
        isDeleting={isDeleting}
      />

      {/* Step 6: Delete success */}
      <Modal.Step title="Product deleted" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productDeleted && (
                <LottiePlayer
                  src="/animations/error.json"
                  loop={false}
                  autoplay={true}
                  delay={500}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              Product deleted
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              The product has been deleted successfully
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Done
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 7: Product saved success */}
      <Modal.Step title={editingProduct ? 'Product updated' : 'Product created'} hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productSaved && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={500}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {editingProduct ? 'Changes saved!' : 'Product added!'}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {editingProduct ? 'The product has been updated' : 'The product has been created successfully'}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Done
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
