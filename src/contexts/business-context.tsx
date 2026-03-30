'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { useNavbar } from './navbar-context'
import type { BusinessRole } from '@/lib/business-role'

// Re-export for backwards compatibility
export type { BusinessRole }

// ============================================
// TYPES
// ============================================

export interface Business {
  id: string
  name: string
}

interface BusinessContextType {
  business: Business | null
  businessId: string | null
  role: BusinessRole | null
  isLoading: boolean
  error: string | null
  // Helpers
  canManage: boolean  // owner or partner
  isOwner: boolean
}

// ============================================
// CONTEXT
// ============================================

const BusinessContext = createContext<BusinessContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

interface BusinessProviderProps {
  children: ReactNode
  businessId: string | null
}

export function BusinessProvider({ children, businessId }: BusinessProviderProps) {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { getCachedBusiness, setCachedBusiness } = useNavbar()
  const [business, setBusiness] = useState<Business | null>(null)
  const [role, setRole] = useState<BusinessRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // No business ID - reset state and skip validation
    if (!businessId) {
      setBusiness(null)
      setRole(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Check cache for instant display
    const cached = getCachedBusiness(businessId)
    if (cached) {
      setBusiness({ id: businessId, name: cached.name })
      setRole(cached.role as BusinessRole)
      setIsLoading(false)
      // Cache hit - skip API call, server validates on actual data operations
      return
    }

    // Wait for auth to be ready
    if (authLoading) return

    // Must be authenticated
    if (!user) {
      router.replace('/login')
      return
    }

    // No cache - validate business access via API
    async function validateAccess() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/businesses/${businessId}/access`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Business not found')
            router.replace('/')
            return
          }
          if (response.status === 403) {
            setError('You do not have access to this business')
            router.replace('/')
            return
          }
          throw new Error('Failed to validate access')
        }

        const data = await response.json()
        setBusiness({
          id: data.businessId,
          name: data.businessName,
        })
        setRole(data.role as BusinessRole)
        // Cache for future navigation
        setCachedBusiness(data.businessId, {
          name: data.businessName,
          role: data.role,
          isOwner: data.role === 'owner',
        })
      } catch (err) {
        console.error('Business access validation error:', err)
        setError('Failed to validate business access')
      } finally {
        setIsLoading(false)
      }
    }

    validateAccess()
  }, [businessId, user, authLoading, router, getCachedBusiness, setCachedBusiness])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = useMemo<BusinessContextType>(() => ({
    business,
    businessId: business?.id ?? null,
    role,
    isLoading: isLoading || authLoading,
    error,
    canManage: role === 'owner' || role === 'partner',
    isOwner: role === 'owner',
  }), [business, role, isLoading, authLoading, error])

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}

// ============================================
// HOOKS
// ============================================

export function useBusiness(): BusinessContextType {
  const context = useContext(BusinessContext)
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return context
}

/**
 * Optional version that returns null when outside BusinessProvider.
 * Useful for components that work in both hub and business contexts.
 */
export function useOptionalBusiness(): BusinessContextType | null {
  return useContext(BusinessContext)
}

/**
 * Get just the business ID (useful for API calls)
 */
export function useBusinessId(): string | null {
  const { businessId } = useBusiness()
  return businessId
}

/**
 * Get the business role
 */
export function useBusinessRole(): BusinessRole | null {
  const { role } = useBusiness()
  return role
}
