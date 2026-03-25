'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS, PREFETCH_ROUTES } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { useNavbar } from '@/contexts/navbar-context'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref, setPendingHref } = useNavbar()

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      router.prefetch(item.href)
    })
    PREFETCH_ROUTES.forEach((route) => {
      router.prefetch(route)
    })
  }, [router])

  const handleClick = (href: string) => {
    if (href !== pathname) {
      setPendingHref(href)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/home" className="sidebar-brand">
          <Image
            src="/logo.png"
            alt="Feria POS"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="sidebar-brand-text">Feria POS</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isCurrentPath = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isPending = pendingHref === item.href
          // Only show current path as active if there's no pending navigation
          const isActive = isPending || (isCurrentPath && !pendingHref)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleClick(item.href)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="sidebar-nav-icon" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <UserMenu variant="sidebar" />
      </div>
    </aside>
  )
}
