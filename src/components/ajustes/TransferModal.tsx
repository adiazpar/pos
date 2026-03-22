'use client'

import { Copy, Check } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { PhoneInput } from '@/components/auth/phone-input'
import { PinPad } from '@/components/auth/pin-pad'
import type { PendingTransfer } from '@/hooks'

// ============================================
// STEP 0: Initiate Transfer
// ============================================

export interface TransferInitiateContentProps {
  transferPhone: string
  setTransferPhone: (phone: string) => void
  transferError: string
}

export function TransferInitiateContent({
  transferPhone,
  setTransferPhone,
  transferError,
}: TransferInitiateContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-warning-subtle rounded-lg">
          <p className="text-sm text-warning font-medium mb-1">Importante</p>
          <p className="text-xs text-text-secondary">
            Al confirmar la transferencia, perderas el rol de propietario y te convertiras en socio.
            Esta accion es irreversible.
          </p>
        </div>
      </Modal.Item>

      {transferError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {transferError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        <PhoneInput
          label="Numero del nuevo propietario"
          value={transferPhone}
          onChange={setTransferPhone}
          autoFocus
        />
        <p className="text-xs text-text-tertiary mt-2">
          Se generara un enlace que debes compartir con esta persona.
        </p>
      </Modal.Item>
    </>
  )
}

export interface TransferInitiateButtonProps {
  transferLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export function TransferInitiateButton({
  transferLoading,
  onSubmit,
}: TransferInitiateButtonProps) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      className="btn btn-primary flex-1"
      disabled={transferLoading}
    >
      {transferLoading ? <Spinner /> : 'Generar enlace'}
    </button>
  )
}

// ============================================
// STEP 1: Transfer Link Generated
// ============================================

export interface TransferLinkContentProps {
  transferLink: string
  linkCopied: boolean
  onCopy: () => void
}

export function TransferLinkContent({
  transferLink,
  linkCopied,
  onCopy,
}: TransferLinkContentProps) {
  return (
    <>
      <Modal.Item>
        <p className="text-sm text-text-secondary mb-4">
          Comparte este enlace con el nuevo propietario para que acepte la transferencia.
        </p>

        <button
          type="button"
          onClick={onCopy}
          className="w-full p-4 bg-bg-muted rounded-lg border border-border flex items-center justify-between hover:border-brand transition-colors"
        >
          <span className="text-sm font-mono truncate pr-2">{transferLink}</span>
          {linkCopied ? (
            <Check className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <Copy className="w-5 h-5 text-text-secondary flex-shrink-0" />
          )}
        </button>

        <p className="text-xs text-text-tertiary mt-3">
          El enlace es valido por 24 horas.
        </p>
      </Modal.Item>
    </>
  )
}

export function TransferLinkDoneButton() {
  const { close } = useMorphingModal()

  return (
    <button
      type="button"
      onClick={close}
      className="btn btn-primary flex-1"
    >
      Listo
    </button>
  )
}

// ============================================
// STEP 2: Confirm Transfer with PIN
// ============================================

export interface TransferConfirmContentProps {
  pendingTransfer: PendingTransfer | null
  transferError: string
  transferLoading: boolean
  onConfirm: (pin: string) => void
}

export function TransferConfirmContent({
  pendingTransfer,
  transferError,
  transferLoading,
  onConfirm,
}: TransferConfirmContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="p-3 bg-error-subtle rounded-lg">
          <p className="text-sm text-error font-medium mb-1">Accion irreversible</p>
          <p className="text-xs text-text-secondary">
            Al confirmar, {pendingTransfer?.toUser?.name || 'el destinatario'} se convertira en el nuevo propietario
            y tu cuenta pasara a ser socio.
          </p>
        </div>
      </Modal.Item>

      {transferError && (
        <Modal.Item>
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {transferError}
          </div>
        </Modal.Item>
      )}

      <Modal.Item>
        {transferLoading ? (
          <div className="flex flex-col items-center py-8">
            <Spinner className="spinner-lg" />
            <p className="text-text-secondary mt-4">Procesando...</p>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-text-secondary mb-4">
              Ingresa tu PIN para confirmar
            </p>
            <PinPad
              onComplete={onConfirm}
              disabled={transferLoading}
            />
          </>
        )}
      </Modal.Item>
    </>
  )
}
