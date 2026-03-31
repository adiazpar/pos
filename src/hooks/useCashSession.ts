'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { transitionModals } from '@/lib/modal-utils'
import { calculateExpectedBalance } from '@/lib/cash'
import { fetchDeduped } from '@/lib/fetch'
import { apiPost, ApiError, type ApiResponse } from '@/lib/api-client'
import type { CashSession, CashMovement } from '@/types'

// API Response types
interface CurrentSessionResponse extends ApiResponse {
  session?: CashSession
}

interface SessionsResponse extends ApiResponse {
  sessions: CashSession[]
}

interface OpenSessionResponse extends ApiResponse {
  session: CashSession
}

// ============================================
// SESSION CACHE
// ============================================

function cacheKey(businessId: string) {
  return `cash_session_cache_${businessId}`
}

function getCachedSession(businessId: string | null): CashSession | null | 'unknown' {
  if (typeof window === 'undefined' || !businessId) return 'unknown'
  try {
    const cached = sessionStorage.getItem(cacheKey(businessId))
    if (cached === null) return 'unknown' // Never cached
    if (cached === 'null') return null // Cached as no session
    return JSON.parse(cached) as CashSession
  } catch {
    return 'unknown'
  }
}

function setCachedSession(businessId: string | null, session: CashSession | null): void {
  if (typeof window === 'undefined' || !businessId) return
  try {
    sessionStorage.setItem(cacheKey(businessId), session ? JSON.stringify(session) : 'null')
  } catch {
    // Storage error, ignore
  }
}

export function clearSessionCache(businessId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(cacheKey(businessId))
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
  businessId: string | null
  movements: CashMovement[]
}

export function useCashSession({ businessId, movements }: UseCashSessionOptions): UseCashSessionReturn {
  const { user } = useAuth()

  // Initialize from cache if available
  const [currentSession, setCurrentSession] = useState<CashSession | null>(() => {
    const cached = getCachedSession(businessId)
    return cached !== 'unknown' ? cached : null
  })
  const [sessions, setSessions] = useState<CashSession[]>([])
  // Always start loading - page will set to false when ready
  const [isLoading, setIsLoading] = useState(true)
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
    const cached = getCachedSession(businessId)

    if (cached !== 'unknown') {
      // Trust the cache - no API call needed
      setCurrentSession(cached)
      return cached?.id || null
    }

    // No cache - must fetch from server
    if (!businessId) return null
    try {
      // Use fetchDeduped for request deduplication, then parse response
      const response = await fetchDeduped(`/api/businesses/${businessId}/cash/sessions/current`)
      const data = (await response.json()) as CurrentSessionResponse

      if (!response.ok || data.success === false) {
        throw new ApiError(response.status, data, data.error)
      }

      if (data.session) {
        setCurrentSession(data.session)
        setCachedSession(businessId, data.session)
        return data.session.id
      } else {
        setCurrentSession(null)
        setCachedSession(businessId, null)
        return null
      }
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Error loading current session:', err.message)
      } else {
        console.error('Error loading current session:', err)
      }
      return null
    }
  }, [businessId])

  // Load all sessions
  const loadSessions = useCallback(async (): Promise<void> => {
    if (!businessId) return
    try {
      // Use fetchDeduped for request deduplication, then parse response
      const response = await fetchDeduped(`/api/businesses/${businessId}/cash/sessions`)
      const data = (await response.json()) as SessionsResponse

      if (!response.ok || data.success === false) {
        throw new ApiError(response.status, data, data.error)
      }

      setSessions(data.sessions)
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Error loading sessions:', err.message)
      } else {
        console.error('Error loading sessions:', err)
      }
    }
  }, [businessId])

  // Open a new cash drawer session
  const openDrawer = useCallback(async (
    openingBalance: number,
    setMovements: (movements: CashMovement[]) => void,
    setShowOpenAnimation: (show: boolean) => void,
    closeModal: () => void
  ): Promise<void> => {
    if (!user || !businessId) return

    try {
      const data = await apiPost<OpenSessionResponse>(
        `/api/businesses/${businessId}/cash/sessions`,
        { openingBalance }
      )

      const session = data.session

      // Update cache
      setCachedSession(businessId, session)

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
      if (err instanceof ApiError) {
        console.error('Error opening drawer:', err.message)
        setError(err.message)
      } else {
        console.error('Error opening drawer:', err)
        setError('Failed to open cash drawer')
      }
      throw err
    }
  }, [user, loadSessions, businessId])

  // Handle successful drawer close
  const handleCloseDrawerSuccess = useCallback(async (): Promise<void> => {
    setCurrentSession(null)
    setCachedSession(businessId, null)
    await loadSessions()
  }, [businessId, loadSessions])

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
