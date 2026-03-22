'use client'

import Image from 'next/image'
import { Search, X, Filter, Plus, ArrowUp, Package, ChevronRight, ImageIcon } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { getProductIconUrl } from '@/lib/utils'
import {
  CATEGORY_CONFIG,
  FILTER_CONFIG,
  SORT_OPTIONS,
  type FilterCategory,
  type SortOption,
} from '@/lib/products'
import type { Product } from '@/types'

// ============================================
// PROPS INTERFACE
// ============================================

export interface ProductsTabProps {
  // Data
  products: Product[]
  filteredProducts: Product[]
  availableFilters: Exclude<FilterCategory, 'all'>[]

  // Search state
  searchQuery: string
  onSearchChange: (query: string) => void

  // Filter state
  selectedFilter: FilterCategory
  onFilterChange: (filter: FilterCategory) => void

  // Sort state
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void

  // Modal controls
  isSortSheetOpen: boolean
  onSortSheetOpenChange: (open: boolean) => void

  // Handlers
  onAddProduct: () => void
  onEditProduct: (product: Product) => void

  // Error state
  error?: string
  isModalOpen?: boolean
}

// ============================================
// COMPONENT
// ============================================

export function ProductsTab({
  products,
  filteredProducts,
  availableFilters,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  isSortSheetOpen,
  onSortSheetOpenChange,
  onAddProduct,
  onEditProduct,
  error,
  isModalOpen,
}: ProductsTabProps) {
  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.with-sidebar')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="page-body space-y-4">
      {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* Search, Filter, and List Header - only show when products exist */}
        {products.length > 0 && (
          <>
            {/* Search Bar with Sort Button */}
            <div className="flex gap-2">
              <div className="search-bar flex-1">
                <Search className="search-bar-icon" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="search-bar-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="search-bar-clear"
                    aria-label="Limpiar busqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSortSheetOpenChange(true)}
                className="btn btn-secondary btn-icon flex-shrink-0"
                aria-label="Ordenar productos"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            {availableFilters.length > 0 && (
              <div className="filter-tabs">
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className={`filter-tab ${selectedFilter === 'all' ? 'filter-tab-active' : ''}`}
                >
                  Todos
                </button>
                {availableFilters.map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => onFilterChange(filter)}
                    className={`filter-tab ${selectedFilter === filter ? 'filter-tab-active' : ''}`}
                  >
                    {filter === 'low_stock' ? 'Stock Bajo' : FILTER_CONFIG[filter].label}
                  </button>
                ))}
              </div>
            )}

            {/* Product List Card */}
            <div className="card p-4 space-y-4">
              {/* Product List Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                </span>
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              <hr className="border-border" />

              {/* Product List */}
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <Search className="empty-state-icon" />
                  <h3 className="empty-state-title">Sin resultados</h3>
                  <p className="empty-state-description">
                    No se encontraron productos con ese criterio
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const iconUrl = getProductIconUrl(product, '64x64')
                    const categoryConfig = product.category ? CATEGORY_CONFIG[product.category] : null
                    const stockValue = product.stock ?? 0
                    const threshold = product.lowStockThreshold ?? 10
                    const isLowStock = stockValue <= threshold

                    return (
                      <div
                        key={product.id}
                        className="list-item-clickable list-item-flat"
                        onClick={() => onEditProduct(product)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onEditProduct(product)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        {/* Product Icon */}
                        <div className={`product-list-image ${isLowStock && product.active ? 'ring-2 ring-error' : ''}`}>
                          {iconUrl ? (
                            <Image
                              src={iconUrl}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="product-list-image-img"
                              unoptimized
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-text-tertiary" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium truncate block ${!product.active ? 'text-text-tertiary' : ''}`}>
                            {product.name}
                          </span>
                          <span className="text-xs text-text-tertiary mt-0.5 block">
                            {categoryConfig ? categoryConfig.label : '-'}
                          </span>
                        </div>

                        {/* Price and Stock */}
                        <div className="text-right">
                          <span className={`font-medium block ${!product.active ? 'text-text-tertiary' : 'text-text-primary'}`}>
                            S/ {product.price.toFixed(2)}
                          </span>
                          <span className={`text-xs mt-0.5 block ${isLowStock && product.active ? 'text-error' : 'text-text-tertiary'}`}>
                            {stockValue} uds
                          </span>
                        </div>

                        {/* Chevron */}
                        <div className="text-text-tertiary ml-2">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Back to top button */}
            {filteredProducts.length > 5 && (
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                Volver arriba
              </button>
            )}
          </>
        )}

        {/* Empty state - no products at all */}
        {products.length === 0 && (
          <div className="empty-state-fill">
            <Package className="empty-state-icon" />
            <h3 className="empty-state-title">No hay productos</h3>
            <p className="empty-state-description">
              Agrega tu primer producto para comenzar
            </p>
            <button
              type="button"
              onClick={onAddProduct}
              className="btn btn-primary mt-4"
            >
              <Plus className="w-4 h-4" />
              Agregar producto
            </button>
          </div>
        )}

      {/* Sort bottom sheet */}
      <BottomSheet
        isOpen={isSortSheetOpen}
        onClose={() => onSortSheetOpenChange(false)}
        title="Ordenar por"
      >
        <div className="space-y-1">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSortChange(option.value)
                onSortSheetOpenChange(false)
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left hover:bg-bg-muted transition-colors"
            >
              <span className={sortBy === option.value ? 'font-medium text-brand' : 'text-text-primary'}>
                {option.label}
              </span>
              {sortBy === option.value && (
                <span className="w-5 h-5 text-brand">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
