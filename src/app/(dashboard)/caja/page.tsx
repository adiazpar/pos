'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useHeader } from '@/contexts/header-context'
import { Spinner } from '@/components/ui'
import { Plus, PackageOpen, Receipt, Coins, History } from 'lucide-react'
import {
  BalanceHero,
  CloseDrawerModal,
  OpenDrawerModal,
  MovementsList,
  AddMovementModal,
  EditMovementModal,
  LoansModal,
} from '@/components/caja'
import { LottiePlayer } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { useCashSession, useCashMovements } from '@/hooks'
import { formatDateTime } from '@/lib/cash'
import type { CashMovement } from '@/types'

export default function CajaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { isReturning, setReturning } = useNavbar()

  useHeader({
    title: 'Caja',
    subtitle: 'Control de efectivo',
    isReturning,
  })

  // Use extracted hooks
  const movementsHook = useCashMovements()
  const sessionHook = useCashSession({ movements: movementsHook.movements })

  // Modal states
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false)
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [isLoansModalOpen, setIsLoansModalOpen] = useState(false)
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
        if (!cancelled) {
          await sessionHook.loadSessions()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading data:', err)
          sessionHook.setError('Error al cargar los datos')
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

        <div className="flex flex-col flex-1 gap-6">
          {/* Balance Hero with status */}
            <BalanceHero
              balance={sessionHook.expectedBalance}
              label={sessionHook.currentSession ? "Saldo esperado" : ""}
              lastMovementType={movementsHook.lastMovementType}
              status={sessionHook.currentSession ? "Abierta" : undefined}
              timestamp={sessionHook.currentSession ? formatDateTime(sessionHook.currentSession.openedAt) : undefined}
              isClosed={!sessionHook.currentSession}
              trend={sessionHook.currentSession && movementsHook.movements.length > 0 ? {
                direction: sessionHook.expectedBalance >= sessionHook.currentSession.openingBalance ? 'up' : 'down',
                amount: Math.abs(sessionHook.expectedBalance - sessionHook.currentSession.openingBalance)
              } : undefined}
            />

            {/* Action Buttons - 2x2 grid */}
            <div className="caja-actions">
              {/* Row 1: Abrir/Cerrar, Historial */}
              {sessionHook.currentSession ? (
                <button
                  type="button"
                  onClick={() => setIsCloseDrawerModalOpen(true)}
                  className="caja-action-btn"
                >
                  <PackageOpen className="caja-action-btn__icon text-error" />
                  Cerrar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsOpenDrawerModalOpen(true)}
                  className="caja-action-btn"
                >
                  <Plus className="caja-action-btn__icon text-success" />
                  Abrir
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/caja/historial')}
                className="caja-action-btn"
              >
                <History className="caja-action-btn__icon" />
                Historial
              </button>
              {/* Row 2: Movimientos, Prestamos */}
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(true)}
                className="caja-action-btn"
                disabled={!sessionHook.currentSession}
              >
                <Receipt className="caja-action-btn__icon text-brand" />
                Movimientos ({movementsHook.movements.length})
              </button>
              <button
                type="button"
                onClick={() => setIsLoansModalOpen(true)}
                className="caja-action-btn"
                disabled={!sessionHook.currentSession}
              >
                <Coins className="caja-action-btn__icon text-warning" />
                Prestamos ({sessionHook.outstandingLoans.size})
              </button>
            </div>

            {/* Movements Section (only when session is open) */}
            {sessionHook.currentSession && (
              <MovementsList
                movements={movementsHook.movements}
                newMovementId={movementsHook.newMovementId}
                onMovementClick={handleOpenEditModal}
                onAnimationComplete={movementsHook.clearNewMovementId}
              />
            )}

            {/* Closed state - centered message */}
            {!sessionHook.currentSession && (
              <div className="empty-state-fill">
                <p className="empty-state-description">
                  La caja esta cerrada
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

      <LoansModal
        isOpen={isLoansModalOpen}
        onClose={() => setIsLoansModalOpen(false)}
        outstandingLoans={sessionHook.outstandingLoans}
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
