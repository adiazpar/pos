'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { IconClose, IconAdd, IconIngreso, IconRetiro, IconCheck, IconClock, IconChevronRight } from '@/components/icons'
import { BalanceHero } from '@/components/caja/BalanceHero'
import { EmptyStateAnimation, CelebrationOverlay, SuccessOverlay } from '@/components/animations'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CashSession, CashMovement, CashMovementType, CashMovementCategory } from '@/types'

// ============================================
// CONSTANTS
// ============================================

type PageTab = 'caja' | 'historial'

const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  venta: 'Venta',
  prestamo_empleado: 'Prestamo empleado',
  retiro_banco: 'Retiro de banco',
  cambio: 'Sencillo/Cambio',
  devolucion_prestamo: 'Devolucion prestamo',
  deposito_banco: 'Deposito a banco',
  gastos: 'Gastos operativos',
  devolucion_cliente: 'Devolucion cliente',
  cambio_billetes: 'Cambio de billetes',
  otro: 'Otro',
}

const INGRESO_CATEGORIES: CashMovementCategory[] = [
  'prestamo_empleado',
  'retiro_banco',
  'cambio',
  'otro'
]

const EGRESO_CATEGORIES: CashMovementCategory[] = [
  'devolucion_prestamo',
  'deposito_banco',
  'gastos',
  'devolucion_cliente',
  'cambio_billetes',
  'otro'
]

// ============================================
// MODAL COMPONENT
// ============================================

function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop modal-backdrop-animated" onClick={onClose}>
      <div className="modal modal-animated" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CajaPage() {
  const { user, pb } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>('caja')

  // Session state
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false)
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [isSessionDetailModalOpen, setIsSessionDetailModalOpen] = useState(false)
  const [viewingSession, setViewingSession] = useState<CashSession | null>(null)
  const [viewingSessionMovements, setViewingSessionMovements] = useState<CashMovement[]>([])

  // Form states
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [movementType, setMovementType] = useState<CashMovementType>('ingreso')
  const [movementCategory, setMovementCategory] = useState<CashMovementCategory | ''>('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementNote, setMovementNote] = useState('')

  // Loading states
  const [isOpening, setIsOpening] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSavingMovement, setIsSavingMovement] = useState(false)
  const [isLoadingSessionDetail, setIsLoadingSessionDetail] = useState(false)

  // Animation states
  const [lastMovementType, setLastMovementType] = useState<'ingreso' | 'retiro' | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationStats, setCelebrationStats] = useState<{ label: string; value: string }[]>([])
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [successOverlayData, setSuccessOverlayData] = useState<{
    type: 'ingreso' | 'retiro'
    amount: number
  } | null>(null)

  // ============================================
  // CALCULATED VALUES
  // ============================================

  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0

    let balance = currentSession.openingBalance

    for (const mov of movements) {
      if (mov.type === 'ingreso') {
        balance += mov.amount
      } else {
        balance -= mov.amount
      }
    }

    return balance
  }, [currentSession, movements])

  const outstandingLoans = useMemo(() => {
    const loans = new Map<string, { name: string; amount: number }>()

    for (const mov of movements) {
      if (mov.category === 'prestamo_empleado' && mov.employee) {
        const employeeName = mov.expand?.employee?.name || 'Empleado'
        const current = loans.get(mov.employee) || { name: employeeName, amount: 0 }
        // Update name if we have expanded data (in case earlier entries didn't)
        if (mov.expand?.employee?.name) {
          current.name = mov.expand.employee.name
        }
        current.amount += mov.amount
        loans.set(mov.employee, current)
      } else if (mov.category === 'devolucion_prestamo' && mov.employee) {
        const employeeName = mov.expand?.employee?.name || 'Empleado'
        const current = loans.get(mov.employee) || { name: employeeName, amount: 0 }
        // Update name if we have expanded data
        if (mov.expand?.employee?.name) {
          current.name = mov.expand.employee.name
        }
        current.amount -= mov.amount
        loans.set(mov.employee, current)
      }
    }

    // Filter out zero balances
    for (const [key, value] of loans) {
      if (value.amount <= 0) {
        loans.delete(key)
      }
    }

    return loans
  }, [movements])

  const closingDiscrepancy = useMemo(() => {
    const actualBalance = parseFloat(closingBalance) || 0
    return actualBalance - expectedBalance
  }, [closingBalance, expectedBalance])

  // Get the most recent closed session (for reference when opening new drawer)
  const lastClosedSession = useMemo(() => {
    return sessions.find(s => s.closedAt != null) || null
  }, [sessions])

  // ============================================
  // DATA LOADING
  // ============================================

  const loadCurrentSession = useCallback(async () => {
    try {
      // Find open session (closedAt is null)
      const openSessions = await pb.collection('cash_sessions').getList<CashSession>(1, 1, {
        filter: 'closedAt = null',
        sort: '-openedAt',
        expand: 'openedBy',
        requestKey: null,
      })

      if (openSessions.items.length > 0) {
        setCurrentSession(openSessions.items[0])
        return openSessions.items[0].id
      } else {
        setCurrentSession(null)
        return null
      }
    } catch (err) {
      console.error('Error loading current session:', err)
      return null
    }
  }, [pb])

  const loadMovements = useCallback(async (sessionId: string) => {
    try {
      // Use simple getList with client-side filtering (workaround for SDK issue)
      const result = await pb.collection('cash_movements').getList<CashMovement>(1, 50, {
        expand: 'employee',
      })
      const movs = result.items.filter(m => m.session === sessionId)
      setMovements(movs)
    } catch (err: unknown) {
      console.error('Error loading movements:', err)
    }
  }, [pb])

  const loadSessions = useCallback(async () => {
    try {
      const sess = await pb.collection('cash_sessions').getFullList<CashSession>({
        sort: '-openedAt',
        expand: 'openedBy,closedBy',
        requestKey: null,
      })
      setSessions(sess)
    } catch (err) {
      console.error('Error loading sessions:', err)
    }
  }, [pb])

  // Initial load
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      try {
        const sessionId = await loadCurrentSession()
        if (sessionId && !cancelled) {
          await loadMovements(sessionId)
        }
        if (!cancelled) {
          await loadSessions()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading data:', err)
          setError('Error al cargar los datos')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [loadCurrentSession, loadMovements, loadSessions])

  // ============================================
  // ACTIONS
  // ============================================

  const handleOpenDrawer = async () => {
    if (!user) return

    const balance = parseFloat(openingBalance)
    if (isNaN(balance) || balance < 0) {
      return
    }

    setIsOpening(true)
    try {
      const now = new Date().toISOString()

      // Create session (opening balance is stored in the session, not as a movement)
      const session = await pb.collection('cash_sessions').create<CashSession>({
        openedAt: now,
        openedBy: user.id,
        openingBalance: balance,
      })

      // Refresh data
      setCurrentSession(session)
      setMovements([]) // New session starts with no movements
      await loadSessions()

      // Close modal and reset form
      setIsOpenDrawerModalOpen(false)
      setOpeningBalance('')
    } catch (err) {
      console.error('Error opening drawer:', err)
      setError('Error al abrir la caja')
    } finally {
      setIsOpening(false)
    }
  }

  const handleCloseDrawer = async () => {
    if (!user || !currentSession) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) {
      return
    }

    setIsClosing(true)
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

      // Close modal first
      setIsCloseDrawerModalOpen(false)

      // Set up celebration stats
      setCelebrationStats([
        { label: 'Movimientos', value: String(movements.length) },
        { label: 'Ingresos', value: formatCurrency(totalIngresos) },
        { label: 'Retiros', value: formatCurrency(totalRetiros) },
      ])

      // Show celebration overlay
      setShowCelebration(true)

      // Refresh data
      setCurrentSession(null)
      setMovements([])
      await loadSessions()

      // Reset form
      setClosingBalance('')
      setDiscrepancyNote('')
    } catch (err) {
      console.error('Error closing drawer:', err)
      alert('Error al cerrar la caja')
    } finally {
      setIsClosing(false)
    }
  }

  const handleRecordMovement = async () => {
    if (!user || !currentSession || !movementCategory) return

    const amount = parseFloat(movementAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    setIsSavingMovement(true)
    try {
      const newMovement = await pb.collection('cash_movements').create<CashMovement>({
        session: currentSession.id,
        type: movementType,
        category: movementCategory,
        amount: amount,
        note: movementNote.trim() || null,
        createdBy: user.id,
        employee: (movementCategory === 'prestamo_empleado' || movementCategory === 'devolucion_prestamo') ? user.id : null,
      })

      // Add expanded employee data for immediate display
      const movementWithExpand: CashMovement = {
        ...newMovement,
        expand: (movementCategory === 'prestamo_empleado' || movementCategory === 'devolucion_prestamo')
          ? { employee: user }
          : undefined
      }

      // Add new movement to state directly (PocketBase returns the created record with timestamp)
      setMovements(prev => [...prev, movementWithExpand])

      // Trigger balance animation
      setLastMovementType(movementType)
      setTimeout(() => setLastMovementType(null), 500)

      // Close modal and reset form
      setIsMovementModalOpen(false)
      setMovementType('ingreso')
      setMovementCategory('')
      setMovementAmount('')
      setMovementNote('')

      // Show friendly success overlay with animation
      setSuccessOverlayData({ type: movementType, amount })
      setShowSuccessOverlay(true)
    } catch (err) {
      console.error('Error recording movement:', err)
      alert('Error al registrar el movimiento')
    } finally {
      setIsSavingMovement(false)
    }
  }

  const handleViewSessionDetail = async (session: CashSession) => {
    setViewingSession(session)
    setIsSessionDetailModalOpen(true)
    setIsLoadingSessionDetail(true)

    try {
      // Use simple getList with client-side filtering (same fix as loadMovements)
      const result = await pb.collection('cash_movements').getList<CashMovement>(1, 50, {
        expand: 'employee',
      })
      const movs = result.items.filter(m => m.session === session.id)
      // Sort by created descending (newest first)
      movs.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      setViewingSessionMovements(movs)
    } catch (err) {
      console.error('Error loading session movements:', err)
    } finally {
      setIsLoadingSessionDetail(false)
    }
  }

  // ============================================
  // FORMAT HELPERS
  // ============================================

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
  }

  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'Ahora'
    // PocketBase returns dates like "2024-01-15 10:30:00.000Z"
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Ahora'
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
  }

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <>
        <PageHeader title="Caja" subtitle="Control de efectivo" />
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Caja" subtitle="Control de efectivo" />

      <main className="page-content space-y-6">
        {error && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* Section Tabs */}
        <div className="section-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('caja')}
            className={`section-tab ${activeTab === 'caja' ? 'section-tab-active' : ''}`}
          >
            Caja
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`section-tab ${activeTab === 'historial' ? 'section-tab-active' : ''}`}
          >
            Historial
          </button>
        </div>

        {activeTab === 'caja' ? (
          currentSession ? (
            // Open drawer view
            <div className="space-y-6 pb-20 page-stagger">
                {/* Balance Hero */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-success text-white">
                      Abierta
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatDateTime(currentSession.openedAt)}
                    </span>
                  </div>
                  <BalanceHero
                    balance={expectedBalance}
                    label="Saldo esperado"
                    lastMovementType={lastMovementType}
                    trend={movements.length > 0 ? {
                      direction: expectedBalance >= currentSession.openingBalance ? 'up' : 'down',
                      amount: Math.abs(expectedBalance - currentSession.openingBalance)
                    } : undefined}
                  />
                </div>

                {/* Outstanding Loans */}
                {outstandingLoans.size > 0 && (
                  <div className="p-4 rounded-lg border border-warning bg-warning-subtle">
                    <h3 className="text-sm font-medium text-text-primary mb-3">
                      Prestamos pendientes
                    </h3>
                    <div className="space-y-2">
                      {Array.from(outstandingLoans.entries()).map(([id, loan]) => (
                        <div key={id} className="flex items-center justify-between">
                          <span className="text-sm text-text-secondary">{loan.name}</span>
                          <span className="text-sm font-medium text-warning">
                            {formatCurrency(loan.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movements Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    {movements.length} {movements.length === 1 ? 'movimiento' : 'movimientos'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMovementModalOpen(true)}
                    className="btn btn-primary btn-sm"
                  >
                    <IconAdd className="w-4 h-4" />
                    Registrar
                  </button>
                </div>

                {/* Movements List */}
                {movements.length === 0 ? (
                  <div className="text-center py-8 text-text-tertiary">
                    No hay movimientos registrados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...movements].sort((a, b) => {
                      // Sort by created time descending (newest first)
                      // Fallback to ID comparison since PocketBase IDs are time-sortable
                      if (a.created && b.created) {
                        const timeA = new Date(a.created).getTime()
                        const timeB = new Date(b.created).getTime()
                        if (!isNaN(timeA) && !isNaN(timeB)) {
                          return timeB - timeA
                        }
                      }
                      // Fallback: compare IDs (PocketBase IDs are lexicographically sortable)
                      return b.id.localeCompare(a.id)
                    }).map((mov, index) => (
                      <div
                        key={mov.id}
                        className={`movement-item ${
                          mov.type === 'ingreso' ? 'movement-item--ingreso' : 'movement-item--retiro'
                        } entering`}
                        style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            mov.type === 'ingreso'
                              ? 'bg-success-subtle text-success'
                              : 'bg-error-subtle text-error'
                          }`}
                        >
                          {mov.type === 'ingreso' ? (
                            <IconIngreso className="w-5 h-5" />
                          ) : (
                            <IconRetiro className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block">
                            {CATEGORY_LABELS[mov.category]}
                          </span>
                          {(mov.category === 'prestamo_empleado' || mov.category === 'devolucion_prestamo') && mov.expand?.employee && (
                            <span className="text-xs text-text-secondary truncate block mt-0.5">
                              {mov.expand.employee.name}
                            </span>
                          )}
                          {mov.note && (
                            <span className="text-xs text-text-tertiary truncate block mt-0.5">
                              {mov.note}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-medium block ${
                              mov.type === 'ingreso' ? 'text-success' : 'text-error'
                            }`}
                          >
                            {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                          </span>
                          <span className="text-xs text-text-tertiary block mt-0.5">
                            {formatTime(mov.created)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          ) : (
            // Closed drawer view with animated empty state
            <EmptyStateAnimation
              title="Caja cerrada"
              description="Abre la caja para comenzar a registrar movimientos"
              action={
                <button
                  type="button"
                  onClick={() => setIsOpenDrawerModalOpen(true)}
                  className="btn btn-primary btn-lg"
                >
                  Abrir caja
                </button>
              }
            />
          )
        ) : (
          // Historial tab
          sessions.length === 0 ? (
            <EmptyStateAnimation
              title="No hay sesiones"
              description="Las sesiones de caja apareceran aqui"
              className="empty-state-fill"
            />
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="session-stats" role="region" aria-label="Resumen de sesiones">
                <div className="session-stat">
                  <div className="session-stat__value">{sessions.length}</div>
                  <div className="session-stat__label">{sessions.length === 1 ? 'Sesion' : 'Sesiones'}</div>
                </div>
                <div className="session-stat">
                  <div className="session-stat__value">
                    {sessions.filter(s => s.closedAt).length}
                  </div>
                  <div className="session-stat__label">Cerradas</div>
                </div>
                <div className="session-stat">
                  <div className="session-stat__value">
                    {sessions.filter(s => !s.closedAt).length}
                  </div>
                  <div className="session-stat__label">Abiertas</div>
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`session-item entering ${
                      session.closedAt ? 'session-item--closed' : 'session-item--open'
                    }`}
                    onClick={() => handleViewSessionDetail(session)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleViewSessionDetail(session)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Sesion del ${formatDate(session.openedAt)}, ${session.closedAt ? 'cerrada' : 'abierta'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      session.closedAt
                        ? 'bg-success-subtle text-success'
                        : 'bg-warning-subtle text-warning'
                    }`}>
                      {session.closedAt ? (
                        <IconCheck className="w-5 h-5" />
                      ) : (
                        <IconClock className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">
                        {formatDate(session.openedAt)}
                      </span>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Apertura: {formatCurrency(session.openingBalance)}
                        {session.closedAt && session.closingBalance !== undefined && (
                          <>
                            <span className="mx-1.5">·</span>
                            Cierre: {formatCurrency(session.closingBalance)}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.discrepancy !== undefined && session.discrepancy !== 0 && (
                        <span
                          className={`text-sm font-medium ${
                            session.discrepancy > 0 ? 'text-success' : 'text-error'
                          }`}
                        >
                          {session.discrepancy > 0 ? '+' : ''}{formatCurrency(session.discrepancy)}
                        </span>
                      )}
                      <IconChevronRight className="w-5 h-5 text-text-tertiary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      {/* Close Drawer Button - Fixed above mobile nav */}
      {currentSession && activeTab === 'caja' && (
        <div
          className="fixed left-0 right-0 p-4 bg-bg-surface border-t border-border z-40 lg:ml-64 lg:bottom-0"
          style={{ bottom: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={() => setIsCloseDrawerModalOpen(true)}
            className="btn btn-secondary w-full max-w-lg mx-auto block"
          >
            Cerrar caja
          </button>
        </div>
      )}

      {/* Open Drawer Modal */}
      <Modal
        isOpen={isOpenDrawerModalOpen}
        onClose={() => !isOpening && setIsOpenDrawerModalOpen(false)}
        title="Abrir caja"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsOpenDrawerModalOpen(false)}
              className="btn btn-secondary flex-1"
              disabled={isOpening}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="btn btn-primary flex-1"
              disabled={isOpening || openingBalance === '' || parseFloat(openingBalance) < 0}
            >
              {isOpening ? <Spinner /> : 'Abrir'}
            </button>
          </div>
        }
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
            <label htmlFor="opening-balance" className="label">Saldo inicial (S/)</label>
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
      </Modal>

      {/* Close Drawer Modal */}
      <Modal
        isOpen={isCloseDrawerModalOpen}
        onClose={() => !isClosing && setIsCloseDrawerModalOpen(false)}
        title="Cerrar caja"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(false)}
              className="btn btn-secondary flex-1"
              disabled={isClosing}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="btn btn-primary flex-1"
              disabled={isClosing || !closingBalance || parseFloat(closingBalance) < 0}
            >
              {isClosing ? <Spinner /> : 'Cerrar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-bg-muted">
            <div className="text-sm text-text-secondary">Saldo esperado</div>
            <div className="text-xl font-display font-bold text-text-primary mt-1">
              {formatCurrency(expectedBalance)}
            </div>
          </div>

          <div>
            <label htmlFor="closing-balance" className="label">Saldo real (S/)</label>
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
            />
          </div>

          {closingBalance && (
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
          )}

          {closingBalance && closingDiscrepancy !== 0 && (
            <div>
              <label htmlFor="discrepancy-note" className="label">Nota (opcional)</label>
              <textarea
                id="discrepancy-note"
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                className="input"
                placeholder="Explica la diferencia..."
                rows={2}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => !isSavingMovement && setIsMovementModalOpen(false)}
        title="Registrar movimiento"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="btn btn-secondary flex-1"
              disabled={isSavingMovement}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRecordMovement}
              className="btn btn-primary flex-1"
              disabled={isSavingMovement || !movementCategory || !movementAmount || parseFloat(movementAmount) <= 0}
            >
              {isSavingMovement ? <Spinner /> : 'Registrar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementType('ingreso')
                setMovementCategory('')
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                movementType === 'ingreso'
                  ? 'bg-success text-white'
                  : 'bg-bg-muted text-text-secondary hover:text-text-primary'
              }`}
            >
              <IconIngreso className="w-5 h-5" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('retiro')
                setMovementCategory('')
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                movementType === 'retiro'
                  ? 'bg-error text-white'
                  : 'bg-bg-muted text-text-secondary hover:text-text-primary'
              }`}
            >
              <IconRetiro className="w-5 h-5" />
              Retiro
            </button>
          </div>

          {/* Category Select */}
          <div>
            <label htmlFor="movement-category" className="label">Categoria</label>
            <select
              id="movement-category"
              value={movementCategory}
              onChange={(e) => setMovementCategory(e.target.value as CashMovementCategory)}
              className="input"
            >
              <option value="">Seleccionar...</option>
              {(movementType === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="movement-amount" className="label">Monto (S/)</label>
            <input
              id="movement-amount"
              type="number"
              inputMode="decimal"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Note */}
          <div>
            <label htmlFor="movement-note" className="label">Nota (opcional)</label>
            <textarea
              id="movement-note"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              className="input"
              placeholder="Descripcion del movimiento..."
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        isOpen={isSessionDetailModalOpen}
        onClose={() => setIsSessionDetailModalOpen(false)}
        title={viewingSession ? formatDate(viewingSession.openedAt) : 'Detalle de sesion'}
      >
        {isLoadingSessionDetail ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : viewingSession ? (
          <div className="space-y-4">
            {/* Session Info */}
            <div className="space-y-3 p-4 bg-bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Apertura</span>
                <span className="text-sm font-medium">
                  {formatTime(viewingSession.openedAt)} - {formatCurrency(viewingSession.openingBalance)}
                </span>
              </div>
              {viewingSession.closedAt && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Cierre</span>
                    <span className="text-sm font-medium">
                      {formatTime(viewingSession.closedAt)} - {formatCurrency(viewingSession.closingBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Esperado</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(viewingSession.expectedBalance || 0)}
                    </span>
                  </div>
                  {viewingSession.discrepancy !== undefined && viewingSession.discrepancy !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Diferencia</span>
                      <span
                        className={`text-sm font-medium ${
                          viewingSession.discrepancy > 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {viewingSession.discrepancy > 0 ? '+' : ''}{formatCurrency(viewingSession.discrepancy)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {viewingSession.discrepancyNote && (
              <div className="p-3 rounded-lg bg-warning-subtle">
                <div className="text-xs text-text-secondary mb-1">Nota</div>
                <div className="text-sm text-text-primary">{viewingSession.discrepancyNote}</div>
              </div>
            )}

            {/* Movements */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Movimientos ({viewingSessionMovements.length})
              </h4>
              {viewingSessionMovements.length === 0 ? (
                <div className="text-center py-4 text-text-tertiary">
                  Sin movimientos
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {viewingSessionMovements.map((mov) => (
                    <div
                      key={mov.id}
                      className="list-item"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          mov.type === 'ingreso'
                            ? 'bg-success-subtle text-success'
                            : 'bg-error-subtle text-error'
                        }`}
                      >
                        {mov.type === 'ingreso' ? (
                          <IconIngreso className="w-4 h-4" />
                        ) : (
                          <IconRetiro className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">
                          {CATEGORY_LABELS[mov.category]}
                        </span>
                        {mov.note && (
                          <span className="text-xs text-text-tertiary truncate block">
                            {mov.note}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium flex-shrink-0 ${
                          mov.type === 'ingreso' ? 'text-success' : 'text-error'
                        }`}
                      >
                        {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Success overlay for movement recording */}
      {successOverlayData && (
        <SuccessOverlay
          isVisible={showSuccessOverlay}
          onClose={() => {
            setShowSuccessOverlay(false)
            setSuccessOverlayData(null)
          }}
          type={successOverlayData.type}
          amount={successOverlayData.amount}
        />
      )}

      {/* Celebration overlay for drawer close */}
      <CelebrationOverlay
        isVisible={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Caja cerrada"
        subtitle="Buen trabajo hoy"
        stats={celebrationStats}
      />
    </>
  )
}
