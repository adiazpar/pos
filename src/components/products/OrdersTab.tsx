'use client'

import { memo } from 'react'
import { Search, X, Plus, ArrowUp, Warehouse, ChevronRight } from 'lucide-react'
import { TagsIcon, SettingsIcon } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/utils'
import { scrollToTop } from '@/lib/scroll'
import type { Product } from '@/types'
import type { ExpandedOrder, OrderStatusFilter } from '@/lib/products'

// ============================================
// PROPS INTERFACE
// ============================================

export interface OrdersTabProps {
  // Data
  products: Product[]
  orders: ExpandedOrder[]
  filteredOrders: ExpandedOrder[]

  // Search state
  searchQuery: string
  onSearchChange: (query: string) => void

  // Filter state
  statusFilter: OrderStatusFilter
  onStatusFilterChange: (filter: OrderStatusFilter) => void

  // Handlers
  onNewOrder: () => void
  onViewOrder: (order: ExpandedOrder) => void

  // Error state
  error?: string
  isModalOpen?: boolean
}

// Re-export the type for convenience
export type { OrderStatusFilter } from '@/lib/products'

// ============================================
// COMPONENT
// ============================================

export function OrdersTab({
  products,
  orders,
  filteredOrders,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNewOrder,
  onViewOrder,
  error,
  isModalOpen,
}: OrdersTabProps) {
  return (
    <div className="page-body space-y-4">
      {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* No products and no orders - show empty state */}
        {products.length === 0 && orders.length === 0 ? (
          <div className="empty-state-fill">
            <TagsIcon className="empty-state-icon" />
            <h3 className="empty-state-title">No products yet</h3>
            <p className="empty-state-description">
              Add products to your catalog first, then you can start creating orders here
            </p>
            <button
              type="button"
              className="btn btn-secondary mt-4"
              onClick={() => {/* TODO: implement order settings */}}
            >
              <SettingsIcon className="w-4 h-4" />
              Order settings
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* Products exist but no orders yet */
          <div className="empty-state-fill">
            <Warehouse className="empty-state-icon" />
            <h3 className="empty-state-title">No orders</h3>
            <p className="empty-state-description">
              Record your first order
            </p>
            <button
              type="button"
              onClick={onNewOrder}
              className="btn btn-primary mt-4"
            >
              <Plus className="w-4 h-4" />
              Create order
            </button>
          </div>
        ) : (
          /* Orders exist - show search, filter, and list */
          <>
            {/* Search Bar */}
            <div className="search-bar">
              <Search className="search-bar-icon" />
              <input
                type="text"
                placeholder="Search by provider or date..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="search-bar-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="search-bar-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="filter-tabs">
              <button
                type="button"
                onClick={() => onStatusFilterChange('all')}
                className={`filter-tab ${statusFilter === 'all' ? 'filter-tab-active' : ''}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('pending')}
                className={`filter-tab ${statusFilter === 'pending' ? 'filter-tab-active' : ''}`}
              >
                Pending ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('received')}
                className={`filter-tab ${statusFilter === 'received' ? 'filter-tab-active' : ''}`}
              >
                Received ({orders.filter(o => o.status === 'received').length})
              </button>
            </div>

            {/* Orders List Card */}
            <div className="card p-4 space-y-4">
              {/* Count and New Order button */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </span>
                <button
                  type="button"
                  onClick={onNewOrder}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Order
                </button>
              </div>

              <hr className="border-border" />

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No orders found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map((order) => (
                    <OrderListItem
                      key={order.id}
                      order={order}
                      onView={onViewOrder}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Back to top button */}
            {filteredOrders.length > 5 && (
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                Back to top
              </button>
            )}
          </>
        )}
    </div>
  )
}

// ============================================
// MEMOIZED LIST ITEM
// ============================================

interface OrderListItemProps {
  order: ExpandedOrder
  onView: (order: ExpandedOrder) => void
}

const OrderListItem = memo(function OrderListItem({
  order,
  onView,
}: OrderListItemProps) {
  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const isPending = order.status === 'pending'

  return (
    <div
      className="list-item-clickable list-item-flat"
      onClick={() => onView(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(order)
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* Status indicator */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isPending
          ? 'bg-warning-subtle text-warning'
          : 'bg-success-subtle text-success'
      }`}>
        <Warehouse className="w-5 h-5" />
      </div>

      {/* Order info */}
      <div className="flex-1 min-w-0">
        <span className="font-medium block">
          {formatDate(new Date(order.date))}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-tertiary">
            {itemCount} {itemCount === 1 ? 'unit' : 'units'}
          </span>
          {order.expand?.provider && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-xs text-text-tertiary truncate">
                {order.expand.provider.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Total and Status */}
      <div className="text-right">
        <span className="font-medium block text-error">
          -{formatCurrency(order.total)}
        </span>
        <span className={`text-xs mt-0.5 block ${isPending ? 'text-warning' : 'text-success'}`}>
          {isPending ? 'Pending' : 'Received'}
        </span>
      </div>

      {/* Action indicator */}
      <div className="text-text-tertiary ml-2">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  )
})
