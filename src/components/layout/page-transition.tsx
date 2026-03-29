'use client'

import { useNavbar } from '@/contexts/navbar-context'

/**
 * Simple fade wrapper for page transitions.
 * Fades out when navigation is pending, fades in when complete.
 * Use this for pages that don't need full ContentGuard (auth + business checks).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pendingHref } = useNavbar()

  return (
    <div
      className="flex-1 flex flex-col transition-opacity duration-150"
      style={{ opacity: pendingHref ? 0 : 1 }}
    >
      {children}
    </div>
  )
}
