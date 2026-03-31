'use client'

import { Trash2 } from 'lucide-react'
import { Spinner, Modal, useMorphingModal, ConfirmationAnimation, DeleteConfirmationStep } from '@/components/ui'
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

  const handleClick = () => {
    goToStep(2)
    onSubmit()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={disabled}
    >
      {isSaving ? <Spinner /> : 'Save'}
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
      title={editingProvider ? 'Edit provider' : 'Add provider'}
    >
      {/* Step 0: Form */}
      <Modal.Step title={editingProvider ? 'Edit provider' : 'Add provider'}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        {/* Name */}
        <Modal.Item>
          <label htmlFor="provider-name" className="label">Name <span className="text-error">*</span></label>
          <input
            id="provider-name"
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input"
            placeholder="Provider name"
            autoComplete="off"
          />
        </Modal.Item>

        {/* Phone */}
        <Modal.Item>
          <label htmlFor="provider-phone" className="label">Phone (optional)</label>
          <input
            id="provider-phone"
            type="tel"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
            className="input"
            placeholder="999 999 999"
          />
        </Modal.Item>

        {/* Email */}
        <Modal.Item>
          <label htmlFor="provider-email" className="label">Email (optional)</label>
          <input
            id="provider-email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className="input"
            placeholder="email@example.com"
          />
        </Modal.Item>

        {/* Notes */}
        <Modal.Item>
          <label htmlFor="provider-notes" className="label">Notes (optional)</label>
          <textarea
            id="provider-notes"
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            className="input"
            rows={3}
            placeholder="Notes about the provider..."
          />
        </Modal.Item>

        {/* Active toggle */}
        <Modal.Item>
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="label mb-0">Active</span>
              <p className="text-xs text-text-tertiary mt-0.5">
                Show in the provider list
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
      <DeleteConfirmationStep
        title="Delete provider"
        itemName={editingProvider?.name || ''}
        cancelStep={0}
        onConfirm={onDelete}
        successStep={3}
        isDeleting={isDeleting}
      />

      {/* Step 2: Save success */}
      <Modal.Step title={editingProvider ? 'Provider updated' : 'Provider added'} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            triggered={providerSaved}
            title={editingProvider ? 'Changes saved!' : 'Provider added!'}
            subtitle={editingProvider ? 'The provider has been updated' : 'The provider has been created successfully'}
          />
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

      {/* Step 3: Delete success */}
      <Modal.Step title="Provider deleted" hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="error"
            triggered={providerDeleted}
            title="Provider deleted"
            subtitle="The provider has been deleted successfully"
          />
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
