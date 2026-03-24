'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isVisible } = useNavbar()
  const navRef = useRef<HTMLElement>(null)

  // Optimistic active state for instant feedback
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Local state to control the hidden class
  const [isHidden, setIsHidden] = useState(false)

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      router.prefetch(item.href)
    })
  }, [router])

  // Clear pending state when pathname changes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        setIsHidden(true)
      }, 0)
      return () => clearTimeout(timeout)
    } else {
      setIsHidden(false)
    }
  }, [isVisible])

  const handleClick = (href: string) => {
    if (href !== pathname) {
      setPendingHref(href)
    }
  }

  return (
    <nav
      ref={navRef}
      className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
    >
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
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="mobile-nav-icon" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
