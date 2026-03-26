'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { getRouteConfig } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { useNavbar } from '@/contexts/navbar-context'

/**
 * Page header with business context and optimistic title updates.
 *
 * Structure:
 * - Left: Back button (to hub for top-level pages, to parent for nested pages)
 * - Center: Business name (tappable switcher) + Page name as subtitle
 * - Right: User avatar menu
 *
 * Uses pendingHref from context to show the target page title immediately on navigation.
 */
export function PageHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = useNavbar()
  const [isScrolled, setIsScrolled] = useState(false)

  // TODO: Get from BusinessContext once implemented
  const businessName = 'My Business'

  // Track scroll position to show shadow
  useEffect(() => {
    const scrollContainer = document.querySelector('.with-sidebar')
    if (!scrollContainer) return

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 0)
    }

    // Check initial scroll position
    handleScroll()

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // Use pending route config if navigating, otherwise current pathname
  const config = getRouteConfig(pendingHref || pathname)

  const { pageTitle, backTo } = config

  // Determine back button behavior:
  // - If backTo is set (nested page), go to parent route
  // - Otherwise (top-level business page), go to hub
  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    } else {
      // TODO: Navigate to hub once implemented
      // For now, this will be the hub route
      router.push('/')
    }
  }

  // TODO: Open business switcher dropdown/drawer
  const handleBusinessClick = () => {
    // Will be implemented with BusinessSwitcher component
    console.log('Business switcher clicked')
  }

  return (
    <header className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''}`}>
      {/* Left column - back button (always visible in business context) */}
      <div className="page-header__content">
        <button
          type="button"
          onClick={handleBack}
          className="page-header__back"
          aria-label={backTo ? 'Go back' : 'Go to hub'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Center column - business name (tappable) + page name */}
      <div className="page-header__titles">
        <button
          type="button"
          onClick={handleBusinessClick}
          className="page-header__business-btn"
          aria-label="Switch business"
        >
          <h1 className="page-title">{businessName}</h1>
          <ChevronDown className="page-header__business-chevron" />
        </button>
        {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
      </div>

      {/* Right column - user menu */}
      <div className="page-header__actions">
        <div className="lg:hidden">
          <UserMenu variant="mobile" />
        </div>
      </div>
    </header>
  )
}
