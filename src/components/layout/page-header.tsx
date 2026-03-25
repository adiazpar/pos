'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getRouteConfig } from '@/lib/navigation'
import { UserMenu } from './user-menu'
import { useNavbar } from '@/contexts/navbar-context'

/**
 * Page header with optimistic title updates.
 * Uses pendingHref from context to show the target page title immediately on navigation.
 */
export function PageHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { pendingHref } = useNavbar()
  const [isScrolled, setIsScrolled] = useState(false)

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

  const { title, subtitle, backTo } = config

  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    }
  }

  // Don't render if no title
  if (!title) {
    return <header className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''}`} />
  }

  return (
    <header className={`page-header page-header--fixed ${isScrolled ? 'page-header--scrolled' : ''}`}>
      <div className={`page-header__content ${backTo ? 'page-header__content--with-back' : ''}`}>
        {backTo && (
          <button
            type="button"
            onClick={handleBack}
            className="page-header__back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="page-header__titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <UserMenu variant="mobile" />
        </div>
      </div>
    </header>
  )
}
