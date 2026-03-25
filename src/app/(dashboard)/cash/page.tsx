'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'
import { Plus, PackageOpen, Receipt, History } from 'lucide-react'
import {
  BalanceHero,
  CloseDrawerModal,
  OpenDrawerModal,
  MovementsList,
  AddMovementModal,
  EditMovementModal,
} from '@/components/cash'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { useCashSession, useCashMovements } from '@/hooks'
import { formatDateTime } from '@/lib/cash'
import type { CashMovement } from '@/types'

export default function CajaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isReturning, setReturning, setPendingHref } = useNavbar()

  // Header is set optimistically by nav component

  // Use extracted hooks
  const movementsHook = useCashMovements()
  const sessionHook = useCashSession({ movements: movementsHook.movements })

  // Modal states
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false)
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [isEditMovementModalOpen, setIsEditMovementModalOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<CashMovement | null>(null)

  // Animation states
  const [showOpenAnimation, setShowOpenAnimation] = useState(false)

  // Clear returning state after animation
  useEffect(() => {
    if (isReturning) {
      const timer = setTimeout(() => setReturning(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isReturning, setReturning])

  // Initial load
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      sessionHook.setIsLoading(true)
      try {
        const sessionId = await sessionHook.loadCurrentSession()
        if (sessionId && !cancelled) {
          await movementsHook.loadMovements(sessionId)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading data:', err)
          sessionHook.setError('Failed to load data')
        }
      } finally {
        if (!cancelled) {
          sessionHook.setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleOpenDrawer = async (openingBalance: number) => {
    if (!user) return

    await sessionHook.openDrawer(
      openingBalance,
      movementsHook.setMovements,
      setShowOpenAnimation,
      () => setIsOpenDrawerModalOpen(false)
    )
  }

  const handleCloseDrawerSuccess = async () => {
    movementsHook.setMovements([])
    await sessionHook.handleCloseDrawerSuccess()
  }

  const handleRecordMovement = async (
    type: CashMovement['type'],
    category: CashMovement['category'],
    amount: number,
    note: string
  ) => {
    if (!sessionHook.currentSession) return
    await movementsHook.recordMovement(sessionHook.currentSession, type, category, amount, note)
  }

  const handleSaveEdit = async (
    movement: CashMovement,
    type: CashMovement['type'],
    category: CashMovement['category'],
    amount: number,
    note: string
  ) => {
    await movementsHook.updateMovement(movement, type, category, amount, note)
  }

  const handleDeleteMovement = async (movementId: string) => {
    await movementsHook.deleteMovement(movementId)
  }

  const handleOpenEditModal = (mov: CashMovement) => {
    setEditingMovement(mov)
    setIsEditMovementModalOpen(true)
  }

  // Render
  if (sessionHook.isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-4">
        {sessionHook.error && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {sessionHook.error}
          </div>
        )}

        <div className="flex flex-col flex-1" style={{ gap: 'var(--space-4)' }}>
          {/* Balance Hero with status */}
            <BalanceHero
              balance={sessionHook.expectedBalance}
              label={sessionHook.currentSession ? "Expected balance" : ""}
              lastMovementType={movementsHook.lastMovementType}
              status={sessionHook.currentSession ? "Open" : undefined}
              timestamp={sessionHook.currentSession ? formatDateTime(sessionHook.currentSession.openedAt) : undefined}
              isClosed={!sessionHook.currentSession}
              trend={sessionHook.currentSession && movementsHook.movements.length > 0 ? {
                direction: sessionHook.expectedBalance >= sessionHook.currentSession.openingBalance ? 'up' : 'down',
                amount: Math.abs(sessionHook.expectedBalance - sessionHook.currentSession.openingBalance)
              } : undefined}
            />

            {/* Action Buttons - 2x2 grid */}
            <div className="caja-actions">
              {/* Row 1: Open/Close, History */}
              {sessionHook.currentSession ? (
                <button
                  type="button"
                  onClick={() => setIsCloseDrawerModalOpen(true)}
                  className="caja-action-btn"
                >
                  <PackageOpen className="caja-action-btn__icon text-error" />
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOpenDrawerModalOpen(true)}
                  className="caja-action-btn"
                >
                  <Plus className="caja-action-btn__icon text-success" />
                  Open
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(true)}
                className="caja-action-btn"
                disabled={!sessionHook.currentSession}
              >
                <Receipt className="caja-action-btn__icon text-brand" />
                Activity ({movementsHook.movements.length})
              </button>
              {/* Row 2: History */}
              <button
                type="button"
                onClick={() => {
                  setPendingHref('/cash/history')
                  router.push('/cash/history')
                }}
                className="caja-action-btn"
              >
                <History className="caja-action-btn__icon" />
                History
              </button>
            </div>

            {/* Movements Section (only when session is open) */}
            {sessionHook.currentSession && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <MovementsList
                  movements={movementsHook.movements}
                  newMovementId={movementsHook.newMovementId}
                  onMovementClick={handleOpenEditModal}
                  onAnimationComplete={movementsHook.clearNewMovementId}
                />
              </div>
            )}

            {/* Closed state - centered message */}
            {!sessionHook.currentSession && (
              <div className="empty-state-fill">
                <p className="empty-state-description">
                  Cash drawer is closed
                </p>
              </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <OpenDrawerModal
        isOpen={isOpenDrawerModalOpen}
        onClose={() => setIsOpenDrawerModalOpen(false)}
        onSubmit={handleOpenDrawer}
        lastClosedSession={sessionHook.lastClosedSession}
      />

      <CloseDrawerModal
        isOpen={isCloseDrawerModalOpen}
        onClose={() => setIsCloseDrawerModalOpen(false)}
        onSuccess={handleCloseDrawerSuccess}
        currentSession={sessionHook.currentSession}
        movements={movementsHook.movements}
      />

      <AddMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSubmit={handleRecordMovement}
        currentSession={sessionHook.currentSession}
      />

      <EditMovementModal
        isOpen={isEditMovementModalOpen}
        onClose={() => {
          setIsEditMovementModalOpen(false)
          setEditingMovement(null)
        }}
        movement={editingMovement}
        onSave={handleSaveEdit}
        onDelete={handleDeleteMovement}
      />

      {/* Opening animation overlay */}
      {showOpenAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <LottiePlayer
            src="/animations/tap-burst.lottie"
            loop={false}
            autoplay={true}
            style={{ width: 280, height: 280 }}
            onComplete={() => setShowOpenAnimation(false)}
          />
        </div>
      )}
    </>
  )
}
