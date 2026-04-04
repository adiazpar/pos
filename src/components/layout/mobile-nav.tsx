'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PlusIcon, JoinIcon } from '@/components/icons'
import { getNavItems, getPrefetchRoutes, getBusinessIdFromPath } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'
import { useOptionalBusiness } from '@/contexts/business-context'
import { useJoinBusinessModal } from '@/contexts/join-business-context'
import { useCreateBusinessModal } from '@/contexts/create-business-context'

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isVisible, pendingHref, setPendingHref } = useNavbar()
  const businessContext = useOptionalBusiness()
  const { openJoinModal } = useJoinBusinessModal()
  const { openCreateModal } = useCreateBusinessModal()
  const navRef = useRef<HTMLElement>(null)

  // Get businessId from pathname (immediate) for context detection
  // This prevents flicker while waiting for context API to load
  const businessIdFromPath = getBusinessIdFromPath(pathname)
  const businessId = businessContext?.businessId ?? businessIdFromPath

  // Determine if we're in hub context based on pathname
  const isHubContext = !businessIdFromPath

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
    openCreateModal()
  }

  const handleJoinBusiness = () => {
    openJoinModal()
  }

  // Fade out during cross-context navigation (hub <-> business)
  const isCrossContextNav = pendingHref && (
    (isHubContext && !pendingHref.startsWith('/account') && !pendingHref.startsWith('/join')) ||
    (!isHubContext && (pendingHref === '/' || pendingHref.startsWith('/account') || pendingHref.startsWith('/join')))
  )

  // Style for fading inner content during cross-context navigation
  const contentFadeStyle = {
    opacity: isCrossContextNav ? 0 : 1,
    transition: 'opacity 150ms ease-out',
  }

  // Hub context: render action buttons (primary/secondary style)
  if (isHubContext) {
    return (
      <nav
        ref={navRef}
        className={`mobile-nav mobile-nav--hub ${isHidden ? 'mobile-nav--hidden' : ''}`}
      >
        <div className="flex gap-3 w-full" style={contentFadeStyle}>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={handleCreateBusiness}
          >
            <PlusIcon />
            Create
          </button>
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={handleJoinBusiness}
          >
            <JoinIcon />
            Join
          </button>
        </div>
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
      <div className="flex w-full" style={contentFadeStyle}>
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
      </div>
    </nav>
  )
}
