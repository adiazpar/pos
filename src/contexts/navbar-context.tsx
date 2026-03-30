'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const BUSINESS_CACHE_STORAGE_KEY = 'kasero_business_cache'

interface CachedBusiness {
  name: string
  role: string
  isOwner: boolean
}

interface NavbarContextValue {
  isVisible: boolean
  hide: () => void
  show: () => void
  // Navigation state for return animations
  isReturning: boolean
  setReturning: (value: boolean) => void
  // Optimistic navigation state - shared across nav components and header
  pendingHref: string | null
  setPendingHref: (href: string | null) => void
  // Business cache for instant display and access validation
  getCachedBusiness: (businessId: string) => CachedBusiness | null
  setCachedBusiness: (businessId: string, data: CachedBusiness) => void
  setCachedBusinesses: (businesses: Array<{ id: string; name: string; role: string; isOwner: boolean }>) => void
}

const NavbarContext = createContext<NavbarContextValue | null>(null)

export function useNavbar(): NavbarContextValue {
  const context = useContext(NavbarContext)
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider')
  }
  return context
}

interface NavbarProviderProps {
  children: ReactNode
}

export function NavbarProvider({ children }: NavbarProviderProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [isReturning, setIsReturning] = useState(false)
  const [pendingHref, setPendingHrefState] = useState<string | null>(null)

  // Business cache - use ref to avoid re-renders, initialize from sessionStorage
  const businessCacheRef = useRef<Record<string, CachedBusiness>>({})

  // Initialize cache from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(BUSINESS_CACHE_STORAGE_KEY)
      if (stored) {
        businessCacheRef.current = JSON.parse(stored)
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const hide = useCallback(() => setIsVisible(false), [])
  const show = useCallback(() => setIsVisible(true), [])
  const setReturning = useCallback((value: boolean) => setIsReturning(value), [])
  const setPendingHref = useCallback((href: string | null) => setPendingHrefState(href), [])

  // Business cache functions
  const getCachedBusiness = useCallback((businessId: string): CachedBusiness | null => {
    return businessCacheRef.current[businessId] || null
  }, [])

  const setCachedBusiness = useCallback((businessId: string, data: CachedBusiness) => {
    businessCacheRef.current[businessId] = data
    try {
      sessionStorage.setItem(BUSINESS_CACHE_STORAGE_KEY, JSON.stringify(businessCacheRef.current))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const setCachedBusinesses = useCallback((businesses: Array<{ id: string; name: string; role: string; isOwner: boolean }>) => {
    businesses.forEach(b => {
      businessCacheRef.current[b.id] = { name: b.name, role: b.role, isOwner: b.isOwner }
    })
    try {
      sessionStorage.setItem(BUSINESS_CACHE_STORAGE_KEY, JSON.stringify(businessCacheRef.current))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Clear pending state when pathname changes (navigation completed)
  useEffect(() => {
    setPendingHrefState(null)
  }, [pathname])

  return (
    <NavbarContext.Provider value={{
      isVisible, hide, show,
      isReturning, setReturning,
      pendingHref, setPendingHref,
      getCachedBusiness, setCachedBusiness, setCachedBusinesses,
    }}>
      {children}
    </NavbarContext.Provider>
  )
}
