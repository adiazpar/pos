'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Image from 'next/image'
import { Trash2, ImageIcon, ArrowUp, ArrowDown, Pencil, SlidersHorizontal, Focus } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, StockStepper } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { getProductIconUrl } from '@/lib/utils'
import { CATEGORY_CONFIG } from '@/lib/products'
import type { Product, ProductCategory } from '@/types'
import type { PipelineStep } from '@/hooks'

// ============================================
// AI PIPELINE NAVIGATOR
// ============================================

interface AiPipelineNavigatorProps {
  pipelineStep: PipelineStep
  isCompressing: boolean
}

/** Navigator for AI flow - watches pipeline state and handles step transitions */
function AiPipelineNavigator({ pipelineStep, isCompressing }: AiPipelineNavigatorProps) {
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
// PROPS INTERFACE
// ============================================

export interface ProductModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  // Form state
  name: string
  onNameChange: (name: string) => void
  price: string
  onPriceChange: (price: string) => void
  category: ProductCategory | ''
  onCategoryChange: (category: ProductCategory | '') => void
  active: boolean
  onActiveChange: (active: boolean) => void
  iconPreview: string | null
  onClearIcon: () => void

  // Editing state
  editingProduct: Product | null

  // Stock adjustment
  newStockValue: number
  onNewStockValueChange: (value: number) => void
  onSaveAdjustment: () => Promise<void>
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
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  cameraInputRef: React.MutableRefObject<HTMLInputElement | null>
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>

  // Handlers
  onSubmit: () => Promise<boolean>
  onDelete: () => Promise<boolean>

  // Permissions
  canDelete: boolean
}

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveProductButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveProductButton({ onSubmit, isSaving, disabled }: SaveProductButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onSubmit()
    if (success) {
      goToStep(7) // Go to save success step
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {isSaving ? <Spinner /> : 'Guardar'}
    </button>
  )
}

interface ConfirmDeleteProductButtonProps {
  onDelete: () => Promise<boolean>
  isDeleting: boolean
}

function ConfirmDeleteProductButton({ onDelete, isDeleting }: ConfirmDeleteProductButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onDelete()
    if (success) {
      goToStep(6) // Go to delete success step
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : 'Eliminar'}
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
  name,
  onNameChange,
  price,
  onPriceChange,
  category,
  onCategoryChange,
  active,
  onActiveChange,
  iconPreview,
  onClearIcon,
  editingProduct,
  newStockValue,
  onNewStockValueChange,
  onSaveAdjustment,
  isAdjusting,
  isSaving,
  isDeleting,
  error,
  productSaved,
  productDeleted,
  pipelineStep,
  isCompressing,
  aiProcessing,
  onAbortAiProcessing,
  onPipelineReset,
  cameraInputRef,
  onAiPhotoCapture,
  onSubmit,
  onDelete,
  canDelete,
}: ProductModalProps) {
  const isFormValid = name.trim() && price && parseFloat(price) >= 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={editingProduct ? 'Editar producto' : 'Agregar producto'}
      initialStep={editingProduct ? 1 : 0}
    >
      {/* Step 0: Mode Selection (only for new products) */}
      <Modal.Step title="Agregar producto">
        {/* AI Navigation Helper - handles step transitions for AI flow */}
        <AiPipelineNavigator pipelineStep={pipelineStep} isCompressing={isCompressing} />

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
                <span className="caja-action-btn__desc">Toma una foto y la IA completa los datos</span>
              </div>
            </button>

            {/* Manual Mode Button */}
            <Modal.GoToStepButton
              step={1}
              className="caja-action-btn caja-action-btn--large"
            >
              <Pencil className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Agregar manual</span>
                <span className="caja-action-btn__desc">Ingresa los datos del producto tu mismo</span>
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
      <Modal.Step title={editingProduct ? 'Editar producto' : 'Agregar producto'}>
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
            <label className="label">Icono</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-muted flex items-center justify-center border border-border">
                <Image
                  src={iconPreview}
                  alt="Icono del producto"
                  width={64}
                  height={64}
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={onClearIcon}
                className="btn btn-secondary btn-sm"
              >
                Eliminar
              </button>
            </div>
          </Modal.Item>
        )}

        {/* Name */}
        <Modal.Item>
          <label htmlFor="name" className="label">Nombre <span className="text-error">*</span></label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder="Ej: Chifle Grande"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Price and Category inline */}
        <Modal.Item>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="price" className="label">Precio (S/) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => onPriceChange(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      onPriceChange((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Incrementar precio"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      onPriceChange(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Decrementar precio"
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="category" className="label">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={e => onCategoryChange(e.target.value as ProductCategory | '')}
                className={`input ${category === '' ? 'select-placeholder' : ''}`}
              >
                <option value="">N/A</option>
                {Object.entries(CATEGORY_CONFIG)
                  .sort(([, a], [, b]) => a.order - b.order)
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}{config.size ? ` (${config.size})` : ''}
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
              <span className="label mb-0">Activo</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Mostrar en la lista de ventas
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={e => onActiveChange(e.target.checked)}
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
          <SaveProductButton onSubmit={onSubmit} isSaving={isSaving} disabled={isSaving || !isFormValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: AI Processing */}
      <Modal.Step title="Analizando..." backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="spinner-lg mb-4" />
            <p className="text-sm text-text-secondary">Analizando producto...</p>
            <p className="text-xs text-text-tertiary mt-1">Esto puede tomar unos segundos</p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton>Cancelar</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: AI Review */}
      <Modal.Step title="Revisar producto" backStep={0}>
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
                  alt="Icono del producto"
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
          <label htmlFor="ai-name" className="label">Nombre <span className="text-error">*</span></label>
          <input
            id="ai-name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder="Ej: Chifle Grande"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Price and Category - Inline */}
        <Modal.Item>
          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div>
              <label htmlFor="ai-price" className="label">Precio (S/) <span className="text-error">*</span></label>
              <div className="input-number-wrapper">
                <input
                  id="ai-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => onPriceChange(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
                <div className="input-number-spinners">
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      onPriceChange((current + 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Incrementar precio"
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="input-number-spinner"
                    onClick={() => {
                      const current = parseFloat(price) || 0
                      onPriceChange(Math.max(0, current - 1).toFixed(2))
                    }}
                    tabIndex={-1}
                    aria-label="Decrementar precio"
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="ai-category" className="label">Categoria</label>
              <select
                id="ai-category"
                value={category}
                onChange={e => onCategoryChange(e.target.value as ProductCategory | '')}
                className={`input ${category === '' ? 'select-placeholder' : ''}`}
              >
                <option value="">N/A</option>
                {Object.entries(CATEGORY_CONFIG)
                  .sort(([, a], [, b]) => a.order - b.order)
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}{config.size ? ` (${config.size})` : ''}
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
              onNameChange('')
              onPriceChange('')
            }}
            disabled={isSaving || aiProcessing}
          >
            Atras
          </Modal.BackButton>
          <SaveProductButton onSubmit={onSubmit} isSaving={isSaving} disabled={isSaving || !isFormValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Adjust inventory */}
      <Modal.Step title="Ajustar inventario" backStep={1}>
        {editingProduct && (
          <Modal.Item>
            <div className="flex flex-col items-center py-6">
              <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center">
                {editingProduct.icon ? (
                  <Image
                    src={getProductIconUrl(editingProduct)!}
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
            onChange={onNewStockValueChange}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1" disabled={isAdjusting}>
            Cancelar
          </Modal.CancelBackButton>
          <button
            type="button"
            onClick={onSaveAdjustment}
            className="btn btn-primary flex-1"
            disabled={isAdjusting || newStockValue === (editingProduct?.stock ?? 0)}
          >
            {isAdjusting ? <Spinner /> : 'Guardar'}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Delete confirmation */}
      <Modal.Step title="Eliminar producto" backStep={1}>
        <Modal.Item>
          <p className="text-text-secondary">
            Estas seguro que deseas eliminar <strong>{editingProduct?.name}</strong>? Esta accion no se puede deshacer.
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1" disabled={isDeleting}>
            Cancelar
          </Modal.GoToStepButton>
          <ConfirmDeleteProductButton onDelete={onDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 6: Delete success */}
      <Modal.Step title="Producto eliminado" hideBackButton>
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
              Producto eliminado
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              El producto ha sido eliminado correctamente
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Listo
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 7: Product saved success */}
      <Modal.Step title={editingProduct ? 'Producto actualizado' : 'Producto creado'} hideBackButton>
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
              {editingProduct ? 'Cambios guardados!' : 'Producto agregado!'}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {editingProduct ? 'El producto ha sido actualizado' : 'El producto ha sido creado correctamente'}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary flex-1"
          >
            Listo
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
