'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/navigation'
import { useNavbar } from '@/contexts/navbar-context'

export function MobileNav() {
  const pathname = usePathname()
  const { isVisible } = useNavbar()
  const navRef = useRef<HTMLElement>(null)

  // Local state to control the hidden class
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      // Use setTimeout to ensure we're in a new event loop tick
      // This guarantees the browser has painted the visible state
      const timeout = setTimeout(() => {
        setIsHidden(true)
      }, 0)
      return () => clearTimeout(timeout)
    } else {
      // When showing, immediately remove hidden class
      setIsHidden(false)
    }
  }, [isVisible])

  return (
    <nav
      ref={navRef}
      className={`mobile-nav ${isHidden ? 'mobile-nav--hidden' : ''}`}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
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
