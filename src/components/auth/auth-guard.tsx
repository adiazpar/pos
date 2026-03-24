'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { LoadingPage } from '@/components/ui'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

/**
 * AuthGuard - Protects routes based on authentication state.
 * Shows a loading spinner while checking auth, then renders children or redirects.
 */
export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo,
}: AuthGuardProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && !user) {
      router.replace(redirectTo || '/login')
    } else if (!requireAuth && user) {
      router.replace(redirectTo || '/home')
    }
  }, [user, isLoading, requireAuth, redirectTo, router])

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingPage />
  }

  // Waiting for redirect
  if (requireAuth && !user) {
    return <LoadingPage />
  }

  if (!requireAuth && user) {
    return <LoadingPage />
  }

  return <>{children}</>
}
