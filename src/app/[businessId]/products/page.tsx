'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { fetchDeduped } from '@/lib/fetch'
import { useBusiness } from '@/contexts/business-context'
import { useAuth } from '@/contexts/auth-context'
import { useProductFilters, useProductSettings, createSessionCache, CACHE_KEYS } from '@/hooks'
import { Spinner } from '@/components/ui'
import {
  ProductsTab,
  OrdersTab,
  AddProductModal,
  EditProductModal,
  ProductSettingsModal,
  NewOrderModal,
  OrderDetailModal,
  type ProductFormData,
  type StockAdjustmentData,
} from '@/components/products'
import { ProductFormProvider, useProductForm } from '@/contexts/product-form-context'
import type { PipelineStep } from '@/hooks'
import {
  type PageTab,
  type ExpandedOrder,
  type OrderFormItem,
  type OrderStatusFilter,
  type SortOption,
} from '@/lib/products'
import { getProductIconUrl, formatDate } from '@/lib/utils'
import { useAiProductPipeline, useImageCompression } from '@/hooks'
import type { Product, Provider, SortPreference, ProductCategory } from '@/types'

// ============================================
// SESSION CACHE
// ============================================

function scopedCache<T>(key: string, businessId: string) {
  return createSessionCache<T>(`${key}_${businessId}`)
}

// ============================================
// PRODUCT MODAL WRAPPER
// Syncs pipeline state to context and populates form on edit
// ============================================

// ============================================
// ADD PRODUCT MODAL WRAPPER
// ============================================

interface AddProductModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  categories: ProductCategory[]
  pipelineState: {
    step: PipelineStep
    result?: { name: string; iconPreview: string; iconBlob: Blob } | null
    error?: string | null
  }
  isCompressing: boolean
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
  defaultCategoryId?: string | null
}

function AddProductModalWrapper({
  isOpen,
  onClose,
  categories,
  pipelineState,
  isCompressing,
  onSubmit,
  onAbortAiProcessing,
  onPipelineReset,
  onAiPhotoCapture,
  onOpenSettings,
  defaultCategoryId,
}: AddProductModalWrapperProps) {
  const pendingActionRef = useRef<(() => void) | null>(null)
  const {
    setPipelineStep,
    setIsCompressing,
    setName,
    setIconPreview,
    setGeneratedIconBlob,
    setError,
    resetForm,
  } = useProductForm()

  useEffect(() => {
    setPipelineStep(pipelineState.step)
  }, [pipelineState.step, setPipelineStep])

  useEffect(() => {
    setIsCompressing(isCompressing)
  }, [isCompressing, setIsCompressing])

  useEffect(() => {
    if (pipelineState.step === 'complete' && pipelineState.result) {
      const result = pipelineState.result
      setName(result.name)
      setIconPreview(result.iconPreview)
      setGeneratedIconBlob(result.iconBlob)
    }
  }, [pipelineState.step, pipelineState.result, setName, setIconPreview, setGeneratedIconBlob])

  useEffect(() => {
    if (pipelineState.step === 'error' && pipelineState.error) {
      setError(pipelineState.error)
    }
  }, [pipelineState.step, pipelineState.error, setError])

  const handleExitComplete = useCallback(() => {
    resetForm(defaultCategoryId)
    if (pendingActionRef.current) {
      pendingActionRef.current()
      pendingActionRef.current = null
    }
  }, [resetForm, defaultCategoryId])

  const handleOpenSettings = useCallback(() => {
    pendingActionRef.current = onOpenSettings
    onClose()
  }, [onOpenSettings, onClose])

  return (
    <AddProductModal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={handleExitComplete}
      categories={categories}
      onSubmit={onSubmit}
      onAbortAiProcessing={onAbortAiProcessing}
      onPipelineReset={onPipelineReset}
      onAiPhotoCapture={onAiPhotoCapture}
      onOpenSettings={handleOpenSettings}
    />
  )
}

// ============================================
// EDIT PRODUCT MODAL WRAPPER
// ============================================

interface EditProductModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  onExitCleanup: () => void
  categories: ProductCategory[]
  editingProduct: Product | null
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onDelete: (productId: string) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
  defaultCategoryId?: string | null
}

function EditProductModalWrapper({
  isOpen,
  onClose,
  onExitCleanup,
  categories,
  editingProduct,
  onSubmit,
  onDelete,
  onSaveAdjustment,
  canDelete,
  defaultCategoryId,
}: EditProductModalWrapperProps) {
  const { populateFromProduct, resetForm } = useProductForm()

  // Populate form when modal opens with a product
  useEffect(() => {
    if (isOpen && editingProduct) {
      populateFromProduct(editingProduct, getProductIconUrl)
    }
  }, [isOpen, editingProduct, populateFromProduct])

  const handleExitComplete = useCallback(() => {
    resetForm(defaultCategoryId)
    onExitCleanup()
  }, [resetForm, defaultCategoryId, onExitCleanup])

  return (
    <EditProductModal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={handleExitComplete}
      categories={categories}
      onSubmit={onSubmit}
      onDelete={onDelete}
      onSaveAdjustment={onSaveAdjustment}
      canDelete={canDelete}
    />
  )
}

export default function ProductosPage() {
  const { user } = useAuth()
  const { canManage, businessId } = useBusiness()

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>('products')

  // Business-scoped caches
  const bid = businessId || ''
  const productsCache = useMemo(() => scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid), [bid])
  const providersCache = useMemo(() => scopedCache<Provider[]>(CACHE_KEYS.PROVIDERS, bid), [bid])
  const ordersCache = useMemo(() => scopedCache<ExpandedOrder[]>(CACHE_KEYS.ORDERS, bid), [bid])

  // Data state - initialize from cache
  const [products, setProductsState] = useState<Product[]>(() => scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid).get() || [])
  const [orders, setOrdersState] = useState<ExpandedOrder[]>(() => scopedCache<ExpandedOrder[]>(CACHE_KEYS.ORDERS, bid).get() || [])
  const [providers, setProvidersState] = useState<Provider[]>(() => scopedCache<Provider[]>(CACHE_KEYS.PROVIDERS, bid).get() || [])
  const [isLoading, setIsLoading] = useState(() => !scopedCache<Product[]>(CACHE_KEYS.PRODUCTS, bid).get())
  const [error, setError] = useState('')

  // Wrapper functions that update both state and cache
  const setProducts = useCallback((updater: Product[] | ((prev: Product[]) => Product[])) => {
    setProductsState(prev => {
      const newProducts = typeof updater === 'function' ? updater(prev) : updater
      productsCache.set(newProducts)
      return newProducts
    })
  }, [productsCache])

  const setProviders = useCallback((updater: Provider[] | ((prev: Provider[]) => Provider[])) => {
    setProvidersState(prev => {
      const newProviders = typeof updater === 'function' ? updater(prev) : updater
      providersCache.set(newProviders)
      return newProviders
    })
  }, [providersCache])

  const setOrders = useCallback((updater: ExpandedOrder[] | ((prev: ExpandedOrder[]) => ExpandedOrder[])) => {
    setOrdersState(prev => {
      const newOrders = typeof updater === 'function' ? updater(prev) : updater
      ordersCache.set(newOrders)
      return newOrders
    })
  }, [ordersCache])

  // Product settings
  const productSettings = useProductSettings({ businessId: businessId || '' })
  const {
    categories,
    settings,
    createCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    isCreating: isCreatingCategory,
    isUpdating: isUpdatingCategory,
    isDeleting: isDeletingCategory,
    isSavingSettings,
    error: settingsError,
    clearError: clearSettingsError,
  } = productSettings

  // Handler to update sort preference in settings
  const handleSortChange = useCallback(async (sort: SortOption) => {
    await updateSettings({ sortPreference: sort as SortPreference })
  }, [updateSettings])

  // Product filters
  const {
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    filteredProducts,
    availableFilters,
  } = useProductFilters({
    products,
    categories,
    sortPreference: settings?.sortPreference,
    onSortChange: handleSortChange,
  })

  // Sort sheet state
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false)

  // Product settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Product modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // AI Pipeline (needed by page for photo capture handler)
  const pipeline = useAiProductPipeline()
  const compression = useImageCompression()

  // Order modal states
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<ExpandedOrder | null>(null)

  // Order form state
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([])
  const [orderTotal, setOrderTotal] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderEstimatedArrival, setOrderEstimatedArrival] = useState('')
  const [orderReceiptFile, setOrderReceiptFile] = useState<File | null>(null)
  const [orderReceiptPreview, setOrderReceiptPreview] = useState<string | null>(null)
  const [orderProvider, setOrderProvider] = useState('')
  const [orderProductSearchQuery, setOrderProductSearchQuery] = useState('')

  // Order search/filter state
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all')

  // Order operation states
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [orderReceived, setOrderReceived] = useState(false)
  const [orderDeleted, setOrderDeleted] = useState(false)
  const [editOrderSaved, setEditOrderSaved] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})

  // Permission check
  // Use role from BusinessContext for business-specific permissions
  const canDelete = canManage

  // Track if orders have been loaded (check cache on init)
  const [ordersLoaded, setOrdersLoaded] = useState(() => !!scopedCache<ExpandedOrder[]>(CACHE_KEYS.ORDERS, bid).get())

  // Load products and providers on mount if not cached
  useEffect(() => {
    // If we have cached data, skip the API calls
    const cachedProducts = productsCache.get()
    const cachedProviders = providersCache.get()

    if (cachedProducts && cachedProviders) {
      // Data already loaded from cache in useState
      return
    }

    let cancelled = false

    async function loadInitialData() {
      try {
        // Only fetch what we don't have cached
        const promises: Promise<Response>[] = []
        const fetchProducts = !cachedProducts
        const fetchProviders = !cachedProviders

        if (fetchProducts) promises.push(fetchDeduped(`/api/businesses/${businessId}/products`))
        if (fetchProviders) promises.push(fetchDeduped(`/api/businesses/${businessId}/providers?active=true`))

        const responses = await Promise.all(promises)
        const dataPromises = responses.map(r => r.json())
        const results = await Promise.all(dataPromises)

        if (cancelled) return

        let idx = 0
        if (fetchProducts && responses[idx].ok && results[idx].success) {
          setProducts(results[idx].products)
          idx++
        }
        if (fetchProviders && responses[idx]?.ok && results[idx]?.success) {
          setProviders(results[idx].providers)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading data:', err)
        setError('Failed to load data')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()
    return () => { cancelled = true }
  }, [businessId, setProducts, setProviders])

  // Lazy load orders when switching to orders tab
  useEffect(() => {
    if (activeTab !== 'orders' || ordersLoaded) return

    let cancelled = false

    async function loadOrders() {
      try {
        const response = await fetchDeduped(`/api/businesses/${businessId}/orders`)
        const data = await response.json()

        if (cancelled) return

        if (response.ok && data.success) {
          setOrders(data.orders)
          setOrdersLoaded(true)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error loading orders:', err)
      }
    }

    loadOrders()
    return () => { cancelled = true }
  }, [activeTab, businessId, ordersLoaded, setOrders])

  // Track which product is being edited (for passing to modal wrapper)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Filtered products for order selection
  const orderFilteredProducts = useMemo(() => {
    if (!orderProductSearchQuery.trim()) return products.filter(p => p.status === 'active')
    const query = orderProductSearchQuery.toLowerCase()
    return products.filter(p => p.status === 'active' && p.name.toLowerCase().includes(query))
  }, [products, orderProductSearchQuery])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders

    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.status === orderStatusFilter)
    }

    if (orderSearchQuery.trim()) {
      const query = orderSearchQuery.toLowerCase()
      result = result.filter(o => {
        const providerName = o.expand?.provider?.name?.toLowerCase() || ''
        const dateStr = formatDate(new Date(o.date)).toLowerCase()
        return providerName.includes(query) || dateStr.includes(query)
      })
    }

    return result
  }, [orders, orderStatusFilter, orderSearchQuery])

  // Product handlers - now receive data from modal context
  const handleSubmitProduct = useCallback(async (
    formData: ProductFormData,
    editingProductId: string | null
  ): Promise<boolean> => {
    if (!formData.name.trim()) {
      return false
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      return false
    }

    try {
      const data = new FormData()
      data.append('name', formData.name.trim())
      data.append('price', priceNum.toString())
      data.append('categoryId', formData.categoryId || '')
      data.append('active', formData.active.toString())
      if (formData.generatedIconBlob) {
        data.append('icon', formData.generatedIconBlob, 'icon.png')
      }

      const url = editingProductId
        ? `/api/businesses/${businessId}/products/${editingProductId}`
        : `/api/businesses/${businessId}/products`
      const method = editingProductId ? 'PATCH' : 'POST'

      const response = await fetch(url, { method, body: data })
      const result = await response.json()

      if (!response.ok || !result.success) {
        return false
      }

      const record: Product = result.product
      if (editingProductId) {
        setProducts(prev => prev.map(p => p.id === record.id ? record : p))
      } else {
        setProducts(prev => [...prev, record].sort((a, b) => a.name.localeCompare(b.name)))
      }

      return true
    } catch (err) {
      console.error('Error saving product:', err)
      return false
    }
  }, [businessId, setProducts])

  const handleDeleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/products/${productId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        return false
      }

      setProducts(prev => prev.filter(p => p.id !== productId))
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      return false
    }
  }, [businessId, setProducts])

  const handleSaveAdjustment = useCallback(async (data: StockAdjustmentData) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/products/${data.productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: data.newStockValue }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        return
      }

      setProducts(prev => prev.map(p => p.id === data.productId ? { ...p, stock: data.newStockValue } : p))
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error adjusting stock:', err)
    }
  }, [businessId, setProducts])

  const handleCloseModal = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.cancel()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setIsModalOpen(false)
  }, [pipeline, compression])

  const handleOpenAdd = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setEditingProduct(null)
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleOpenEdit = useCallback((product: Product) => {
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setEditingProduct(product)
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleAiPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const compressedBase64 = await compression.compressImage(file)

    if (compression.state.error || !compressedBase64) {
      return
    }

    await pipeline.startPipeline(compressedBase64)
  }, [compression, pipeline])

  // Order handlers
  const resetOrderForm = useCallback(() => {
    setOrderItems([])
    setOrderTotal('')
    setOrderNotes('')
    setOrderEstimatedArrival('')
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProvider('')
    setOrderProductSearchQuery('')
    setError('')
    setOrderSaved(false)
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
  }, [])

  const handleToggleProductInOrder = useCallback((product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) return prev.filter(item => item.product.id !== product.id)
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const handleUpdateOrderItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return
    setOrderItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ))
  }, [])

  const handleSaveOrder = useCallback(async (): Promise<boolean> => {
    if (orderItems.length === 0) {
      setError('Add at least one product')
      return false
    }

    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Enter the total paid')
      return false
    }

    setIsSavingOrder(true)
    setError('')
    setOrderSaved(true)

    const formData = new FormData()
    formData.append('date', new Date().toISOString())
    formData.append('total', totalNum.toString())
    formData.append('status', 'pending')
    if (orderNotes.trim()) formData.append('notes', orderNotes.trim())
    if (orderEstimatedArrival) formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
    if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
    if (orderProvider) formData.append('providerId', orderProvider)
    formData.append('items', JSON.stringify(orderItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
    }))))

    // Fire and forget — append new order when API responds
    fetch(`/api/businesses/${businessId}/orders`, {
      method: 'POST',
      body: formData,
    }).then(async (response) => {
      const data = await response.json()
      if (response.ok && data.success && data.order) {
        setOrders(prev => [data.order, ...prev])
      }
    }).catch(err => {
      console.error('Error saving order:', err)
    }).finally(() => {
      setIsSavingOrder(false)
    })

    return true
  }, [businessId, orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, setOrders])

  const handleSaveEditOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false
    if (orderItems.length === 0) {
      setError('Add at least one product')
      return false
    }

    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Enter the total paid')
      return false
    }

    setIsSavingOrder(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('total', totalNum.toString())
      formData.append('notes', orderNotes.trim() || '')
      if (orderEstimatedArrival) {
        formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
      }
      if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
      formData.append('providerId', orderProvider || '')
      formData.append('items', JSON.stringify(orderItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
      }))))

      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}`, {
        method: 'PATCH',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to save order')
        return false
      }

      // Reload orders
      const ordersResponse = await fetchDeduped(`/api/businesses/${businessId}/orders`)
      const ordersData = await ordersResponse.json()

      if (ordersResponse.ok && ordersData.success) {
        setOrders(ordersData.orders)
      }

      setEditOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Failed to save order')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [businessId, orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, viewingOrder, setOrders])

  const handleReceiveOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder || !user) return false

    setIsReceiving(true)
    setError('')

    try {
      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivedQuantities }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to receive order')
        return false
      }

      // Reload products and orders
      const [productsRes, ordersRes] = await Promise.all([
        fetchDeduped(`/api/businesses/${businessId}/products`),
        fetchDeduped(`/api/businesses/${businessId}/orders`),
      ])

      const [productsData, ordersData] = await Promise.all([
        productsRes.json(),
        ordersRes.json(),
      ])

      if (productsRes.ok && productsData.success) {
        setProducts(productsData.products)
      }
      if (ordersRes.ok && ordersData.success) {
        setOrders(ordersData.orders)
      }

      setOrderReceived(true)
      return true
    } catch (err) {
      console.error('Error receiving order:', err)
      setError('Failed to receive order')
      return false
    } finally {
      setIsReceiving(false)
    }
  }, [businessId, viewingOrder, user, receivedQuantities, setProducts, setOrders])

  const handleDeleteOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false

    setIsDeletingOrder(true)
    setError('')

    try {
      const response = await fetch(`/api/businesses/${businessId}/orders/${viewingOrder.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete order')
        return false
      }

      setOrders(prev => prev.filter(o => o.id !== viewingOrder.id))
      setOrderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting order:', err)
      setError('Failed to delete order')
      return false
    } finally {
      setIsDeletingOrder(false)
    }
  }, [businessId, viewingOrder, setOrders])

  const initializeReceiveQuantities = useCallback((order: ExpandedOrder) => {
    const items = order.expand?.['order_items(order)'] || []
    const initialQuantities: Record<string, number> = {}
    for (const item of items) {
      initialQuantities[item.id] = item.quantity
    }
    setReceivedQuantities(initialQuantities)
  }, [])

  const initializeEditForm = useCallback((order: ExpandedOrder) => {
    const items = order.expand?.['order_items(order)'] || []
    const formItems = items.map(item => ({
      product: item.expand?.product as Product,
      quantity: item.quantity,
    })).filter(item => item.product)
    setOrderItems(formItems as OrderFormItem[])
    setOrderTotal(order.total.toString())
    setOrderNotes(order.notes || '')
    setOrderEstimatedArrival(order.estimatedArrival ? new Date(order.estimatedArrival).toISOString().split('T')[0] : '')
    setOrderProvider(order.providerId || '')
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProductSearchQuery('')
    setError('')
    setEditOrderSaved(false)
  }, [])

  const getOrderReceiptUrl = useCallback((order: ExpandedOrder): string | null => {
    if (!order.receipt) return null
    // When using Drizzle/Turso, receipts will be stored differently
    // For now, return the receipt field directly if it's a URL
    return order.receipt
  }, [])

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-4">
        {/* Section Tabs */}
        <div className="section-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`section-tab ${activeTab === 'products' ? 'section-tab-active' : ''}`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`section-tab ${activeTab === 'orders' ? 'section-tab-active' : ''}`}
          >
            Orders
          </button>
        </div>

        {activeTab === 'products' ? (
          <ProductsTab
            products={products}
            filteredProducts={filteredProducts}
            categories={categories}
            availableFilters={availableFilters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isSortSheetOpen={isSortSheetOpen}
            onSortSheetOpenChange={setIsSortSheetOpen}
            onAddProduct={handleOpenAdd}
            onEditProduct={handleOpenEdit}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            error={error}
            isModalOpen={isModalOpen}
          />
        ) : (
          <OrdersTab
            products={products}
            orders={orders}
            filteredOrders={filteredOrders}
            searchQuery={orderSearchQuery}
            onSearchChange={setOrderSearchQuery}
            statusFilter={orderStatusFilter}
            onStatusFilterChange={setOrderStatusFilter}
            onNewOrder={() => {
              resetOrderForm()
              setIsOrderModalOpen(true)
            }}
            onViewOrder={(order) => {
              setViewingOrder(order)
              setOrderReceived(false)
              setOrderDeleted(false)
              setEditOrderSaved(false)
              setIsOrderDetailModalOpen(true)
            }}
            error={error}
            isModalOpen={isOrderModalOpen}
          />
        )}
      </main>

      {/* Product Modals - shared form context, only one open at a time */}
      <ProductFormProvider defaultCategoryId={settings?.defaultCategoryId}>
        <AddProductModalWrapper
          isOpen={isModalOpen && !editingProduct}
          onClose={handleCloseModal}
          categories={categories}
          pipelineState={pipeline.state}
          isCompressing={compression.state.isProcessing}
          onSubmit={handleSubmitProduct}
          onAbortAiProcessing={() => {
            pipeline.cancel()
            compression.cancel()
          }}
          onPipelineReset={() => pipeline.reset()}
          onAiPhotoCapture={handleAiPhotoCapture}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          defaultCategoryId={settings?.defaultCategoryId}
        />
        <EditProductModalWrapper
          isOpen={isModalOpen && !!editingProduct}
          onClose={handleCloseModal}
          onExitCleanup={() => setEditingProduct(null)}
          categories={categories}
          editingProduct={editingProduct}
          onSubmit={handleSubmitProduct}
          onDelete={handleDeleteProduct}
          onSaveAdjustment={handleSaveAdjustment}
          canDelete={canDelete}
          defaultCategoryId={settings?.defaultCategoryId}
        />
      </ProductFormProvider>

      {/* Product Settings Modal */}
      <ProductSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        categories={categories}
        isCreatingCategory={isCreatingCategory}
        isUpdatingCategory={isUpdatingCategory}
        isDeletingCategory={isDeletingCategory}
        onCreateCategory={createCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={async (id: string) => {
          const success = await deleteCategory(id)
          if (success) {
            setProducts(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: null } : p))
          }
          return success
        }}
        defaultCategoryId={settings?.defaultCategoryId || null}
        sortPreference={settings?.sortPreference || 'name_asc'}
        isSavingSettings={isSavingSettings}
        onUpdateSettings={updateSettings}
        error={settingsError}
        onClearError={clearSettingsError}
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        providers={providers}
        filteredProducts={orderFilteredProducts}
        orderItems={orderItems}
        onToggleProduct={handleToggleProductInOrder}
        onUpdateQuantity={handleUpdateOrderItemQuantity}
        setOrderItems={setOrderItems}
        orderTotal={orderTotal}
        onOrderTotalChange={setOrderTotal}
        orderNotes={orderNotes}
        onOrderNotesChange={setOrderNotes}
        orderEstimatedArrival={orderEstimatedArrival}
        onOrderEstimatedArrivalChange={setOrderEstimatedArrival}
        orderReceiptFile={orderReceiptFile}
        onOrderReceiptFileChange={setOrderReceiptFile}
        orderReceiptPreview={orderReceiptPreview}
        onOrderReceiptPreviewChange={setOrderReceiptPreview}
        orderProvider={orderProvider}
        onOrderProviderChange={setOrderProvider}
        productSearchQuery={orderProductSearchQuery}
        onProductSearchQueryChange={setOrderProductSearchQuery}
        isSaving={isSavingOrder}
        error={error}
        orderSaved={orderSaved}
        onSaveOrder={handleSaveOrder}
        onResetForm={resetOrderForm}
      />

      {/* Order Detail Modal */}
      {viewingOrder && (
        <OrderDetailModal
          isOpen={isOrderDetailModalOpen}
          onClose={() => setIsOrderDetailModalOpen(false)}
          onExitComplete={() => {
            setViewingOrder(null)
            setReceivedQuantities({})
          }}
          order={viewingOrder}
          providers={providers}
          orderItems={orderItems}
          setOrderItems={setOrderItems}
          onUpdateQuantity={handleUpdateOrderItemQuantity}
          orderTotal={orderTotal}
          onOrderTotalChange={setOrderTotal}
          orderNotes={orderNotes}
          onOrderNotesChange={setOrderNotes}
          orderEstimatedArrival={orderEstimatedArrival}
          onOrderEstimatedArrivalChange={setOrderEstimatedArrival}
          orderProvider={orderProvider}
          onOrderProviderChange={setOrderProvider}
          receivedQuantities={receivedQuantities}
          setReceivedQuantities={setReceivedQuantities}
          isSaving={isSavingOrder}
          isReceiving={isReceiving}
          isDeleting={isDeletingOrder}
          error={error}
          orderReceived={orderReceived}
          orderDeleted={orderDeleted}
          editOrderSaved={editOrderSaved}
          onInitializeEditForm={initializeEditForm}
          onInitializeReceiveQuantities={initializeReceiveQuantities}
          onSaveEditOrder={handleSaveEditOrder}
          onReceiveOrder={handleReceiveOrder}
          onDeleteOrder={handleDeleteOrder}
          getReceiptUrl={getOrderReceiptUrl}
          canDelete={canDelete}
        />
      )}
    </>
  )
}
