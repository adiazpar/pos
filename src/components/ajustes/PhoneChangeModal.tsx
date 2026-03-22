'use client'

import { Modal } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { FirebasePhoneVerify } from '@/components/auth/firebase-phone-verify'

// ============================================
// STEP 0: Enter New Phone
// ============================================

export interface PhoneChangeInputContentProps {
  newPhone: string
  setNewPhone: (phone: string) => void
  phoneChangeError: string
}

export function PhoneChangeInputContent({
  newPhone,
  setNewPhone,
  phoneChangeError,
}: PhoneChangeInputContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-warning-subtle rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">Atencion</p>
          <p className="text-xs text-text-secondary">
            Se enviara un codigo de verificacion via SMS al nuevo numero.
            Asegurate de tener acceso a ese telefono.
          </p>
        </div>
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
          value={newPhone}
          onChange={setNewPhone}
          autoFocus
        />
      </Modal.Item>
    </>
  )
}

export interface PhoneChangeContinueButtonProps {
  phoneChangeLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function PhoneChangeContinueButton({
  phoneChangeLoading,
  onSubmit,
}: PhoneChangeContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="btn btn-primary flex-1"
      disabled={phoneChangeLoading}
    >
      Continuar
    </button>
  )
}

// ============================================
// STEP 1: Verify Phone
// ============================================

export interface PhoneVerifyContentProps {
  newPhone: string
  phoneChangeError: string
  onVerified: (idToken: string) => void
  onBack: () => void
}

export function PhoneVerifyContent({
  newPhone,
  phoneChangeError,
  onVerified,
  onBack,
}: PhoneVerifyContentProps) {
  return (
    <>
      {phoneChangeError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {phoneChangeError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        <FirebasePhoneVerify
          phoneNumber={newPhone}
          onVerified={onVerified}
          onBack={onBack}
        />
      </Modal.Item>
    </>
  )
}
