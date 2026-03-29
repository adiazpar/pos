'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PlusIcon } from '@/components/icons'
import { UserPlus } from 'lucide-react'
import { getNavItems, getPrefetchRoutes } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'
import { useOptionalBusiness } from '@/contexts/business-context'

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isVisible, pendingHref, setPendingHref } = useNavbar()
  const businessContext = useOptionalBusiness()
  const businessId = businessContext?.businessId ?? null
  const navRef = useRef<HTMLElement>(null)

  // Determine if we're in hub context (no business provider)
  const isHubContext = !businessContext

  // Local state to control the hidden class
  const [isHidden, setIsHidden] = useState(false)

  // Get nav items for current business
  const navItems = useMemo(() => {
    if (!businessId) return []
    return getNavItems(businessId)
  }, [businessId])

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    if (!businessId) return
    navItems.forEach((item) => {
      router.prefetch(item.href)
    })
    getPrefetchRoutes(businessId).forEach((route) => {
      router.prefetch(route)
    })
  }, [router, businessId, navItems])

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

  const handleCreateBusiness = () => {
    router.push('/business/new')
  }

  const handleJoinBusiness = () => {
    router.push('/join')
  }

  // Hub context: render action buttons (primary/secondary style)
  // Hide on /join page since it has its own actions
  if (isHubContext) {
    if (pathname === '/join') {
      return null
    }

    return (
      <nav
        ref={navRef}
        className={`mobile-nav mobile-nav--hub ${isHidden ? 'mobile-nav--hidden' : ''}`}
      >
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={handleCreateBusiness}
        >
          <PlusIcon size={24} />
          Create
        </button>
        <button
          type="button"
          className="btn btn-secondary flex-1"
          onClick={handleJoinBusiness}
        >
          <UserPlus className="w-6 h-6" />
          Join
        </button>
      </nav>
    )
  }

  // Business context: render nav items
  if (!businessId) return null

  return (
    <nav
      ref={navRef}
      className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
    >
      {navItems.map((item) => {
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
