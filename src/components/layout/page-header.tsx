'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getRouteConfig } from '@/lib/navigation'
import { UserMenu } from './user-menu'

/**
 * Simple page header that reads title/subtitle from route config.
 * No context or hooks needed - just reads the current pathname.
 */
export function PageHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const config = getRouteConfig(pathname)

  const { title, subtitle, backTo } = config

  const handleBack = () => {
    if (backTo) {
      router.push(backTo)
    }
  }

  // Don't render if no title
  if (!title) {
    return <header className="page-header page-header--fixed" />
  }

  return (
    <header className="page-header page-header--fixed">
      <div className={`page-header__content ${backTo ? 'page-header__content--with-back' : ''}`}>
        {backTo && (
          <button
            type="button"
            onClick={handleBack}
            className="page-header__back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
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
