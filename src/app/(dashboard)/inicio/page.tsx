'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout'
import { Card } from '@/components/ui'
import {
  Sparkline,
  DonutChart,
  HorizontalBarChart,
} from '@/components/ui/charts'
import {
  IconSales,
  IconProducts,
  IconCashDrawer,
  IconPackage,
  IconArrowUp,
  IconArrowDown,
  IconCircleCheck,
  IconCircleX,
} from '@/components/icons'
import { formatCurrency, formatDate, formatTime, getGreeting } from '@/lib/utils'
import {
  INITIAL_STATS,
  WEEKLY_SALES,
  PAYMENT_BREAKDOWN,
  TOP_PRODUCTS,
} from '@/lib/mock-data'
import { useAuth } from '@/contexts/auth-context'
import type { Product } from '@/types'

export default function InicioPage() {
  const { user, pb } = useAuth()
  const [greeting, setGreeting] = useState(getGreeting())
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [cashDrawerStatus, setCashDrawerStatus] = useState<'open' | 'closed'>('open')
  const [products, setProducts] = useState<Product[]>([])

  // Load products for inventory stats
  useEffect(() => {
    if (!pb) return
    let cancelled = false

    async function loadProducts() {
      try {
        const records = await pb.collection('products').getFullList<Product>({
          sort: 'name',
          requestKey: null,
        })
        if (!cancelled) {
          setProducts(records)
        }
      } catch (err) {
        console.error('Error loading products:', err)
      }
    }

    loadProducts()
    return () => { cancelled = true }
  }, [pb])

  // Calculate inventory stats from real products
  const inventoryStats = useMemo(() => {
    const activeProducts = products.filter(p => p.active)
    const totalUnits = activeProducts.reduce((sum, p) => sum + (p.stock ?? 0), 0)
    const lowStockProducts = activeProducts.filter(p => {
      const stock = p.stock ?? 0
      const threshold = p.lowStockThreshold ?? 10
      return stock <= threshold
    }).map(p => ({
      name: p.name,
      stock: p.stock ?? 0,
      threshold: p.lowStockThreshold ?? 10,
    }))

    return {
      totalUnits,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    }
  }, [products])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setGreeting(getGreeting())
      setCurrentDate(formatDate(now))
      setCurrentTime(formatTime(now))
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleCashDrawerToggle = () => {
    // In a real app, this would call an API
    setCashDrawerStatus(prev => prev === 'open' ? 'closed' : 'open')
  }

  const salesChange =
    INITIAL_STATS.previousDaySales > 0
      ? ((INITIAL_STATS.todaySales - INITIAL_STATS.previousDaySales) /
          INITIAL_STATS.previousDaySales) *
        100
      : 0
  const isPositiveChange = salesChange >= 0
  const averageTicket = INITIAL_STATS.transactionCount > 0
    ? INITIAL_STATS.todaySales / INITIAL_STATS.transactionCount
    : 0

  return (
    <div className="page-wrapper">
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0] || ''}!`}
        subtitle={`${currentDate} - ${currentTime}`}
      />

      {/* Main content */}
      <main className="page-content">
        {/* Hero stat - big typography, no card wrapper */}
        <div className="mb-4 text-center">
          <p className="text-sm text-text-secondary uppercase tracking-wide">Ventas de Hoy</p>
          <p className="text-4xl font-display font-bold text-text-primary">{formatCurrency(INITIAL_STATS.todaySales)}</p>
          <div className={`flex items-center justify-center gap-1 mt-1 text-sm ${isPositiveChange ? 'text-success' : 'text-error'}`}>
            {isPositiveChange ? (
              <IconArrowUp className="w-4 h-4" />
            ) : (
              <IconArrowDown className="w-4 h-4" />
            )}
            <span>
              {Math.abs(salesChange).toFixed(1)}% vs ayer
            </span>
          </div>
        </div>

        {/* Prominent Nueva Venta Button */}
        <div className="mb-6">
          <Link href="/ventas" className="btn btn-primary btn-lg w-full text-lg gap-3">
            <IconSales className="w-6 h-6" />
            Nueva Venta
          </Link>
        </div>

        {/* Quick Actions - secondary actions grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link href="/caja" className="quick-action">
            <div className="quick-action-icon">
              <IconCashDrawer className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Ver Caja</span>
          </Link>

          <Link href="/productos" className="quick-action">
            <div className="quick-action-icon">
              <IconProducts className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Productos</span>
          </Link>

          <Link href="/productos" className="quick-action">
            <div className="quick-action-icon">
              <IconPackage className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Pedidos</span>
          </Link>
        </div>

        {/* Cash drawer status with action button */}
        <div className="flex flex-wrap items-center gap-3 p-4 mb-6 rounded-xl border border-border bg-bg-surface">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              cashDrawerStatus === 'open'
                ? 'bg-success-subtle text-success'
                : 'bg-error-subtle text-error'
            }`}
          >
            <IconCashDrawer className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="font-medium text-text-primary">Estado de Caja</p>
            <p className="text-sm text-text-secondary">
              {cashDrawerStatus === 'open' ? (
                <>
                  <span className="text-success font-medium">Abierta</span>
                  {' - '}
                  {formatCurrency(INITIAL_STATS.cashBalance)} en efectivo
                </>
              ) : (
                <span className="text-error font-medium">Cerrada</span>
              )}
            </p>
          </div>
          <button
            type="button"
            className={`btn btn-sm w-full sm:w-auto ${cashDrawerStatus === 'open' ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleCashDrawerToggle}
          >
            {cashDrawerStatus === 'open' ? (
              <>
                <IconCircleX className="w-4 h-4" />
                Cerrar Caja
              </>
            ) : (
              <>
                <IconCircleCheck className="w-4 h-4" />
                Abrir Caja
              </>
            )}
          </button>
        </div>

        {/* Two-column stats: Sales & Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Sales stats */}
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <p className="stats-label mb-3">Ventas de Hoy</p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-2xl font-display font-bold text-text-primary">
                  {INITIAL_STATS.transactionCount}
                </p>
                <p className="text-xs text-text-secondary">Transacciones</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center flex-1">
                <p className="text-2xl font-display font-bold text-text-primary">
                  {formatCurrency(averageTicket)}
                </p>
                <p className="text-xs text-text-secondary">Ticket Promedio</p>
              </div>
            </div>
          </div>

          {/* Inventory snapshot */}
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <p className="stats-label mb-3">Inventario</p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-2xl font-display font-bold text-text-primary">
                  {inventoryStats.totalUnits}
                </p>
                <p className="text-xs text-text-secondary">Unidades</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center flex-1">
                <p className={`text-2xl font-display font-bold ${inventoryStats.lowStockCount > 0 ? 'text-error' : 'text-text-primary'}`}>
                  {inventoryStats.lowStockCount}
                </p>
                <p className="text-xs text-text-secondary">Stock Bajo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low stock alerts (if any) */}
        {inventoryStats.lowStockCount > 0 && (
          <div className="p-4 mb-6 rounded-xl border border-error bg-error-subtle">
            <p className="font-medium text-error mb-1">Alerta de Stock Bajo</p>
            <ul className="text-sm text-text-secondary space-y-1">
              {inventoryStats.lowStockProducts.slice(0, 3).map((product, index) => (
                <li key={index}>
                  {product.name}: {product.stock} unidades (minimo: {product.threshold})
                </li>
              ))}
              {inventoryStats.lowStockProducts.length > 3 && (
                <li className="text-text-tertiary">
                  +{inventoryStats.lowStockProducts.length - 3} productos mas
                </li>
              )}
            </ul>
            <Link href="/productos" className="inline-block mt-2 text-sm font-medium text-brand hover:underline">
              Ver productos
            </Link>
          </div>
        )}

        {/* Summary section */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-text-primary">
            Resumen del Dia
          </h2>

          {/* Payment Methods - card with donut */}
          <Card variant="bordered">
            <div className="p-4">
              <p className="stats-label mb-4">Metodos de Pago</p>
              <div className="flex items-center gap-8">
                <DonutChart
                  segments={PAYMENT_BREAKDOWN}
                  size={120}
                  strokeWidth={18}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-text-tertiary">Total</p>
                    <p className="text-xs font-bold text-text-primary">
                      {formatCurrency(INITIAL_STATS.todaySales)}
                    </p>
                  </div>
                </DonutChart>
                <div className="flex-1 space-y-3">
                  {PAYMENT_BREAKDOWN.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-text-secondary">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Top Products - horizontal bars */}
          <Card variant="bordered">
            <div className="p-4">
              <p className="stats-label mb-4">Productos Mas Vendidos</p>
              <HorizontalBarChart
                data={TOP_PRODUCTS}
                showValues={true}
                formatValue={(v) => `${v} uds`}
                barHeight={20}
                gap={10}
              />
            </div>
          </Card>

          {/* Weekly trend - full width chart with axis labels */}
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <div className="flex items-center justify-between mb-4">
              <p className="stats-label">Tendencia Semanal</p>
              <span className="text-xs text-text-tertiary">Ultimos 7 dias</span>
            </div>
            <Sparkline
              data={WEEKLY_SALES}
              width={300}
              height={60}
              strokeColor="var(--color-brand)"
              fillColor="var(--color-brand)"
              strokeWidth={2}
              showFill={true}
            />
            <div className="flex justify-between mt-3 text-xs text-text-tertiary">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mie</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sab</span>
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
