import { HomeIcon, SalesIcon, CashIcon, TagsIcon, SettingsIcon } from '@/components/icons'
import type { ComponentType } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

// Reserved top-level paths that are not business IDs
const RESERVED_PATHS = ['login', 'register', 'account', 'join']

/**
 * Extract businessId from pathname if it's a business route.
 * Returns null for hub routes and reserved paths.
 */
export function getBusinessIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null
  const firstSegment = segments[0]
  if (RESERVED_PATHS.includes(firstSegment)) return null
  return firstSegment || null
}

/**
 * Navigation item templates (without businessId prefix)
 */
const NAV_ITEM_TEMPLATES = [
  { path: '/home', label: 'Home', icon: HomeIcon },
  { path: '/sales', label: 'Sales', icon: SalesIcon },
  { path: '/cash', label: 'Cash', icon: CashIcon },
  { path: '/products', label: 'Products', icon: TagsIcon },
  { path: '/manage', label: 'Manage', icon: SettingsIcon },
]

/**
 * Get navigation items with business-scoped URLs
 */
export function getNavItems(businessId: string): NavItem[] {
  return NAV_ITEM_TEMPLATES.map(item => ({
    href: `/${businessId}${item.path}`,
    label: item.label,
    icon: item.icon,
  }))
}

/**
 * Get prefetch routes for a business
 */
export function getPrefetchRoutes(businessId: string): string[] {
  return [
    '/account',
    `/${businessId}/team`,
    `/${businessId}/providers`,
    `/${businessId}/cash/history`,
  ]
}

/**
 * Route config for page headers
 * Maps pathname patterns to header content
 *
 * In the multi-business architecture:
 * - Header title = Business name (from BusinessContext)
 * - Header subtitle = Page name (from this config)
 * - backTo = Parent route for nested pages (relative path, businessId added dynamically)
 */
export interface RouteConfig {
  title?: string    // Main title (used for hub pages like Account)
  pageTitle: string // Displays as subtitle under business name or title
  backTo?: string   // Relative path (e.g., '/cash'), businessId prefix added dynamically
}

// Route configs keyed by the path segment after businessId
const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  'home': { pageTitle: 'Home' },
  'sales': { pageTitle: 'Sales' },
  'cash': { pageTitle: 'Cash Drawer' },
  'cash/history': { pageTitle: 'History', backTo: '/cash' },
  'products': { pageTitle: 'Products' },
  'manage': { pageTitle: 'Manage' },
  'team': { pageTitle: 'Team' },
  'providers': { pageTitle: 'Providers' },
}

// User-level routes (no businessId prefix)
// For hub pages with titles, title shows as main header, pageTitle as subtitle
const USER_ROUTE_CONFIGS: Record<string, RouteConfig> = {
  '/account': { title: 'Account', pageTitle: 'Settings' },
}

/**
 * Get route config for a pathname
 * Handles both business-scoped routes (/{businessId}/...) and user-level routes (/account)
 */
export function getRouteConfig(pathname: string): RouteConfig & { businessId?: string } {
  // Check user-level routes first
  if (USER_ROUTE_CONFIGS[pathname]) {
    return USER_ROUTE_CONFIGS[pathname]
  }

  // Parse business-scoped routes: /{businessId}/{rest}
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return { pageTitle: '' }
  }

  // First segment is businessId
  const businessId = segments[0]
  const routePath = segments.slice(1).join('/')

  // Look up route config
  const config = ROUTE_CONFIGS[routePath]
  if (config) {
    return { ...config, businessId }
  }

  // Try parent paths for nested routes
  const routeSegments = routePath.split('/')
  while (routeSegments.length > 0) {
    routeSegments.pop()
    const parentPath = routeSegments.join('/')
    if (ROUTE_CONFIGS[parentPath]) {
      return { ...ROUTE_CONFIGS[parentPath], businessId }
    }
  }

  return { pageTitle: '', businessId }
}

/**
 * Build a full URL with businessId prefix
 */
export function buildBusinessUrl(businessId: string, path: string): string {
  // Handle paths that already start with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${businessId}${cleanPath}`
}
