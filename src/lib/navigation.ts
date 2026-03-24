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
 * Navigation items for sidebar (desktop) and mobile bottom nav
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/cash', label: 'Cash', icon: Banknote },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]
