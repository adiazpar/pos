'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { transitionModals } from '@/lib/modal-utils'
import { calculateExpectedBalance, calculateOutstandingLoans } from '@/lib/cash'
import type { CashSession, CashMovement } from '@/types'

export interface UseCashSessionReturn {
  // State
  currentSession: CashSession | null
  sessions: CashSession[]
  isLoading: boolean
  error: string

  // Derived values
  expectedBalance: number
  outstandingLoans: Map<string, { name: string; amount: number }>
  lastClosedSession: CashSession | null

  // Actions
  loadCurrentSession: () => Promise<string | null>
  loadSessions: () => Promise<void>
  openDrawer: (
    openingBalance: number,
    setMovements: (movements: CashMovement[]) => void,
    setShowOpenAnimation: (show: boolean) => void,
    closeModal: () => void
  ) => Promise<void>
  handleCloseDrawerSuccess: () => Promise<void>
  setIsLoading: (loading: boolean) => void
  setError: (error: string) => void
  setCurrentSession: (session: CashSession | null) => void
}

export interface UseCashSessionOptions {
  movements: CashMovement[]
}

export function useCashSession({ movements }: UseCashSessionOptions): UseCashSessionReturn {
  const { user, pb } = useAuth()

  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Calculated values
  const expectedBalance = useMemo(() => {
    return calculateExpectedBalance(currentSession, movements)
  }, [currentSession, movements])

  const outstandingLoans = useMemo(() => {
    return calculateOutstandingLoans(movements)
  }, [movements])

  const lastClosedSession = useMemo(() => {
    return sessions.find(s => s.closedAt != null) || null
  }, [sessions])

  // Load current open session
  const loadCurrentSession = useCallback(async (): Promise<string | null> => {
    try {
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

  // Load all sessions
  const loadSessions = useCallback(async (): Promise<void> => {
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

  // Open a new cash drawer session
  const openDrawer = useCallback(async (
    openingBalance: number,
    setMovements: (movements: CashMovement[]) => void,
    setShowOpenAnimation: (show: boolean) => void,
    closeModal: () => void
  ): Promise<void> => {
    if (!user) return

    try {
      const now = new Date().toISOString()

      const session = await pb.collection('cash_sessions').create<CashSession>({
        openedAt: now,
        openedBy: user.id,
        openingBalance: openingBalance,
      })

      // Transition from open drawer modal to opening animation
      transitionModals(
        closeModal,
        () => {
          setCurrentSession(session)
          setMovements([])
          setShowOpenAnimation(true)
          loadSessions()
        }
      )
    } catch (err) {
      console.error('Error opening drawer:', err)
      setError('Error al abrir la caja')
      throw err
    }
  }, [user, pb, loadSessions])

  // Handle successful drawer close
  const handleCloseDrawerSuccess = useCallback(async (): Promise<void> => {
    setCurrentSession(null)
    await loadSessions()
  }, [loadSessions])

  return {
    currentSession,
    sessions,
    isLoading,
    error,
    expectedBalance,
    outstandingLoans,
    lastClosedSession,
    loadCurrentSession,
    loadSessions,
    openDrawer,
    handleCloseDrawerSuccess,
    setIsLoading,
    setError,
    setCurrentSession,
  }
}
