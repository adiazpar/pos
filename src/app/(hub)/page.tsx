'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight, X } from 'lucide-react'
import { BusinessIcon, SearchIcon, FoodBeverageIcon, ServicesIcon, RetailIcon, WholesaleIcon, ManufacturingIcon, OtherBusinessIcon } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { Spinner } from '@/components/ui'

type BusinessType = 'food' | 'retail' | 'services' | 'wholesale' | 'manufacturing' | 'other'

interface Business {
  id: string
  name: string
  isOwner: boolean
  memberCount: number
  type: BusinessType | null
  icon: string | null
}

// Default emojis for each business type (fallback for types without custom icons)
const DEFAULT_TYPE_EMOJIS: Record<BusinessType, string> = {
  food: '🍽️',
  retail: '🛍️',
  services: '✂️',
  wholesale: '📦',
  manufacturing: '🏭',
  other: '💼',
}

// Custom icon components for business types (takes precedence over emojis)
const BUSINESS_TYPE_ICONS: Partial<Record<BusinessType, React.ComponentType<{ className?: string }>>> = {
  food: FoodBeverageIcon,
  retail: RetailIcon,
  services: ServicesIcon,
  wholesale: WholesaleIcon,
  manufacturing: ManufacturingIcon,
  other: OtherBusinessIcon,
}

/**
 * Hub page - Zone 2
 * Shows user's businesses or empty state
 * Action buttons are rendered by MobileNav in hub mode
 */
export default function HubPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { setPendingHref, setCachedBusinesses } = useNavbar()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    async function fetchBusinesses() {
      try {
        const res = await fetch('/api/businesses/list')
        if (res.ok) {
          const data = await res.json()
          const fetchedBusinesses = data.businesses || []
          setBusinesses(fetchedBusinesses)
          // Cache business data for instant display when entering a business
          setCachedBusinesses(fetchedBusinesses)
        }
      } catch (error) {
        console.error('Failed to fetch businesses:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBusinesses()
  }, [user, authLoading, router, setCachedBusinesses])

  const handleEnterBusiness = (businessId: string) => {
    const href = `/${businessId}/home`
    setPendingHref(href)
    router.push(href)
  }

  // Filter businesses based on search query (must be before early returns)
  const filteredBusinesses = useMemo(() => {
    if (!searchQuery.trim()) return businesses
    const query = searchQuery.toLowerCase().trim()
    return businesses.filter((b) => b.name.toLowerCase().includes(query))
  }, [businesses, searchQuery])

  const ownedBusinesses = filteredBusinesses.filter((b) => b.isOwner)
  const joinedBusinesses = filteredBusinesses.filter((b) => !b.isOwner)
  const hasBusinesses = businesses.length > 0
  const hasFilteredResults = filteredBusinesses.length > 0

  if (authLoading || isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  if (!hasBusinesses) {
    return (
      <main className="page-loading">
        <div className="empty-state-fill">
          <BusinessIcon className="empty-state-icon" />
          <h3 className="empty-state-title">No businesses yet</h3>
          <p className="empty-state-description">
            Create your own business or join an existing one with an invite code
          </p>
        </div>
      </main>
    )
  }

  const getBusinessIcon = (business: Business) => {
    const { icon, type } = business

    // If icon is a base64 image (uploaded logo)
    if (icon && icon.startsWith('data:')) {
      return (
        <Image
          src={icon}
          alt={business.name}
          width={48}
          height={48}
          className="w-full h-full object-cover rounded-xl"
          unoptimized
        />
      )
    }

    // If icon is an emoji (custom set by user)
    if (icon) {
      return <span className="text-2xl">{icon}</span>
    }

    // Use custom icon component for business type if available
    if (type && BUSINESS_TYPE_ICONS[type]) {
      const IconComponent = BUSINESS_TYPE_ICONS[type]
      return <IconComponent className="w-8 h-8 text-brand" />
    }

    // Fall back to default emoji for business type
    if (type && DEFAULT_TYPE_EMOJIS[type]) {
      return <span className="text-2xl">{DEFAULT_TYPE_EMOJIS[type]}</span>
    }

    // Ultimate fallback
    return <BusinessIcon className="w-6 h-6 text-brand" />
  }

  const renderBusinessItem = (business: Business) => (
    <div
      key={business.id}
      className="list-item-clickable list-item-flat"
      onClick={() => handleEnterBusiness(business.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleEnterBusiness(business.id)
        }
      }}
      tabIndex={0}
      role="button"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
        {getBusinessIcon(business)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium truncate block">{business.name}</span>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {business.memberCount} {business.memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )

  return (
    <main className="hub-content space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SearchIcon size={16} className="text-text-tertiary" />
        </div>
        <input
          type="text"
          placeholder="Search businesses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full"
          style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: '2.25rem', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* No search results */}
      {searchQuery && !hasFilteredResults && (
        <div className="text-center py-8 text-text-secondary">
          <p>No businesses found matching "{searchQuery}"</p>
        </div>
      )}

      {ownedBusinesses.length > 0 && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {ownedBusinesses.length === 1 ? 'Your Business' : 'Your Businesses'}
            </span>
          </div>
          <hr className="border-border" />
          <div className="space-y-2">
            {ownedBusinesses.map(renderBusinessItem)}
          </div>
        </div>
      )}

      {joinedBusinesses.length > 0 && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">
              {joinedBusinesses.length === 1 ? 'Joined Business' : 'Joined Businesses'}
            </span>
          </div>
          <hr className="border-border" />
          <div className="space-y-2">
            {joinedBusinesses.map(renderBusinessItem)}
          </div>
        </div>
      )}
    </main>
  )
}
