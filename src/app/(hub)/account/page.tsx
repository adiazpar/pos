'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'
import { getUserInitials } from '@/lib/auth'
import { useNavbar } from '@/contexts/navbar-context'

export default function AccountPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { hide, show } = useNavbar()

  // Hide navbar on mount, show on unmount
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <main className="page-content page-content--no-navbar space-y-6">
      {/* User Info Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-subtle flex items-center justify-center">
            <span className="text-xl font-bold text-brand">
              {getUserInitials(user.name)}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">{user.name}</h1>
            <p className="text-text-secondary">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="card p-6 text-center">
        <p className="text-text-secondary">
          Account settings coming soon.
        </p>
      </div>
    </main>
  )
}
