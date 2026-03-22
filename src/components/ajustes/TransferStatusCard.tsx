'use client'

import { Clock, Copy } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { formatPhoneForDisplay } from '@/lib/countries'
import type { PendingTransfer, IncomingTransfer } from '@/hooks'
import { formatTimeRemaining } from '@/hooks'

// ============================================
// PENDING TRANSFER CARD (Owner)
// ============================================

export interface PendingTransferCardProps {
  transfer: PendingTransfer
  transferLoading: boolean
  onShowLink: () => void
  onConfirm: () => void
  onCancel: () => void
}

export function PendingTransferCard({
  transfer,
  transferLoading,
  onShowLink,
  onConfirm,
  onCancel,
}: PendingTransferCardProps) {
  const isAccepted = transfer.status === 'accepted'

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`p-4 rounded-lg border ${isAccepted ? 'border-success bg-success-subtle' : 'border-warning bg-warning-subtle'}`}>
        <div className="flex items-start justify-between mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isAccepted ? 'bg-success text-white' : 'bg-warning text-white'}`}>
            {isAccepted ? 'Aceptada' : 'Pendiente'}
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-1">
          Transferencia a:
        </p>
        <p className="font-medium text-text-primary">
          {transfer.toUser?.name || formatPhoneForDisplay(transfer.toPhone)}
        </p>

        <p className="text-xs text-text-tertiary mt-2">
          Codigo: <span className="font-mono">{transfer.code}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isAccepted ? (
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary flex-1"
            disabled={transferLoading}
          >
            {transferLoading ? <Spinner /> : 'Confirmar transferencia'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onShowLink}
            className="btn btn-secondary flex-1"
          >
            <Copy size={16} />
            <span>Copiar enlace</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-error hover:underline"
        disabled={transferLoading}
      >
        Cancelar transferencia
      </button>
    </div>
  )
}

// ============================================
// INCOMING TRANSFER CARD (Non-owner)
// ============================================

export interface IncomingTransferCardProps {
  transfer: IncomingTransfer
  acceptingTransfer: boolean
  onAccept: () => void
}

export function IncomingTransferCard({
  transfer,
  acceptingTransfer,
  onAccept,
}: IncomingTransferCardProps) {
  const isAccepted = transfer.status === 'accepted'

  if (isAccepted) {
    return (
      <div className="p-4 rounded-lg border border-warning bg-warning-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-warning text-white">
            Esperando confirmacion
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          De: <span className="font-medium text-text-primary">{transfer.fromUser?.name || 'Propietario'}</span>
        </p>

        <p className="text-sm text-text-secondary">
          Ya aceptaste la transferencia. Esperando a que <strong>{transfer.fromUser?.name || 'el propietario'}</strong> confirme para completar el proceso.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-brand bg-brand-subtle">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand text-white">
            Nueva
          </span>
          <div className="flex items-center text-xs text-text-tertiary">
            <Clock size={14} className="mr-1" />
            {formatTimeRemaining(transfer.expiresAt)}
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-3">
          De: <span className="font-medium text-text-primary">{transfer.fromUser?.name || 'Propietario'}</span>
        </p>

        <p className="text-sm text-text-secondary">
          El propietario quiere transferirte la propiedad del negocio. Al aceptar, te convertiras en el nuevo propietario cuando el actual confirme la transferencia.
        </p>
      </div>

      <button
        type="button"
        onClick={onAccept}
        className="btn btn-primary w-full"
        disabled={acceptingTransfer}
      >
        {acceptingTransfer ? <Spinner /> : 'Aceptar transferencia'}
      </button>
    </div>
  )
}
