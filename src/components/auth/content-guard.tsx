'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { Spinner } from '@/components/ui'

/**
 * ContentGuard - Protects page content while allowing the layout shell to render.
 * Shows a spinner during auth loading.
 * Fades out content during navigation for smooth transitions.
 */
export function ContentGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { pendingHref } = useNavbar()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  // Show centered spinner while loading auth
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Waiting for redirect
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Fade out content during navigation, new page handles its own loading
  return (
    <div
      className="flex-1 flex flex-col transition-opacity duration-150"
      style={{ opacity: pendingHref ? 0 : 1 }}
    >
      {children}
    </div>
  )
}
