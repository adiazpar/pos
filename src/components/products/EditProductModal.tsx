'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { TrashIcon, SlidersIcon, ImageAttachIcon } from '@/components/icons'
import { Spinner, Modal, useMorphingModal, StockStepper } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import type { ProductCategory } from '@/types'
import type { ProductFormData, StockAdjustmentData } from './ProductModal'

// ============================================
// PRESET ICONS
// ============================================

const PRESET_ICONS = ['🛒', '📦', '🍽️', '☕', '🧴']

function emojiToBlob(emoji: string): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.font = '180px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 128, 140)
    canvas.toBlob((blob) => resolve(blob!), 'image/png')
  })
}

// ============================================
// PROPS
// ============================================

export interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onDelete: (productId: string) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
}

// ============================================
// DELETE BUTTON
// ============================================

function DeleteButton({ onConfirm, isDeleting }: { onConfirm: () => Promise<boolean>; isDeleting: boolean }) {
  const { setProductDeleted } = useProductForm()
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    setProductDeleted(true)
    goToStep(3)
    onConfirm()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : 'Delete'}
    </button>
  )
}

// ============================================
// SAVE BUTTON
// ============================================

function SaveButton({ onSubmit }: { onSubmit: EditProductModalProps['onSubmit'] }) {
  const { name, price, categoryId, active, generatedIconBlob, editingProduct, isSaving, setProductSaved } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    setProductSaved(true)
    goToStep(4)
    onSubmit(
      { name, price, categoryId, active, generatedIconBlob },
      editingProduct?.id || null
    )
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

export function EditProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onDelete,
  onSaveAdjustment,
  canDelete,
}: EditProductModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
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
    setIconPreview,
    setGeneratedIconBlob,
    clearIcon,
    editingProduct,
    newStockValue,
    setNewStockValue,
    isAdjusting,
    isDeleting,
    error,
    productSaved,
    productDeleted,
  } = useProductForm()

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
      title="Edit product"
    >
      {/* Step 0: Edit Form */}
      <Modal.Step title="Edit product">
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Icon Preview */}
        <Modal.Item>
          <label className="label">Icon</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-muted flex items-center justify-center flex-shrink-0">
              {iconPreview ? (
                <Image
                  src={iconPreview}
                  alt="Product icon"
                  width={64}
                  height={64}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <ImageAttachIcon className="w-6 h-6 text-text-tertiary" />
              )}
            </div>
            <div className="w-px self-stretch bg-border flex-shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-hidden">
              {PRESET_ICONS.filter(e => e !== selectedPreset).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={async () => {
                    setSelectedPreset(emoji)
                    const blob = await emojiToBlob(emoji)
                    const url = URL.createObjectURL(blob)
                    setIconPreview(url)
                    setGeneratedIconBlob(blob)
                  }}
                  className="w-12 h-12 rounded-lg bg-bg-muted flex items-center justify-center flex-shrink-0 hover:bg-brand-subtle transition-colors"
                >
                  <span style={{ fontSize: 28 }}>{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </Modal.Item>

        {/* Name */}
        <Modal.Item>
          <label htmlFor="edit-name" className="label">Name <span className="text-error">*</span></label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="E.g.: Large Chips"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Price and Category */}
        <Modal.Item>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="edit-price" className="label">Price ($) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="edit-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  onBlur={() => {
                    const num = parseFloat(price)
                    if (!isNaN(num)) setPrice(num.toFixed(2))
                  }}
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
                    <Plus />
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
                    <Minus />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="edit-category" className="label">Category</label>
              <select
                id="edit-category"
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
          {canDelete && (
            <Modal.GoToStepButton step={2} className="btn btn-secondary btn-icon">
              <TrashIcon className="text-error" style={{ width: 16, height: 16 }} />
            </Modal.GoToStepButton>
          )}
          <Modal.GoToStepButton step={1} className="btn btn-secondary btn-icon">
            <SlidersIcon className="text-brand" style={{ width: 16, height: 16 }} />
          </Modal.GoToStepButton>
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Adjust inventory */}
      <Modal.Step title="Adjust inventory" backStep={0}>
        {editingProduct && (
          <Modal.Item>
            <div className="flex flex-col items-center py-6">
              <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center bg-bg-muted">
                {iconPreview ? (
                  <Image
                    src={iconPreview}
                    alt={editingProduct.name}
                    width={224}
                    height={224}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <ImageAttachIcon className="w-20 h-20 text-text-tertiary" />
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

      {/* Step 2: Delete confirmation */}
      <Modal.Step title="Delete product" backStep={0}>
        <Modal.Item>
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{editingProduct?.name}</strong>? This action cannot be undone.
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
            Cancel
          </Modal.GoToStepButton>
          <DeleteButton onConfirm={handleDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Delete success */}
      <Modal.Step title="Product deleted" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productDeleted && (
                <LottiePlayer
                  src="/animations/error.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              Product deleted
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              The product has been deleted successfully
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            Done
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Save success */}
      <Modal.Step title="Product updated" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productSaved && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              Changes saved!
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              The product has been updated
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            Done
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
