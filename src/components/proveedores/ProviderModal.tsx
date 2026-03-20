'use client'

import { Trash2 } from 'lucide-react'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { PhoneInput } from '@/components/auth/phone-input'
import type { Provider } from '@/types'

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveProviderButtonProps {
  onSubmit: () => Promise<boolean>
  isSaving: boolean
  disabled: boolean
}

function SaveProviderButton({ onSubmit, isSaving, disabled }: SaveProviderButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onSubmit()
    if (success) {
      goToStep(2) // Go to save success step
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

interface ConfirmDeleteButtonProps {
  onDelete: () => Promise<boolean>
  isDeleting: boolean
}

function ConfirmDeleteButton({ onDelete, isDeleting }: ConfirmDeleteButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleClick = async () => {
    const success = await onDelete()
    if (success) {
      goToStep(3) // Go to delete success step
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
// PROPS INTERFACE
// ============================================

export interface ProviderModalProps {
  // Modal state
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void

  // Form state
  name: string
  onNameChange: (name: string) => void
  phone: string
  onPhoneChange: (phone: string) => void
  email: string
  onEmailChange: (email: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  active: boolean
  onActiveChange: (active: boolean) => void

  // Editing state
  editingProvider: Provider | null

  // Operation states
  isSaving: boolean
  isDeleting: boolean
  error: string

  // Success states
  providerSaved: boolean
  providerDeleted: boolean

  // Handlers
  onSubmit: () => Promise<boolean>
  onDelete: () => Promise<boolean>

  // Permissions
  canDelete: boolean
}

// ============================================
// COMPONENT
// ============================================

export function ProviderModal({
  isOpen,
  onClose,
  onExitComplete,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  notes,
  onNotesChange,
  active,
  onActiveChange,
  editingProvider,
  isSaving,
  isDeleting,
  error,
  providerSaved,
  providerDeleted,
  onSubmit,
  onDelete,
  canDelete,
}: ProviderModalProps) {
  const isFormValid = name.trim().length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={editingProvider ? 'Editar proveedor' : 'Agregar proveedor'}
    >
      {/* Step 0: Form */}
      <Modal.Step title={editingProvider ? 'Editar proveedor' : 'Agregar proveedor'}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Name */}
        <Modal.Item>
          <label htmlFor="provider-name" className="label">Nombre <span className="text-error">*</span></label>
          <input
            id="provider-name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder="Nombre del proveedor"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Phone */}
        <Modal.Item>
          <PhoneInput
            label="Telefono (opcional)"
            value={phone}
            onChange={onPhoneChange}
          />
        </Modal.Item>

        {/* Email */}
        <Modal.Item>
          <label htmlFor="provider-email" className="label">Email (opcional)</label>
          <input
            id="provider-email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className="input"
            placeholder="email@ejemplo.com"
          />
        </Modal.Item>

        {/* Notes */}
        <Modal.Item>
          <label htmlFor="provider-notes" className="label">Notas (opcional)</label>
          <textarea
            id="provider-notes"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            className="input"
            rows={3}
            placeholder="Notas sobre el proveedor..."
          />
        </Modal.Item>

        {/* Active toggle */}
        <Modal.Item>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">Activo</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Mostrar en la lista de proveedores
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
          {editingProvider && canDelete && (
            <Modal.GoToStepButton step={1} className="btn btn-secondary">
              <Trash2 className="w-5 h-5" />
            </Modal.GoToStepButton>
          )}
          <SaveProviderButton onSubmit={onSubmit} isSaving={isSaving} disabled={isSaving || !isFormValid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Delete confirmation */}
      <Modal.Step title="Eliminar proveedor" backStep={0}>
        <Modal.Item>
          <p className="text-text-secondary">
            Estas seguro que deseas eliminar a <strong>{editingProvider?.name}</strong>? Esta accion no se puede deshacer.
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
            Cancelar
          </Modal.GoToStepButton>
          <ConfirmDeleteButton onDelete={onDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Save success */}
      <Modal.Step title={editingProvider ? 'Proveedor actualizado' : 'Proveedor agregado'} hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {providerSaved && (
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
              style={{ opacity: providerSaved ? 1 : 0 }}
            >
              {editingProvider ? 'Cambios guardados!' : 'Proveedor agregado!'}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: providerSaved ? 1 : 0 }}
            >
              {editingProvider ? 'El proveedor ha sido actualizado' : 'El proveedor ha sido creado correctamente'}
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

      {/* Step 3: Delete success */}
      <Modal.Step title="Proveedor eliminado" hideBackButton>
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {providerDeleted && (
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
              style={{ opacity: providerDeleted ? 1 : 0 }}
            >
              Proveedor eliminado
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
              style={{ opacity: providerDeleted ? 1 : 0 }}
            >
              El proveedor ha sido eliminado correctamente
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
