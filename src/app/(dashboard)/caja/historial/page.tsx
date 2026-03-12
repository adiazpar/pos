'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout'
import { Spinner, Modal } from '@/components/ui'
import { IconCircleCheck, IconClock, IconChevronRight, IconIngreso, IconRetiro, IconArrowUp } from '@/components/icons'
import { useNavbar } from '@/contexts/navbar-context'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CashSession, CashMovement, CashMovementCategory } from '@/types'

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  venta: 'Venta',
  prestamo_empleado: 'Prestamo',
  retiro_banco: 'Retiro de banco',
  devolucion_prestamo: 'Devolucion',
  deposito_banco: 'Deposito a banco',
  otro: 'Otro',
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

// ============================================
// MAIN COMPONENT
// ============================================

export default function HistorialPage() {
  const router = useRouter()
  const { pb } = useAuth()
  const { hide, show, setReturning } = useNavbar()

  // Data state
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [movementCounts, setMovementCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Session detail state
  const [viewingSession, setViewingSession] = useState<CashSession | null>(null)
  const [viewingSessionMovements, setViewingSessionMovements] = useState<CashMovement[]>([])
  const [isSessionDetailModalOpen, setIsSessionDetailModalOpen] = useState(false)
  const [isLoadingSessionDetail, setIsLoadingSessionDetail] = useState(false)

  // Scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Hide navbar on mount, show on unmount
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  // Load sessions and movement counts
  useEffect(() => {
    async function loadSessions() {
      try {
        // Load sessions
        const sess = await pb.collection('cash_sessions').getFullList<CashSession>({
          sort: '-openedAt',
          expand: 'openedBy,closedBy',
          requestKey: null,
        })
        setSessions(sess)

        // Load all movements to count per session
        const allMovements = await pb.collection('cash_movements').getFullList<CashMovement>({
          requestKey: null,
        })

        // Count movements per session
        const counts: Record<string, number> = {}
        for (const mov of allMovements) {
          counts[mov.session] = (counts[mov.session] || 0) + 1
        }
        setMovementCounts(counts)
      } catch (err) {
        console.error('Error loading sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [pb])

  // Handle back navigation
  const handleBack = useCallback(() => {
    setReturning(true)
    router.push('/caja')
  }, [router, setReturning])

  // View session detail
  const handleViewSessionDetail = async (session: CashSession) => {
    setViewingSession(session)
    setIsSessionDetailModalOpen(true)
    setIsLoadingSessionDetail(true)

    try {
      const result = await pb.collection('cash_movements').getList<CashMovement>(1, 50, {
        expand: 'employee',
      })
      const movs = result.items.filter(m => m.session === session.id)
      movs.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      setViewingSessionMovements(movs)
    } catch (err) {
      console.error('Error loading session movements:', err)
    } finally {
      setIsLoadingSessionDetail(false)
    }
  }

  // Format helpers
  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'Ahora'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Ahora'
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
  }

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr)
    return DAYS_OF_WEEK[date.getDay()]
  }

  const getNetChange = (session: CashSession) => {
    if (!session.closedAt || session.closingBalance === undefined) return null
    return session.closingBalance - session.openingBalance
  }

  // Calculate stats
  const closedSessions = sessions.filter(s => s.closedAt)
  const openSessions = sessions.filter(s => !s.closedAt)

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Historial"
          subtitle="Sesiones de caja"
          showBackButton
          onBack={handleBack}
          sticky
        />
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      </>
    )
  }

  return (
    <div ref={scrollContainerRef} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <PageHeader
        title="Historial"
        subtitle="Sesiones de caja"
        showBackButton
        onBack={handleBack}
        sticky
      />

      <main className="page-content page-content--no-navbar">
        <div className="flex flex-col flex-1 gap-6 page-stagger">
          {/* Summary Stats */}
          <div className="session-stats" role="region" aria-label="Resumen de sesiones">
            <div className="session-stat">
              <div className="session-stat__value">{sessions.length}</div>
              <div className="session-stat__label">{sessions.length === 1 ? 'Sesion' : 'Sesiones'}</div>
            </div>
            <div className="session-stat">
              <div className="session-stat__value">{closedSessions.length}</div>
              <div className="session-stat__label">Cerradas</div>
            </div>
            <div className="session-stat">
              <div className="session-stat__value">{openSessions.length}</div>
              <div className="session-stat__label">Abiertas</div>
            </div>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="empty-state-fill">
              <p className="empty-state-description">
                No hay sesiones registradas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => {
                const netChange = getNetChange(session)
                const moveCount = movementCounts[session.id] || 0

                return (
                  <div
                    key={session.id}
                    className="session-card entering"
                    style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}
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
                    {/* Top row: Icon + Date | Net Change */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        session.closedAt
                          ? 'bg-success-subtle text-success'
                          : 'bg-warning-subtle text-warning'
                      }`}>
                        {session.closedAt ? (
                          <IconCircleCheck className="w-5 h-5" />
                        ) : (
                          <IconClock className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-text-primary">
                            {formatDate(session.openedAt)}
                          </span>
                          {netChange !== null && (
                            <span className={`text-base font-semibold ${
                              netChange >= 0 ? 'text-success' : 'text-error'
                            }`}>
                              {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                            </span>
                          )}
                          {!session.closedAt && (
                            <span className="text-sm font-medium text-warning">En curso</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-text-tertiary">
                            {getDayOfWeek(session.openedAt)}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                            <span>{moveCount} {moveCount === 1 ? 'movimiento' : 'movimientos'}</span>
                            <IconChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Opening → Closing */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                      <div className="flex-1">
                        <div className="text-xs text-text-tertiary">Apertura</div>
                        <div className="text-sm font-medium text-text-primary mt-0.5">
                          {formatCurrency(session.openingBalance)}
                        </div>
                      </div>
                      {session.closedAt && session.closingBalance !== undefined && (
                        <div className="flex-1 text-right">
                          <div className="text-xs text-text-tertiary">Cierre</div>
                          <div className="text-sm font-medium text-text-primary mt-0.5">
                            {formatCurrency(session.closingBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Back to top button */}
          {sessions.length > 5 && (
            <button
              type="button"
              onClick={scrollToTop}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <IconArrowUp className="w-4 h-4" />
              Volver arriba
            </button>
          )}
        </div>
      </main>

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
                <div className="space-y-6 max-h-64 overflow-y-auto scrollbar-hidden">
                  {viewingSessionMovements.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex items-start gap-3"
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
                          {formatTime(mov.created)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
