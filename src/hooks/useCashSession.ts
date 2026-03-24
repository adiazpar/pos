'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { transitionModals } from '@/lib/modal-utils'
import { calculateExpectedBalance } from '@/lib/cash'
import { fetchDeduped } from '@/lib/fetch'
import type { CashSession, CashMovement } from '@/types'

// ============================================
// SESSION CACHE
// ============================================

const CACHE_KEY = 'cash_session_cache'

function getCachedSession(): CashSession | null | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached === null) return 'unknown' // Never cached
    if (cached === 'null') return null // Cached as no session
    return JSON.parse(cached) as CashSession
  } catch {
    return 'unknown'
  }
}

function setCachedSession(session: CashSession | null): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, session ? JSON.stringify(session) : 'null')
  } catch {
    // Storage error, ignore
  }
}

export function clearSessionCache(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CACHE_KEY)
}

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

  // Initialize from cache if available
  const [currentSession, setCurrentSession] = useState<CashSession | null>(() => {
    const cached = getCachedSession()
    return cached !== 'unknown' ? cached : null
  })
  const [sessions, setSessions] = useState<CashSession[]>([])
  // If we have cached data, don't show loading
  const [isLoading, setIsLoading] = useState(() => {
    const cached = getCachedSession()
    return cached === 'unknown'
  })
  const [error, setError] = useState('')

  // Calculated values
  const expectedBalance = useMemo(() => {
    return calculateExpectedBalance(currentSession, movements)
  }, [currentSession, movements])

  const lastClosedSession = useMemo(() => {
    return sessions.find(s => s.closedAt != null) || null
  }, [sessions])

  // Load current open session with caching
  const loadCurrentSession = useCallback(async (): Promise<string | null> => {
    // Check cache first - if we have cached data, use it without API call
    const cached = getCachedSession()

    if (cached !== 'unknown') {
      // Trust the cache - no API call needed
      setCurrentSession(cached)
      return cached?.id || null
    }

    // No cache - must fetch from server
    try {
      const response = await fetchDeduped('/api/cash/sessions/current')
      const data = await response.json()

      if (response.ok && data.success && data.session) {
        setCurrentSession(data.session)
        setCachedSession(data.session)
        return data.session.id
      } else {
        setCurrentSession(null)
        setCachedSession(null)
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
      const response = await fetchDeduped('/api/cash/sessions')
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

      // Update cache
      setCachedSession(session)

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
    setCachedSession(null)
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
