'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Spinner, Modal } from '@/components/ui'
import { CheckCircle2, Clock, ChevronRight, ArrowDownCircle, ArrowUpCircle, ArrowUp } from 'lucide-react'
import { useNavbar } from '@/contexts/navbar-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CashSession, CashMovement, CashMovementCategory } from '@/types'

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale: 'Sale',
  bank_withdrawal: 'Bank withdrawal',
  bank_deposit: 'Bank deposit',
  other: 'Other',
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ============================================
// MAIN COMPONENT
// ============================================

export default function HistoryPage() {
  const { hide, show } = useNavbar()

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
        const sessionsRes = await fetch('/api/cash/sessions')
        const sessionsData = await sessionsRes.json()

        if (sessionsRes.ok && sessionsData.success) {
          setSessions(sessionsData.sessions)
        }

        // Load movement counts per session
        const countsRes = await fetch('/api/cash/movements/counts')
        const countsData = await countsRes.json()

        if (countsRes.ok && countsData.success) {
          setMovementCounts(countsData.counts)
        }
      } catch (err) {
        console.error('Error loading sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()
  }, [])

  // View session detail
  const handleViewSessionDetail = async (session: CashSession) => {
    setViewingSession(session)
    setIsSessionDetailModalOpen(true)
    setIsLoadingSessionDetail(true)

    try {
      const response = await fetch(`/api/cash/movements?sessionId=${session.id}`)
      const data = await response.json()

      if (response.ok && data.success) {
        const movs = data.movements as CashMovement[]
        movs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setViewingSessionMovements(movs)
      }
    } catch (err) {
      console.error('Error loading session movements:', err)
    } finally {
      setIsLoadingSessionDetail(false)
    }
  }

  // Format helpers
  const formatTime = (dateStr: Date | string | undefined | null) => {
    if (!dateStr) return 'Now'
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    if (isNaN(date.getTime())) return 'Now'
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    })
  }

  const getDayOfWeek = (dateStr: Date | string) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
    return DAYS_OF_WEEK[date.getDay()]
  }

  const getNetChange = (session: CashSession) => {
    if (!session.closedAt || session.closingBalance == null) return null
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
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <div ref={scrollContainerRef} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <main className="page-content page-content--no-navbar">
        <div className="flex flex-col flex-1 gap-6">
          {/* Summary Stats */}
          <div className="session-stats" role="region" aria-label="Sessions summary">
            <div className="session-stat">
              <div className="session-stat__value">{sessions.length}</div>
              <div className="session-stat__label">{sessions.length === 1 ? 'Session' : 'Sessions'}</div>
            </div>
            <div className="session-stat">
              <div className="session-stat__value">{closedSessions.length}</div>
              <div className="session-stat__label">Closed</div>
            </div>
            <div className="session-stat">
              <div className="session-stat__value">{openSessions.length}</div>
              <div className="session-stat__label">Open</div>
            </div>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="empty-state-fill">
              <p className="empty-state-description">
                No sessions recorded
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const netChange = getNetChange(session)
                const moveCount = movementCounts[session.id] || 0

                return (
                  <div
                    key={session.id}
                    className="session-card"
                    onClick={() => handleViewSessionDetail(session)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleViewSessionDetail(session)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Session from ${formatDate(session.openedAt)}, ${session.closedAt ? 'closed' : 'open'}`}
                  >
                    {/* Top row: Icon + Date | Net Change */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        session.closedAt
                          ? 'bg-success-subtle text-success'
                          : 'bg-warning-subtle text-warning'
                      }`}>
                        {session.closedAt ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
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
                            <span className="text-sm font-medium text-warning">In progress</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-text-tertiary">
                            {getDayOfWeek(session.openedAt)}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                            <span>{moveCount} {moveCount === 1 ? 'movement' : 'movements'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Opening → Closing */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                      <div className="flex-1">
                        <div className="text-xs text-text-tertiary">Opening</div>
                        <div className="text-sm font-medium text-text-primary mt-0.5">
                          {formatCurrency(session.openingBalance)}
                        </div>
                      </div>
                      {session.closedAt && session.closingBalance != null && (
                        <div className="flex-1 text-right">
                          <div className="text-xs text-text-tertiary">Closing</div>
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
                <ArrowUp className="w-4 h-4" />
                Back to top
              </button>
          )}
        </div>
      </main>

      {/* Session Detail Modal */}
      <Modal
        isOpen={isSessionDetailModalOpen}
        onClose={() => setIsSessionDetailModalOpen(false)}
        title={viewingSession ? formatDate(viewingSession.openedAt) : 'Session details'}
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
                <span className="text-sm text-text-secondary">Opening</span>
                <span className="text-sm font-medium">
                  {formatTime(viewingSession.openedAt)} - {formatCurrency(viewingSession.openingBalance)}
                </span>
              </div>
              {viewingSession.closedAt && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Closing</span>
                    <span className="text-sm font-medium">
                      {formatTime(viewingSession.closedAt)} - {formatCurrency(viewingSession.closingBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Expected</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(viewingSession.expectedBalance || 0)}
                    </span>
                  </div>
                  {viewingSession.discrepancy != null && viewingSession.discrepancy !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Difference</span>
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
                <div className="text-xs text-text-secondary mb-1">Note</div>
                <div className="text-sm text-text-primary">{viewingSession.discrepancyNote}</div>
              </div>
            )}

            {/* Movements */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Movements ({viewingSessionMovements.length})
              </h4>
              {viewingSessionMovements.length === 0 ? (
                <div className="text-center py-4 text-text-tertiary">
                  No movements
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
                      <div className="flex-1 min-w-0 h-10 flex flex-col justify-between">
                        <span className="font-medium truncate">
                          {CATEGORY_LABELS[mov.category]}
                        </span>
                        <span className="text-xs text-text-tertiary truncate">
                          {mov.note || '-'}
                        </span>
                      </div>
                      <div className="text-right h-10 flex flex-col justify-between flex-shrink-0">
                        <span
                          className={`font-medium ${
                            mov.type === 'deposit' ? 'text-success' : 'text-error'
                          }`}
                        >
                          {mov.type === 'deposit' ? '+' : '-'}{formatCurrency(mov.amount)}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {formatTime(mov.createdAt)}
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
