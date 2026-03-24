'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import { fetchDeduped } from '@/lib/fetch'

// ============================================
// TYPES
// ============================================

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Auth methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

// ============================================
// LOCAL STORAGE CACHE
// ============================================

const AUTH_CACHE_KEY = 'auth_user_cache'
const AUTH_VALIDATED_KEY = 'auth_last_validated'
const VALIDATION_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as User
    }
  } catch {
    // Invalid cache, ignore
  }
  return null
}

function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY)
      localStorage.removeItem(AUTH_VALIDATED_KEY)
    }
  } catch {
    // Storage error, ignore
  }
}

function shouldRevalidate(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const lastValidated = localStorage.getItem(AUTH_VALIDATED_KEY)
    if (!lastValidated) return true
    const elapsed = Date.now() - parseInt(lastValidated, 10)
    return elapsed > VALIDATION_INTERVAL_MS
  } catch {
    return true
  }
}

function setValidatedNow(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(AUTH_VALIDATED_KEY, Date.now().toString())
  } catch {
    // Storage error, ignore
  }
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load cached user and validate auth on mount (if needed)
  useEffect(() => {
    const cachedUser = getCachedUser()

    // If we have cached data, use it immediately
    if (cachedUser) {
      setUser(cachedUser)
      setIsLoading(false)

      // Skip API call if validated recently (within 5 minutes)
      if (!shouldRevalidate()) {
        return
      }
    }

    // Validate auth with server
    const validateAuth = async () => {
      try {
        const response = await fetchDeduped('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser(data.user)
            setCachedUser(data.user)
            setValidatedNow()
          } else {
            // Server says no user, clear cache
            setUser(null)
            setCachedUser(null)
          }
        } else {
          // Auth failed, clear cache
          setUser(null)
          setCachedUser(null)
        }
      } catch (error) {
        console.error('Failed to validate auth:', error)
        // On network error, keep cached user (offline support)
      } finally {
        setIsLoading(false)
      }
    }

    validateAuth()
  }, [])

  // ============================================
  // AUTH METHODS
  // ============================================

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      setUser(data.user)
      setCachedUser(data.user)
      setValidatedNow()
      return { success: true }
    } catch {
      return { success: false, error: 'Connection error' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    setUser(null)
    setCachedUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetchDeduped('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          setCachedUser(data.user)
          setValidatedNow()
        }
      }
    } catch {
      // Ignore errors
    }
  }, [])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  }), [user, isLoading, login, logout, refreshUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================
// HOOKS
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}
