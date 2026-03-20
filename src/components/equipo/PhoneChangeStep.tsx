'use client'

import { Modal, useMorphingModal, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'

export interface PhoneChangeContentProps {
  memberName: string
  newMemberPhone: string
  setNewMemberPhone: (phone: string) => void
  phoneChangeError: string
}

export function PhoneChangeContent({
  memberName,
  newMemberPhone,
  setNewMemberPhone,
  phoneChangeError,
}: PhoneChangeContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary">
          Ingresa el nuevo numero de telefono para {memberName}.
        </p>
      </Modal.Item>

      {phoneChangeError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {phoneChangeError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        <PhoneInput
          label="Nuevo numero de telefono"
          value={newMemberPhone}
          onChange={setNewMemberPhone}
          autoFocus
        />
      </Modal.Item>

      <Modal.Item>
        <p className="text-xs text-text-tertiary">
          El usuario debera usar este numero para iniciar sesion.
        </p>
      </Modal.Item>
    </>
  )
}

// Footer button for phone change that handles navigation
export interface PhoneChangeSaveButtonProps {
  phoneChangeLoading: boolean
  onSubmit: (e: React.FormEvent) => Promise<boolean>
}

export function PhoneChangeSaveButton({
  phoneChangeLoading,
  onSubmit,
}: PhoneChangeSaveButtonProps) {
  const { goToStep } = useMorphingModal()

  const handleSubmit = async (e: React.FormEvent) => {
    const success = await onSubmit(e)
    if (success) {
      goToStep(0)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      className="btn btn-primary flex-1"
      disabled={phoneChangeLoading}
    >
      {phoneChangeLoading ? <Spinner /> : 'Guardar'}
    </button>
  )
}

// Footer button for cancel/back navigation
export interface PhoneChangeCancelButtonProps {
  disabled: boolean
}

export function PhoneChangeCancelButton({ disabled }: PhoneChangeCancelButtonProps) {
  const { goToStep } = useMorphingModal()

  return (
    <button
      type="button"
      onClick={() => goToStep(0)}
      className="btn btn-secondary flex-1"
      disabled={disabled}
    >
      Cancelar
    </button>
  )
}
