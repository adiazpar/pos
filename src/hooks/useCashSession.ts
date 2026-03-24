'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { transitionModals } from '@/lib/modal-utils'
import { calculateExpectedBalance } from '@/lib/cash'
import type { CashSession, CashMovement } from '@/types'

export interface UseCashSessionReturn {
  // State
  currentSession: CashSession | null
  sessions: CashSession[]
  isLoading: boolean
  error: string

  // Derived values
  expectedBalance: number
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
  const { user } = useAuth()

  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Calculated values
  const expectedBalance = useMemo(() => {
    return calculateExpectedBalance(currentSession, movements)
  }, [currentSession, movements])

  const lastClosedSession = useMemo(() => {
    return sessions.find(s => s.closedAt != null) || null
  }, [sessions])

  // Load current open session
  // TODO: Implement with Drizzle API routes
  const loadCurrentSession = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/cash/sessions/current')
      const data = await response.json()

      if (response.ok && data.success && data.session) {
        setCurrentSession(data.session)
        return data.session.id
      } else {
        setCurrentSession(null)
        return null
      }
    } catch (err) {
      console.error('Error loading current session:', err)
      return null
    }
  }, [])

  // Load all sessions
  // TODO: Implement with Drizzle API routes
  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/cash/sessions')
      const data = await response.json()

      if (response.ok && data.success) {
        setSessions(data.sessions)
      }
    } catch (err) {
      console.error('Error loading sessions:', err)
    }
  }, [])

  // Open a new cash drawer session
  // TODO: Implement with Drizzle API routes
  const openDrawer = useCallback(async (
    openingBalance: number,
    setMovements: (movements: CashMovement[]) => void,
    setShowOpenAnimation: (show: boolean) => void,
    closeModal: () => void
  ): Promise<void> => {
    if (!user) return

    try {
      const response = await fetch('/api/cash/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error opening drawer')
      }

      const session: CashSession = data.session

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
      setError('Failed to open cash drawer')
      throw err
    }
  }, [user, loadSessions])

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
