'use client'

import { Search, X, Plus, ArrowUp, Package, Warehouse, ChevronRight } from 'lucide-react'
import { Stagger } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
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
  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.with-sidebar')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="page-body space-y-4">
      <Stagger delayMs={80} maxDelayMs={300}>
        {error && !isModalOpen && (
          <div className="p-4 bg-error-subtle text-error rounded-lg">
            {error}
          </div>
        )}

        {/* No products yet - can't create orders */}
        {products.length === 0 ? (
          <div className="empty-state-fill">
            <Package className="empty-state-icon" />
            <h3 className="empty-state-title">No hay productos</h3>
            <p className="empty-state-description">
              Agrega productos primero para poder crear pedidos
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* Products exist but no orders yet */
          <div className="empty-state-fill">
            <Warehouse className="empty-state-icon" />
            <h3 className="empty-state-title">No hay pedidos</h3>
            <p className="empty-state-description">
              Registra tu primer pedido
            </p>
            <button
              type="button"
              onClick={onNewOrder}
              className="btn btn-primary mt-4"
            >
              Crear pedido
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
                placeholder="Buscar por proveedor o fecha..."
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

            {/* Status Filter Tabs */}
            <div className="filter-tabs">
              <button
                type="button"
                onClick={() => onStatusFilterChange('all')}
                className={`filter-tab ${statusFilter === 'all' ? 'filter-tab-active' : ''}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('pending')}
                className={`filter-tab ${statusFilter === 'pending' ? 'filter-tab-active' : ''}`}
              >
                Pendientes ({orders.filter(o => o.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => onStatusFilterChange('received')}
                className={`filter-tab ${statusFilter === 'received' ? 'filter-tab-active' : ''}`}
              >
                Recibidos ({orders.filter(o => o.status === 'received').length})
              </button>
            </div>

            {/* Orders List Card */}
            <div className="card p-4 space-y-4">
              {/* Count and New Order button */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
                </span>
                <button
                  type="button"
                  onClick={onNewOrder}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Pedido
                </button>
              </div>

              <hr className="border-border" />

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No se encontraron pedidos
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map((order) => {
                    const items = order.expand?.['order_items(order)'] || []
                    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
                    const isPending = order.status === 'pending'

                    return (
                      <div
                        key={order.id}
                        className="list-item-clickable list-item-flat"
                        onClick={() => onViewOrder(order)}
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
                              {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}
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
                            {isPending ? 'Pendiente' : 'Recibido'}
                          </span>
                        </div>

                        {/* Action indicator */}
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
            {filteredOrders.length > 5 && (
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
      </Stagger>
    </div>
  )
}
