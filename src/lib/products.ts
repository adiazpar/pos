/**
 * Product-related constants and types for the productos page
 */

import type { ProductCategory, Product, Order, OrderItem, Provider } from '@/types'

// ============================================
// FILTER CONFIGURATION
// ============================================

/** Filter category type - now uses category IDs or special filters */
export type FilterCategory = 'all' | 'low_stock' | string

/**
 * Get filter config for a category
 * Now dynamically builds filter options based on actual categories
 */
export function getFilterLabel(filter: FilterCategory, categories: ProductCategory[]): string {
  if (filter === 'all') return 'All'
  if (filter === 'low_stock') return 'Low Stock'
  const category = categories.find(c => c.id === filter)
  return category?.name || 'Unknown'
}

// ============================================
// SORT OPTIONS
// ============================================

export type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'stock_asc', label: 'Stock (low to high)' },
  { value: 'stock_desc', label: 'Stock (high to low)' },
  { value: 'category', label: 'Category' },
]

// ============================================
// TAB TYPES
// ============================================

export type PageTab = 'products' | 'orders'

export const TAB_SUBTITLES: Record<PageTab, string> = {
  products: 'Manage your catalog',
  orders: 'Supplier orders',
}

// ============================================
// PRODUCT FILTER STATE
// ============================================

export interface ProductFilters {
  selectedFilter: FilterCategory
  sortBy: SortOption
}

// ============================================
// EXPANDED ORDER TYPE
// ============================================

/** Order with expanded relations for display */
export interface ExpandedOrder extends Order {
  expand?: {
    'order_items(order)'?: (OrderItem & {
      expand?: {
        product?: Product
      }
    })[]
    provider?: Provider
  }
}

// ============================================
// ORDER ITEM FOR FORM
// ============================================

export interface OrderFormItem {
  product: Product
  quantity: number
}

// ============================================
// ORDER STATUS FILTER
// ============================================

export type OrderStatusFilter = 'all' | 'pending' | 'received'
