'use client'

import { createContext, useContext, useEffect, useRef, ReactNode, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useJoinBusiness } from '@/hooks'
import { JoinBusinessModal } from '@/components/join'

interface JoinBusinessContextValue {
  openJoinModal: () => void
}

const JoinBusinessContext = createContext<JoinBusinessContextValue | null>(null)

export function useJoinBusinessModal(): JoinBusinessContextValue {
  const context = useContext(JoinBusinessContext)
  if (!context) {
    // Return a no-op if not in hub context (business pages don't have this provider)
    return { openJoinModal: () => {} }
  }
  return context
}

interface JoinBusinessProviderProps {
  children: ReactNode
}

/**
 * Inner component that handles the actual search params logic.
 * Must be wrapped in Suspense.
 */
function JoinBusinessProviderInner({ children }: JoinBusinessProviderProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const joinBusiness = useJoinBusiness()
  const hasHandledCode = useRef(false)

  // Handle QR code deep linking: ?code=ABC123
  useEffect(() => {
    const code = searchParams.get('code')

    if (code && !hasHandledCode.current) {
      hasHandledCode.current = true

      // Pre-fill and open modal
      joinBusiness.setCode(code.toUpperCase())
      joinBusiness.handleOpen()

      // Clear the code from URL to prevent re-triggering
      const url = new URL(window.location.href)
      url.searchParams.delete('code')
      router.replace(url.pathname + url.search, { scroll: false })

      // Auto-validate after a short delay (let modal render first)
      setTimeout(() => {
        joinBusiness.handleValidateCode()
      }, 100)
    }
  }, [searchParams, router, pathname, joinBusiness])

  // Reset the ref when modal closes so a new code param can trigger again
  useEffect(() => {
    if (!joinBusiness.isOpen) {
      hasHandledCode.current = false
    }
  }, [joinBusiness.isOpen])

  const value: JoinBusinessContextValue = {
    openJoinModal: joinBusiness.handleOpen,
  }

  return (
    <JoinBusinessContext.Provider value={value}>
      {children}
      <JoinBusinessModal joinBusiness={joinBusiness} />
    </JoinBusinessContext.Provider>
  )
}

/**
 * Provider for join business modal functionality.
 * Used in hub layout to allow MobileNav to open the join modal.
 *
 * Also handles QR code deep linking: if URL has ?code=ABC123,
 * automatically opens modal with pre-filled code and validates.
 */
export function JoinBusinessProvider({ children }: JoinBusinessProviderProps) {
  return (
    <Suspense fallback={children}>
      <JoinBusinessProviderInner>{children}</JoinBusinessProviderInner>
    </Suspense>
  )
}
