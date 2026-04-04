'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { ImageIcon, ArrowUp, ArrowDown, Pencil, Focus } from 'lucide-react'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { SettingsIcon } from '@/components/icons'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import type { ProductCategory } from '@/types'
import type { ProductFormData } from './ProductModal'

// ============================================
// AI PIPELINE NAVIGATOR
// ============================================

function AiPipelineNavigator() {
  const { pipelineStep, isCompressing } = useProductForm()
  const { goToStep, currentStep } = useMorphingModal()
  const goToStepRef = useRef(goToStep)

  useLayoutEffect(() => {
    goToStepRef.current = goToStep
  })

  useEffect(() => {
    if (currentStep === 0 && (isCompressing || (pipelineStep !== 'idle' && pipelineStep !== 'complete' && pipelineStep !== 'error'))) {
      goToStepRef.current(2)
    }
  }, [isCompressing, pipelineStep, currentStep])

  useEffect(() => {
    if (currentStep === 2 && pipelineStep === 'complete') {
      goToStepRef.current(3)
    }
  }, [pipelineStep, currentStep])

  return null
}

// ============================================
// PROPS
// ============================================

export interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
}

// ============================================
// SAVE BUTTON
// ============================================

function SaveButton({ onSubmit }: { onSubmit: AddProductModalProps['onSubmit'] }) {
  const { name, price, categoryId, active, generatedIconBlob, isSaving, setProductSaved } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()
  const { goToStep } = useMorphingModal()

  const handleClick = () => {
    setProductSaved(true)
    goToStep(4)
    onSubmit(
      { name, price, categoryId, active, generatedIconBlob },
      null
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

export function AddProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onAbortAiProcessing,
  onPipelineReset,
  onAiPhotoCapture,
  onOpenSettings,
}: AddProductModalProps) {
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
    isSaving,
    error,
    productSaved,
    aiProcessing,
    cameraInputRef,
  } = useProductForm()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title="Add product"
    >
      {/* Step 0: Mode Selection */}
      <Modal.Step title="Add product">
        <AiPipelineNavigator />

        <Modal.Item>
          <div className="caja-actions caja-actions--stacked">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="caja-action-btn caja-action-btn--large"
            >
              <Focus className="caja-action-btn__icon text-brand" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Snap to Add</span>
                <span className="caja-action-btn__desc">Take a photo and AI fills the data</span>
              </div>
            </button>

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

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={onAiPhotoCapture}
          className="hidden"
        />

        <Modal.Footer>
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-secondary btn-icon"
            aria-label="Product settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <Modal.CancelBackButton />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Manual Form */}
      <Modal.Step title="Add product">
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

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
          <SaveButton onSubmit={onSubmit} />
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

        <Modal.Item>
          <div className="grid grid-cols-2 gap-3">
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
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Save success */}
      <Modal.Step title="Product created" hideBackButton>
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
              Product added!
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              The product has been created successfully
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
