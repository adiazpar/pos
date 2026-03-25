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
  '/settings',
  '/team',
  '/providers',
  '/cash/history',
]

/**
 * Route config for page headers
 * Maps pathname patterns to header content
 */
export interface RouteConfig {
  title: string
  subtitle: string
  backTo?: string // If set, shows back button that navigates here
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  '/home': { title: 'Home', subtitle: 'Main dashboard' },
  '/sales': { title: 'Sales', subtitle: 'Record sales' },
  '/cash': { title: 'Cash Drawer', subtitle: 'Cash control' },
  '/cash/history': { title: 'History', subtitle: 'Cash drawer sessions', backTo: '/cash' },
  '/products': { title: 'Products', subtitle: 'Manage your catalog' },
  '/reports': { title: 'Reports', subtitle: 'Sales analytics' },
  '/settings': { title: 'Settings', subtitle: 'Customize your experience' },
  '/team': { title: 'Team', subtitle: 'Manage your team' },
  '/providers': { title: 'Providers', subtitle: 'Manage your providers' },
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

  return { title: '', subtitle: '' }
}
