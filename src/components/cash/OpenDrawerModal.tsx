'use client'

import { useState, useCallback } from 'react'
import { Modal, Spinner } from '@/components/ui'
import { useFormModal } from '@/hooks'
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

  const resetForm = useCallback(() => {
    setOpeningBalance('')
  }, [])

  const { isSaving: isOpening, setIsSaving: setIsOpening, handleClose } = useFormModal({
    onClose,
    onReset: resetForm,
  })

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
      title="Open drawer"
    >
      <div className="space-y-4">
        {lastClosedSession && lastClosedSession.closedAt && lastClosedSession.closingBalance != null && (
          <div className="p-3 rounded-lg bg-bg-muted">
            <div className="text-sm text-text-secondary">
              Previous session closed with
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
          <label htmlFor="opening-balance" className="label">Opening balance ($) <span className="text-error">*</span></label>
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
          Enter the amount of cash you are starting with
        </p>
      </div>
      <Modal.Footer>
        <button
          type="button"
          onClick={handleClose}
          className="btn btn-secondary flex-1"
          disabled={isOpening}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary flex-1"
          disabled={isOpening || openingBalance === '' || parseFloat(openingBalance) < 0}
        >
          {isOpening ? <Spinner /> : 'Open'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
