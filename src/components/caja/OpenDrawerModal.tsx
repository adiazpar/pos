'use client'

import { useState } from 'react'
import { Modal, Spinner } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CashSession } from '@/types'

interface OpenDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (openingBalance: number) => Promise<void>
  lastClosedSession: CashSession | null
}

export function OpenDrawerModal({
  isOpen,
  onClose,
  onSubmit,
  lastClosedSession,
}: OpenDrawerModalProps) {
  const [openingBalance, setOpeningBalance] = useState('')
  const [isOpening, setIsOpening] = useState(false)

  const handleClose = () => {
    if (!isOpening) {
      setOpeningBalance('')
      onClose()
    }
  }

  const handleSubmit = async () => {
    const balance = parseFloat(openingBalance)
    if (isNaN(balance) || balance < 0) return

    setIsOpening(true)
    try {
      await onSubmit(balance)
      setOpeningBalance('')
    } catch {
      // Error handled by parent
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Abrir caja"
    >
      <div className="space-y-4">
        {lastClosedSession && lastClosedSession.closedAt && lastClosedSession.closingBalance !== undefined && (
          <div className="p-3 rounded-lg bg-bg-muted">
            <div className="text-sm text-text-secondary">
              La sesion anterior cerro con
            </div>
            <div className="text-lg font-display font-bold text-text-primary mt-0.5">
              {formatCurrency(lastClosedSession.closingBalance)}
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              {formatDate(lastClosedSession.closedAt)}
            </div>
          </div>
        )}
        <div>
          <label htmlFor="opening-balance" className="label">Saldo inicial (S/) <span className="text-error">*</span></label>
          <input
            id="opening-balance"
            type="number"
            inputMode="decimal"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
            autoFocus
          />
        </div>
        <p className="text-sm text-text-tertiary">
          Ingresa la cantidad de efectivo con la que inicias la caja
        </p>
      </div>
      <Modal.Footer>
        <button
          type="button"
          onClick={handleClose}
          className="btn btn-secondary flex-1"
          disabled={isOpening}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary flex-1"
          disabled={isOpening || openingBalance === '' || parseFloat(openingBalance) < 0}
        >
          {isOpening ? <Spinner /> : 'Abrir'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
