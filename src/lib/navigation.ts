import {
  Home,
  ShoppingCart,
  Package,
  Banknote,
  BarChart3,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

/**
 * Bottom navigation items
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/cash', label: 'Cash', icon: Banknote },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

/**
 * Additional routes to prefetch for instant navigation
 */
export const PREFETCH_ROUTES: string[] = [
  '/account',
  '/team',
  '/providers',
  '/cash/history',
]

/**
 * Route config for page headers
 * Maps pathname patterns to header content
 *
 * In the multi-business architecture:
 * - Header title = Business name (from BusinessContext)
 * - Header subtitle = Page name (from this config)
 * - backTo = Parent route for nested pages (back button goes here instead of hub)
 */
export interface RouteConfig {
  pageTitle: string // Displays as subtitle under business name
  backTo?: string   // If set, back button goes here instead of hub
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/home': { pageTitle: 'Home' },
  '/sales': { pageTitle: 'Sales' },
  '/cash': { pageTitle: 'Cash Drawer' },
  '/cash/history': { pageTitle: 'History', backTo: '/cash' },
  '/products': { pageTitle: 'Products' },
  '/reports': { pageTitle: 'Reports' },
  '/account': { pageTitle: 'Account Settings' },
  '/team': { pageTitle: 'Team' },
  '/providers': { pageTitle: 'Providers' },
}

/**
 * Get route config for a pathname
 * Falls back to a default if route not found
 */
export function getRouteConfig(pathname: string): RouteConfig {
  // Exact match first
  if (ROUTE_CONFIG[pathname]) {
    return ROUTE_CONFIG[pathname]
  }

  // Try parent paths for nested routes
  const segments = pathname.split('/').filter(Boolean)
  while (segments.length > 0) {
    segments.pop()
    const parentPath = '/' + segments.join('/')
    if (ROUTE_CONFIG[parentPath]) {
      return ROUTE_CONFIG[parentPath]
    }
  }

  return { pageTitle: '' }
}
