'use client'

import { ArrowDownCircle, ArrowUpCircle, ArrowUp, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { scrollToTop } from '@/lib/scroll'
import { CATEGORY_LABELS, sortMovementsByDate, formatMovementTime } from '@/lib/cash'
import type { CashMovement } from '@/types'

interface MovementsListProps {
  movements: CashMovement[]
  onMovementClick: (movement: CashMovement) => void
}

export function MovementsList({
  movements,
  onMovementClick,
}: MovementsListProps) {
  const sortedMovements = sortMovementsByDate(movements)

  if (movements.length === 0) {
    return (
      <div className="empty-state-fill">
        <p className="empty-state-description">
          No movements recorded yet
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Movements Card */}
      <div className="card p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {movements.length} {movements.length === 1 ? 'movement' : 'movements'}
          </span>
        </div>

        <hr className="border-border" />

        {/* Movements List */}
        <div className="space-y-2">
          {sortedMovements.map((mov) => (
            <div
              key={mov.id}
              className="list-item-clickable list-item-flat"
              onClick={() => onMovementClick(mov)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onMovementClick(mov)
                }
              }}
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  mov.type === 'deposit'
                    ? 'bg-success-subtle text-success'
                    : 'bg-error-subtle text-error'
                }`}
              >
                {mov.type === 'deposit' ? (
                  <ArrowDownCircle className="w-5 h-5" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">
                  {CATEGORY_LABELS[mov.category]}
                </span>
                <span className="text-xs text-text-tertiary truncate block">
                  {mov.note || '-'}
                </span>
              </div>

              {/* Amount and Time */}
              <div className="text-right">
                <span
                  className={`font-medium block ${
                    mov.type === 'deposit' ? 'text-success' : 'text-error'
                  }`}
                >
                  {mov.type === 'deposit' ? '+' : '-'}{formatCurrency(mov.amount)}
                </span>
                <span className="text-xs text-text-tertiary block">
                  {formatMovementTime(mov.createdAt)}
                </span>
              </div>

              {/* Chevron */}
              <div className="text-text-tertiary ml-2">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Back to top button */}
      {movements.length > 5 && (
        <button
          type="button"
          onClick={scrollToTop}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
          Back to top
        </button>
      )}
    </>
  )
}
