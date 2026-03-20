'use client'

import { Modal } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface LoansModalProps {
  isOpen: boolean
  onClose: () => void
  outstandingLoans: Map<string, { name: string; amount: number }>
}

export function LoansModal({
  isOpen,
  onClose,
  outstandingLoans,
}: LoansModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prestamos pendientes"
    >
      {outstandingLoans.size > 0 ? (
        <div className="space-y-2">
          {Array.from(outstandingLoans.entries()).map(([id, loan]) => (
            <div key={id} className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
              <span className="text-sm text-text-primary">{loan.name}</span>
              <span className="text-sm font-medium text-warning">
                {formatCurrency(loan.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-tertiary">
          No hay prestamos pendientes
        </div>
      )}
    </Modal>
  )
}
