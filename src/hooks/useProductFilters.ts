/**
 * Hook for managing product filtering, searching, and sorting
 */

import { useState, useEffect, useMemo } from 'react'
import { PRODUCT_FILTERS_KEY } from '@/lib/constants'
import {
  CATEGORY_CONFIG,
  FILTER_CONFIG,
  type FilterCategory,
  type SortOption,
  type ProductFilters,
} from '@/lib/products'
import type { Product, ProductCategory } from '@/types'

// ============================================
// STORAGE FUNCTIONS
// ============================================

function loadProductFilters(): ProductFilters | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(PRODUCT_FILTERS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Invalid JSON, ignore
  }
  return null
}

function saveProductFilters(filters: ProductFilters): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRODUCT_FILTERS_KEY, JSON.stringify(filters))
}

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseProductFiltersOptions {
  products: Product[]
}

export interface UseProductFiltersReturn {
  // Search state
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Filter state
  selectedFilter: FilterCategory
  setSelectedFilter: (filter: FilterCategory) => void

  // Sort state
  sortBy: SortOption
  setSortBy: (sort: SortOption) => void

  // Derived data
  filteredProducts: Product[]
  availableFilters: Exclude<FilterCategory, 'all'>[]
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useProductFilters({ products }: UseProductFiltersOptions): UseProductFiltersReturn {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Filter state - load from localStorage on mount
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>(() => {
    const saved = loadProductFilters()
    return saved?.selectedFilter ?? 'all'
  })

  // Sort state - load from localStorage on mount
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = loadProductFilters()
    return saved?.sortBy ?? 'name_asc'
  })

  // Save filters to localStorage when they change
  useEffect(() => {
    saveProductFilters({ selectedFilter, sortBy })
  }, [selectedFilter, sortBy])

  // Get available filters based on products
  const availableFilters = useMemo(() => {
    const productCategories = new Set<ProductCategory>()

    products.forEach(p => {
      if (p.category) productCategories.add(p.category)
    })

    // Build filters array - always include low_stock first
    const filters: Exclude<FilterCategory, 'all'>[] = ['low_stock']

    // Add category filters
    for (const [filter, config] of Object.entries(FILTER_CONFIG) as [Exclude<FilterCategory, 'all' | 'low_stock'>, typeof FILTER_CONFIG[keyof typeof FILTER_CONFIG]][]) {
      if (config.categories.some(cat => productCategories.has(cat))) {
        filters.push(filter)
      }
    }
    return filters
  }, [products])

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let result = products

    // Filter by low stock (includes empty stock)
    if (selectedFilter === 'low_stock') {
      result = result.filter(p => {
        const stock = p.stock ?? 0
        const threshold = p.lowStockThreshold ?? 10
        return stock <= threshold
      })
    } else if (selectedFilter !== 'all') {
      // Filter by category
      const allowedCategories = FILTER_CONFIG[selectedFilter].categories
      result = result.filter(p => p.category && allowedCategories.includes(p.category))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query)
      )
    }

    // Sort by selected sort option
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'name_desc':
          return b.name.localeCompare(a.name)
        case 'price_asc':
          return a.price - b.price
        case 'price_desc':
          return b.price - a.price
        case 'stock_asc': {
          const stockA = a.stock ?? 0
          const stockB = b.stock ?? 0
          if (stockA !== stockB) return stockA - stockB
          return a.name.localeCompare(b.name)
        }
        case 'stock_desc': {
          const stockA = a.stock ?? 0
          const stockB = b.stock ?? 0
          if (stockA !== stockB) return stockB - stockA
          return a.name.localeCompare(b.name)
        }
        case 'category': {
          const catA = a.category ? CATEGORY_CONFIG[a.category]?.order ?? 99 : 99
          const catB = b.category ? CATEGORY_CONFIG[b.category]?.order ?? 99 : 99
          if (catA !== catB) return catA - catB
          return a.name.localeCompare(b.name)
        }
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }, [products, selectedFilter, searchQuery, sortBy])

  return {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    filteredProducts,
    availableFilters,
  }
}
