'use client'

import { memo } from 'react'
import Image from 'next/image'
import { X, Plus, ChevronUp, ChevronRight } from 'lucide-react'
import { TagsIcon, FilterIcon, SearchIcon, ImageAttachIcon } from '@/components/icons'
import { Modal } from '@/components/ui'
import { getProductIconUrl } from '@/lib/utils'
import { scrollToTop } from '@/lib/scroll'
import {
  SORT_OPTIONS,
  getFilterLabel,
  type FilterCategory,
  type SortOption,
} from '@/lib/products'
import type { Product, ProductCategory } from '@/types'

// ============================================
// PROPS INTERFACE
// ============================================

export interface ProductsTabProps {
  // Data
  products: Product[]
  filteredProducts: Product[]
  categories: ProductCategory[]
  availableFilters: string[]

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
  onOpenSettings: () => void

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
  categories,
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
  onOpenSettings,
  error,
  isModalOpen,
}: ProductsTabProps) {
  // Helper to get category name by ID
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return '-'
    const category = categories.find(c => c.id === categoryId)
    return category?.name || '-'
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
            {/* Search Bar + Sort & Filter Button */}
            <div className="flex gap-2 items-stretch">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <SearchIcon size={16} className="text-text-tertiary" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  className="input w-full"
                  style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: '2.25rem', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSortSheetOpenChange(true)}
                className="btn btn-secondary btn-icon flex-shrink-0"
                aria-label="Sort and filter"
              >
                <FilterIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Product List Card */}
            <div className="card p-4 space-y-4">
              {/* List Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                  </span>
                  <span className="text-text-tertiary">&#183;</span>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-sm text-brand hover:text-brand transition-colors"
                  >
                    Settings
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add
                </button>
              </div>

              <hr className="border-border" />

              {/* Product List */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <p>No products found matching that criteria</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <ProductListItem
                      key={product.id}
                      product={product}
                      categoryName={getCategoryName(product.categoryId)}
                      onEdit={onEditProduct}
                    />
                  ))}
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
                <ChevronUp className="w-4 h-4" />
                Back to top
              </button>
            )}
          </>
        )}

        {/* Empty state - no products at all */}
        {products.length === 0 && (
          <div className="empty-state-fill">
            <TagsIcon className="empty-state-icon" />
            <h3 className="empty-state-title">No products yet</h3>
            <p className="empty-state-description">
              Add your first product to start building your catalog
            </p>
            <button
              type="button"
              onClick={onAddProduct}
              className="btn btn-primary mt-4"
            >
              <Plus className="w-4 h-4" />
              Add product
            </button>
          </div>
        )}

      {/* Sort & Filter Modal */}
      <Modal
        isOpen={isSortSheetOpen}
        onClose={() => onSortSheetOpenChange(false)}
      >
        <Modal.Step title="Sort & Filter">
          {/* Sort Section */}
          <Modal.Item>
            <div className="space-y-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Sort by</span>
              <div className="space-y-1">
                {SORT_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSortChange(option.value)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
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
            </div>
          </Modal.Item>

          {/* Filter Section */}
          {availableFilters.length > 0 && (
            <Modal.Item>
              <div className="space-y-2">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Filter by category</span>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onFilterChange('all')}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                  >
                    <span className={selectedFilter === 'all' ? 'font-medium text-brand' : 'text-text-primary'}>
                      All
                    </span>
                    {selectedFilter === 'all' && (
                      <span className="w-5 h-5 text-brand">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </button>
                  {availableFilters.map(filter => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => onFilterChange(filter)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-bg-muted transition-colors"
                    >
                      <span className={selectedFilter === filter ? 'font-medium text-brand' : 'text-text-primary'}>
                        {getFilterLabel(filter, categories)}
                      </span>
                      {selectedFilter === filter && (
                        <span className="w-5 h-5 text-brand">
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Modal.Item>
          )}

          <Modal.Footer>
            <button
              type="button"
              onClick={() => onSortSheetOpenChange(false)}
              className="btn btn-primary flex-1"
            >
              Done
            </button>
          </Modal.Footer>
        </Modal.Step>
      </Modal>
    </div>
  )
}

// ============================================
// MEMOIZED LIST ITEM
// ============================================

interface ProductListItemProps {
  product: Product
  categoryName: string
  onEdit: (product: Product) => void
}

const ProductListItem = memo(function ProductListItem({
  product,
  categoryName,
  onEdit,
}: ProductListItemProps) {
  const iconUrl = getProductIconUrl(product)
  const stockValue = product.stock ?? 0
  const threshold = product.lowStockThreshold ?? 10
  const isLowStock = stockValue <= threshold

  return (
    <div
      className="list-item-clickable"
      onClick={() => onEdit(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(product)
        }
      }}
      tabIndex={0}
      role="button"
    >
      {/* Product Icon */}
      <div className="product-list-image">
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
          <ImageAttachIcon className="w-5 h-5 text-text-tertiary" />
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <span className={`font-medium truncate block ${product.status !== 'active' ? 'text-text-tertiary' : ''}`}>
          {product.name}
        </span>
        <span className="text-xs text-text-tertiary mt-0.5 block">
          {categoryName}
        </span>
      </div>

      {/* Price and Stock */}
      <div className="text-right">
        <span className={`font-medium block ${product.status !== 'active' ? 'text-text-tertiary' : 'text-text-primary'}`}>
          ${product.price.toFixed(2)}
        </span>
        <span className={`text-xs mt-0.5 block ${isLowStock && product.status === 'active' ? 'text-error' : 'text-text-tertiary'}`}>
          {stockValue} units
        </span>
      </div>

      {/* Chevron */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
})
