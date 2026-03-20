/**
 * Product-related constants and types for the productos page
 */

import type { ProductCategory, Product, Order, OrderItem, Provider } from '@/types'

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_CONFIG: Record<ProductCategory, { label: string; size?: string; order: number }> = {
  chifles_grande: { label: 'Chifles Grande', size: '250g', order: 1 },
  chifles_chico: { label: 'Chifles Chico', size: '160g', order: 2 },
  miel: { label: 'Miel de Abeja', order: 3 },
  algarrobina: { label: 'Algarrobina', order: 4 },
  postres: { label: 'Postres', order: 5 },
}

// ============================================
// FILTER CONFIGURATION
// ============================================

/** Filter category type - combines chifles into one filter */
export type FilterCategory = 'all' | 'low_stock' | 'chifles' | 'miel' | 'algarrobina' | 'postres'

export const FILTER_CONFIG: Record<Exclude<FilterCategory, 'all' | 'low_stock'>, { label: string; categories: ProductCategory[] }> = {
  chifles: { label: 'Chifles', categories: ['chifles_grande', 'chifles_chico'] },
  miel: { label: 'Miel', categories: ['miel'] },
  algarrobina: { label: 'Algarrobina', categories: ['algarrobina'] },
  postres: { label: 'Postres', categories: ['postres'] },
}

// ============================================
// SORT OPTIONS
// ============================================

export type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Nombre (A-Z)' },
  { value: 'name_desc', label: 'Nombre (Z-A)' },
  { value: 'price_asc', label: 'Precio (menor a mayor)' },
  { value: 'price_desc', label: 'Precio (mayor a menor)' },
  { value: 'stock_asc', label: 'Stock (menor a mayor)' },
  { value: 'stock_desc', label: 'Stock (mayor a menor)' },
  { value: 'category', label: 'Categoria' },
]

// ============================================
// TAB TYPES
// ============================================

export type PageTab = 'productos' | 'pedidos'

export const TAB_SUBTITLES: Record<PageTab, string> = {
  productos: 'Gestiona tu catalogo',
  pedidos: 'Pedidos a proveedores',
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
