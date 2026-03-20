'use client'

import { ArrowDownCircle, ArrowUpCircle, ArrowUp } from 'lucide-react'
import { LottiePlayer } from '@/components/animations'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS, sortMovementsByDate, formatMovementTime } from '@/lib/cash'
import type { CashMovement } from '@/types'

interface MovementsListProps {
  movements: CashMovement[]
  newMovementId: string | null
  onMovementClick: (movement: CashMovement) => void
  onAnimationComplete: () => void
}

export function MovementsList({
  movements,
  newMovementId,
  onMovementClick,
  onAnimationComplete,
}: MovementsListProps) {
  const sortedMovements = sortMovementsByDate(movements)

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.with-sidebar')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (movements.length === 0) {
    return (
      <div className="empty-state-fill">
        <p className="empty-state-description">
          Aun no hay movimientos registrados
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Movements Header */}
      <div className="flex items-center">
        <span className="text-sm text-text-secondary">
          {movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
      </div>

      {/* Movements List */}
      <div className="space-y-2">
        {sortedMovements.map((mov) => (
          <div
            key={mov.id}
            className="movement-item cursor-pointer"
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
            {mov.id === newMovementId ? (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                <LottiePlayer
                  src="/animations/success.lottie"
                  loop={false}
                  autoplay={true}
                  style={{ width: 56, height: 56 }}
                  onComplete={onAnimationComplete}
                />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  mov.type === 'ingreso'
                    ? 'bg-success-subtle text-success'
                    : 'bg-error-subtle text-error'
                }`}
              >
                {mov.type === 'ingreso' ? (
                  <ArrowDownCircle className="w-5 h-5" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 h-10 flex flex-col justify-between">
              <span className="font-medium truncate">
                {CATEGORY_LABELS[mov.category]}
              </span>
              <span className="text-xs text-text-tertiary truncate">
                {(mov.category === 'prestamo_empleado' || mov.category === 'devolucion_prestamo') && mov.expand?.employee
                  ? mov.expand.employee.name
                  : mov.note || '-'}
              </span>
            </div>
            <div className="text-right h-10 flex flex-col justify-between flex-shrink-0">
              <span
                className={`font-medium ${
                  mov.type === 'ingreso' ? 'text-success' : 'text-error'
                }`}
              >
                {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
              </span>
              <span className="text-xs text-text-tertiary">
                {formatMovementTime(mov.created)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Back to top button */}
      {movements.length > 5 && (
        <button
          type="button"
          onClick={scrollToTop}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
          Volver arriba
        </button>
      )}
    </>
  )
}
