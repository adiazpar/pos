'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { getUserInitials, getRoleLabel, isPartnerOrOwner } from '@/lib/auth'
import { Users, LogOut, ChevronRight, Settings, Van } from 'lucide-react'

interface UserMenuContentProps {
  onAction?: () => void
  showHeader?: boolean
}

export function UserMenuContent({ onAction, showHeader = true }: UserMenuContentProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { setPendingHref } = useNavbar()

  const handleLogout = useCallback(() => {
    onAction?.()
    logout()
    router.push('/login')
  }, [logout, router, onAction])

  const handleLinkClick = useCallback((href: string) => {
    setPendingHref(href)
    onAction?.()
  }, [setPendingHref, onAction])

  if (!user) return null

  const canManageTeam = isPartnerOrOwner(user)

  return (
    <div className="user-menu-content">
      {/* User Info Header */}
      {showHeader && (
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {getUserInitials(user.name)}
          </div>
          <div className="user-menu-info">
            <div className="user-menu-name">{user.name}</div>
            <div className="user-menu-role">{getRoleLabel(user.role)}</div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="user-menu-items">
        {/* Team Management (owner/partner only) */}
        {canManageTeam && (
          <Link
            href="/team"
            className="user-menu-item"
            onClick={() => handleLinkClick('/team')}
          >
            <Users size={20} />
            <span>Team</span>
            <ChevronRight size={16} className="user-menu-item-arrow" />
          </Link>
        )}

        {/* Providers (owner/partner only) */}
        {canManageTeam && (
          <Link
            href="/providers"
            className="user-menu-item"
            onClick={() => handleLinkClick('/providers')}
          >
            <Van size={20} />
            <span>Providers</span>
            <ChevronRight size={16} className="user-menu-item-arrow" />
          </Link>
        )}

        {/* Settings */}
        <Link
          href="/settings"
          className="user-menu-item"
          onClick={() => handleLinkClick('/settings')}
        >
          <Settings size={20} />
          <span>Settings</span>
          <ChevronRight size={16} className="user-menu-item-arrow" />
        </Link>
      </div>

      {/* Divider */}
      <div className="user-menu-divider" />

      {/* Logout */}
      <div className="user-menu-items">
        <button
          type="button"
          className="user-menu-item user-menu-item-danger"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  )
}
