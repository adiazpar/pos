'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown } from 'lucide-react'
import { getRouteConfig, buildBusinessUrl } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { useNavbar } from '@/contexts/navbar-context'
import { useOptionalBusiness } from '@/contexts/business-context'

/**
 * Page header that works in both hub and business contexts.
 *
 * Hub context (no BusinessProvider):
 * - Left: Empty spacer
 * - Center: App name "Kasero"
 * - Right: User avatar menu
 *
 * Business context:
 * - Left: Back button (to hub for top-level pages, to parent for nested pages)
 * - Center: Business name (tappable switcher) + Page name as subtitle
 * - Right: User avatar menu
 */
export function PageHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = useNavbar()
  const businessContext = useOptionalBusiness()
  const [isScrolled, setIsScrolled] = useState(false)

  // Determine if we're in hub context (no business provider)
  const isHubContext = !businessContext
  const business = businessContext?.business ?? null
  const businessId = businessContext?.businessId ?? null

  // Some hub pages (like account) should show a back button
  const isHubPageWithBackButton = isHubContext && pathname === '/account'

  // Track scroll position to show shadow
  useEffect(() => {
    const scrollContainer = document.querySelector('.main-scroll-container')
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
  // - Hub pages with back button: use browser back
  // - If backTo is set (nested page), go to parent route within business
  // - Otherwise (top-level business page), go to hub
  const handleBack = () => {
    if (isHubPageWithBackButton) {
      // Hub pages like account: go back to previous page
      router.back()
    } else if (backTo && businessId) {
      // Build business-scoped URL for parent page
      router.push(buildBusinessUrl(businessId, backTo))
    } else {
      // Go to hub (business selector)
      router.push('/')
    }
  }

  // Navigate to hub to switch business
  const handleBusinessClick = () => {
    router.push('/')
  }

  return (
    <header className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''}`}>
      {/* Left column */}
      <div className="page-header__content">
        {(!isHubContext || isHubPageWithBackButton) && (
          <button
            type="button"
            onClick={handleBack}
            className="page-header__back"
            aria-label={isHubPageWithBackButton ? 'Go back' : backTo ? 'Go back' : 'Go to hub'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center column */}
      <div className="page-header__titles">
        {isHubContext ? (
          <div className="page-header__logo">
            <Image
              src="/kasero-logo-light.png"
              alt="Kasero"
              width={160}
              height={56}
              className="logo-light"
              priority
            />
            <Image
              src="/kasero-logo-dark.png"
              alt="Kasero"
              width={160}
              height={56}
              className="logo-dark"
              priority
            />
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBusinessClick}
              className="page-header__business-btn"
              aria-label="Switch business"
            >
              <h1 className="page-title">{business?.name || 'Loading...'}</h1>
              <ChevronDown className="page-header__business-chevron" />
            </button>
            {pageTitle && <p className="page-subtitle">{pageTitle}</p>}
          </>
        )}
      </div>

      {/* Right column - user menu */}
      <div className="page-header__actions">
        <UserMenu />
      </div>
    </header>
  )
}
