'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/utils'
import type { CashSession, CashMovement } from '@/types'

interface CloseDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentSession: CashSession | null
  movements: CashMovement[]
}

export function CloseDrawerModal({
  isOpen,
  onClose,
  onSuccess,
  currentSession,
  movements,
}: CloseDrawerModalProps) {
  const { user, pb } = useAuth()

  // Form state
  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Celebration state
  const [showLottie, setShowLottie] = useState(false)
  const [celebrationStats, setCelebrationStats] = useState<{ label: string; value: string }[]>([])

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setClosingBalance('')
      setDiscrepancyNote('')
      setShowLottie(false)
      setCelebrationStats([])
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Calculate expected balance
  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0
    const ingresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
    const retiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)
    return currentSession.openingBalance + ingresos - retiros
  }, [currentSession, movements])

  // Calculate discrepancy
  const closingDiscrepancy = useMemo(() => {
    const actual = parseFloat(closingBalance)
    if (isNaN(actual)) return 0
    return actual - expectedBalance
  }, [closingBalance, expectedBalance])

  const handleClose = useCallback(() => {
    // If we're on celebration step, call success before closing
    // This is handled by checking the celebration stats
    if (celebrationStats.length > 0) {
      onSuccess()
    }
    onClose()
  }, [celebrationStats.length, onClose, onSuccess])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
    >
      <Modal.Step title="Cerrar caja">
        <CloseDrawerForm
          expectedBalance={expectedBalance}
          closingBalance={closingBalance}
          setClosingBalance={setClosingBalance}
          closingDiscrepancy={closingDiscrepancy}
          discrepancyNote={discrepancyNote}
          setDiscrepancyNote={setDiscrepancyNote}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          currentSession={currentSession}
          movements={movements}
          user={user}
          pb={pb}
          setShowLottie={setShowLottie}
          setCelebrationStats={setCelebrationStats}
          onClose={handleClose}
        />
      </Modal.Step>

      <Modal.Step title="Caja cerrada" hideBackButton>
        <CelebrationContent
          showLottie={showLottie}
          celebrationStats={celebrationStats}
          onClose={handleClose}
        />
      </Modal.Step>
    </Modal>
  )
}

// Form step content - extracted to use hook
interface CloseDrawerFormProps {
  expectedBalance: number
  closingBalance: string
  setClosingBalance: (value: string) => void
  closingDiscrepancy: number
  discrepancyNote: string
  setDiscrepancyNote: (value: string) => void
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  currentSession: CashSession | null
  movements: CashMovement[]
  user: any
  pb: any
  setShowLottie: (value: boolean) => void
  setCelebrationStats: (stats: { label: string; value: string }[]) => void
  onClose: () => void
}

function CloseDrawerForm({
  expectedBalance,
  closingBalance,
  setClosingBalance,
  closingDiscrepancy,
  discrepancyNote,
  setDiscrepancyNote,
  isSubmitting,
  setIsSubmitting,
  currentSession,
  movements,
  user,
  pb,
  setShowLottie,
  setCelebrationStats,
  onClose,
}: CloseDrawerFormProps) {
  const { goNext, lock, unlock } = useMorphingModal()

  const handleSubmit = async () => {
    if (!user || !currentSession) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) return

    setIsSubmitting(true)
    lock() // Prevent close during submission

    try {
      const now = new Date().toISOString()

      // Calculate stats for celebration
      const totalIngresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
      const totalRetiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)

      // Update session with closing info
      await pb.collection('cash_sessions').update(currentSession.id, {
        closedAt: now,
        closedBy: user.id,
        closingBalance: actualBalance,
        expectedBalance: expectedBalance,
        discrepancy: closingDiscrepancy,
        discrepancyNote: discrepancyNote.trim() || null,
      })

      // Set up celebration stats
      setCelebrationStats([
        { label: 'Movimientos', value: String(movements.length) },
        { label: 'Ingresos', value: formatCurrency(totalIngresos) },
        { label: 'Retiros', value: formatCurrency(totalRetiros) },
      ])

      // Start showing Lottie
      setShowLottie(true)

      // Navigate to celebration step - Modal handles the transition
      unlock()
      goNext()
    } catch (err) {
      console.error('Error closing drawer:', err)
      alert('Error al cerrar la caja')
      setIsSubmitting(false)
      unlock()
    }
  }

  return (
    <>
      <Modal.Item>
        <div className="p-3 rounded-lg bg-bg-muted">
          <div className="text-sm text-text-secondary">Saldo esperado</div>
          <div className="text-xl font-display font-bold text-text-primary mt-1">
            {formatCurrency(expectedBalance)}
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        <label htmlFor="closing-balance" className="label">Saldo real (S/) <span className="text-error">*</span></label>
        <input
          id="closing-balance"
          type="number"
          inputMode="decimal"
          value={closingBalance}
          onChange={(e) => setClosingBalance(e.target.value)}
          className="input"
          placeholder="0.00"
          min="0"
          step="0.01"
          autoFocus
          disabled={isSubmitting}
        />
      </Modal.Item>

      {closingBalance && (
        <Modal.Item>
          <div
            className={`p-3 rounded-lg ${
              closingDiscrepancy === 0
                ? 'bg-success-subtle'
                : closingDiscrepancy > 0
                  ? 'bg-warning-subtle'
                  : 'bg-error-subtle'
            }`}
          >
            <div className="text-sm text-text-secondary">Diferencia</div>
            <div
              className={`text-xl font-display font-bold mt-1 ${
                closingDiscrepancy === 0
                  ? 'text-success'
                  : closingDiscrepancy > 0
                    ? 'text-warning'
                    : 'text-error'
              }`}
            >
              {closingDiscrepancy > 0 ? '+' : ''}{formatCurrency(closingDiscrepancy)}
            </div>
          </div>
        </Modal.Item>
      )}

      {closingBalance && closingDiscrepancy !== 0 && (
        <Modal.Item>
          <label htmlFor="discrepancy-note" className="label">Nota (opcional)</label>
          <textarea
            id="discrepancy-note"
            value={discrepancyNote}
            onChange={(e) => setDiscrepancyNote(e.target.value)}
            className="input"
            placeholder="Explica la diferencia..."
            rows={2}
            disabled={isSubmitting}
          />
        </Modal.Item>
      )}

      <Modal.Footer>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary flex-1"
          disabled={isSubmitting || !closingBalance || parseFloat(closingBalance) < 0}
        >
          {isSubmitting ? <Spinner /> : 'Cerrar'}
        </button>
      </Modal.Footer>
    </>
  )
}

// Celebration step content
interface CelebrationContentProps {
  showLottie: boolean
  celebrationStats: { label: string; value: string }[]
  onClose: () => void
}

function CelebrationContent({
  showLottie,
  celebrationStats,
  onClose,
}: CelebrationContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="flex flex-col items-center text-center">
          {/* Lottie container */}
          <div className="mb-6" style={{ width: 200, height: 200 }}>
            {showLottie && (
              <LottiePlayer
                src="/animations/trophy.json"
                loop={false}
                autoplay={true}
                delay={500}
                style={{ width: 200, height: 200 }}
              />
            )}
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        <div className="w-full p-4 bg-bg-muted rounded-lg">
          <p className="text-text-secondary text-center mb-4">
            Buen trabajo hoy!
          </p>
          {celebrationStats.length > 0 && (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(celebrationStats.length, 3)}, 1fr)` }}
            >
              {celebrationStats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xl font-bold font-display text-text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal.Item>

      <Modal.Footer>
        <button
          className="btn btn-primary flex-1"
          onClick={onClose}
        >
          Continuar
        </button>
      </Modal.Footer>
    </>
  )
}
