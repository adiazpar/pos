'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useHeader } from '@/contexts/header-context'
import { useProductFilters } from '@/hooks'
import { Spinner } from '@/components/ui'
import {
  ProductsTab,
  OrdersTab,
  ProductModal,
  NewOrderModal,
  OrderDetailModal,
} from '@/components/productos'
import {
  type PageTab,
  type ExpandedOrder,
  type OrderFormItem,
  type OrderStatusFilter,
  TAB_SUBTITLES,
} from '@/lib/products'
import { getProductIconUrl, formatDate } from '@/lib/utils'
import { useAiProductPipeline, useImageCompression } from '@/hooks'
import type { Product, ProductCategory, Provider } from '@/types'

export default function ProductosPage() {
  const { user, pb } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>('productos')

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<ExpandedOrder[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
  } = useProductFilters({ products })

  // Sort sheet state
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false)

  // Product modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Product form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [active, setActive] = useState(true)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [generatedIconBlob, setGeneratedIconBlob] = useState<Blob | null>(null)

  // Product operation states
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [productSaved, setProductSaved] = useState(false)
  const [productDeleted, setProductDeleted] = useState(false)

  // Stock adjustment
  const [newStockValue, setNewStockValue] = useState(0)
  const [isAdjusting, setIsAdjusting] = useState(false)

  // AI Pipeline
  const pipeline = useAiProductPipeline()
  const compression = useImageCompression()
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const aiProcessing = pipeline.state.step !== 'idle' && pipeline.state.step !== 'complete' && pipeline.state.step !== 'error'

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
  const canDelete = user?.role === 'owner' || user?.role === 'partner'

  // Load data
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const [productsRes, ordersRes, providersRes] = await Promise.all([
          pb.collection('products').getFullList<Product>({
            sort: 'name',
            requestKey: null,
          }),
          pb.collection('orders').getFullList<ExpandedOrder>({
            sort: '-date',
            expand: 'order_items(order).product,provider',
            requestKey: null,
          }),
          pb.collection('providers').getFullList<Provider>({
            sort: 'name',
            filter: 'active = true',
            requestKey: null,
          }),
        ])
        if (cancelled) return
        setProducts(productsRes)
        setOrders(ordersRes)
        setProviders(providersRes)
      } catch (err) {
        if (cancelled) return
        console.error('Error loading data:', err)
        setError('Error al cargar los datos')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [pb])

  // Sync pipeline results
  useEffect(() => {
    if (pipeline.state.step === 'complete' && pipeline.state.result) {
      const result = pipeline.state.result
      setName(result.name)
      setIconPreview(result.iconPreview)
      setGeneratedIconBlob(result.iconBlob)
    }
  }, [pipeline.state.step, pipeline.state.result])

  // Show pipeline errors
  useEffect(() => {
    if (pipeline.state.step === 'error' && pipeline.state.error) {
      setError(pipeline.state.error)
    }
  }, [pipeline.state.step, pipeline.state.error])

  // Filtered products for order selection
  const orderFilteredProducts = useMemo(() => {
    if (!orderProductSearchQuery.trim()) return products.filter(p => p.active)
    const query = orderProductSearchQuery.toLowerCase()
    return products.filter(p => p.active && p.name.toLowerCase().includes(query))
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

  // Product handlers
  const resetProductForm = useCallback(() => {
    setName('')
    setPrice('')
    setCategory('')
    setActive(true)
    setIconPreview(null)
    setGeneratedIconBlob(null)
    setEditingProduct(null)
    setError('')
    setProductDeleted(false)
    setProductSaved(false)
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
  }, [pipeline, compression])

  const abortAiProcessing = useCallback(() => {
    if (pipeline.state.step !== 'idle') {
      pipeline.cancel()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setIconPreview(null)
    setGeneratedIconBlob(null)
    setName('')
    setPrice('')
    setCategory('')
    setActive(true)
    setError('')
  }, [pipeline, compression])

  const handleOpenAdd = useCallback(() => {
    resetProductForm()
    setIsModalOpen(true)
  }, [resetProductForm])

  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategory(product.category || '')
    setActive(product.active)
    setIconPreview(getProductIconUrl(product, '128x128'))
    setGeneratedIconBlob(null)
    if (pipeline.state.step !== 'idle') {
      pipeline.reset()
    }
    if (compression.state.isProcessing) {
      compression.cancel()
    }
    setNewStockValue(product.stock ?? 0)
    setError('')
    setIsModalOpen(true)
  }, [pipeline, compression])

  const handleCloseModal = useCallback(() => {
    abortAiProcessing()
    setIsModalOpen(false)
  }, [abortAiProcessing])

  const handleAiPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const compressedBase64 = await compression.compressImage(file)

    if (compression.state.error) {
      setError(compression.state.error)
      return
    }

    if (!compressedBase64) return
    await pipeline.startPipeline(compressedBase64)
  }, [compression, pipeline])

  const handleSubmitProduct = useCallback(async (): Promise<boolean> => {
    if (!name.trim()) {
      setError('El nombre es requerido')
      return false
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Ingresa un precio valido')
      return false
    }

    setIsSaving(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('price', priceNum.toString())
      if (category) formData.append('category', category)
      formData.append('active', active.toString())
      if (generatedIconBlob) {
        formData.append('icon', generatedIconBlob, 'icon.png')
      }

      let record: Product
      if (editingProduct) {
        record = await pb.collection('products').update<Product>(editingProduct.id, formData)
        setProducts(prev => prev.map(p => p.id === record.id ? record : p))
      } else {
        record = await pb.collection('products').create<Product>(formData)
        setProducts(prev => [...prev, record].sort((a, b) => a.name.localeCompare(b.name)))
      }

      setProductSaved(true)
      return true
    } catch (err) {
      console.error('Error saving product:', err)
      setError('Error al guardar el producto')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [name, price, category, active, generatedIconBlob, editingProduct, pb])

  const handleDeleteProduct = useCallback(async (): Promise<boolean> => {
    if (!editingProduct) return false

    setIsDeleting(true)
    setError('')

    try {
      await pb.collection('products').delete(editingProduct.id)
      setProducts(prev => prev.filter(p => p.id !== editingProduct.id))
      setProductDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      setError('Error al eliminar el producto')
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [editingProduct, pb])

  const handleSaveAdjustment = useCallback(async () => {
    if (!editingProduct) return

    const currentStock = editingProduct.stock ?? 0
    if (newStockValue === currentStock) {
      handleCloseModal()
      return
    }

    setIsAdjusting(true)
    setError('')

    try {
      await pb.collection('products').update(editingProduct.id, { stock: newStockValue })
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, stock: newStockValue } : p))
      handleCloseModal()
    } catch (err) {
      console.error('Error adjusting stock:', err)
      setError('Error al ajustar el inventario')
    } finally {
      setIsAdjusting(false)
    }
  }, [editingProduct, newStockValue, pb, handleCloseModal])

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
      setError('Agrega al menos un producto')
      return false
    }

    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Ingresa el total pagado')
      return false
    }

    setIsSavingOrder(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('date', new Date().toISOString())
      formData.append('total', totalNum.toString())
      formData.append('status', 'pending')
      if (orderNotes.trim()) formData.append('notes', orderNotes.trim())
      if (orderEstimatedArrival) formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
      if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
      if (orderProvider) formData.append('provider', orderProvider)

      const order = await pb.collection('orders').create<ExpandedOrder>(formData)

      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order: order.id,
          product: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
        })
      }

      const updatedOrders = await pb.collection('orders').getFullList<ExpandedOrder>({
        sort: '-date',
        expand: 'order_items(order).product,provider',
        requestKey: null,
      })
      setOrders(updatedOrders)
      setOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, pb])

  const handleSaveEditOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false
    if (orderItems.length === 0) {
      setError('Agrega al menos un producto')
      return false
    }

    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Ingresa el total pagado')
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
      } else {
        formData.append('estimatedArrival', '')
      }
      if (orderReceiptFile) formData.append('receipt', orderReceiptFile)
      formData.append('provider', orderProvider || '')

      await pb.collection('orders').update(viewingOrder.id, formData)

      const existingItems = viewingOrder.expand?.['order_items(order)'] || []
      for (const item of existingItems) {
        await pb.collection('order_items').delete(item.id)
      }

      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order: viewingOrder.id,
          product: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
        })
      }

      const updatedOrders = await pb.collection('orders').getFullList<ExpandedOrder>({
        sort: '-date',
        expand: 'order_items(order).product,provider',
        requestKey: null,
      })
      setOrders(updatedOrders)
      setEditOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, viewingOrder, pb])

  const handleReceiveOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder || !user) return false

    setIsReceiving(true)
    setError('')

    try {
      const now = new Date().toISOString()
      const orderItemsList = viewingOrder.expand?.['order_items(order)'] || []

      for (const item of orderItemsList) {
        const product = item.expand?.product
        if (!product) continue

        const receivedQty = receivedQuantities[item.id] ?? item.quantity
        if (receivedQty <= 0) continue

        const currentStock = product.stock || 0
        await pb.collection('products').update(product.id, { stock: currentStock + receivedQty })
      }

      await pb.collection('orders').update(viewingOrder.id, { status: 'received', receivedDate: now })

      const [productsRes, ordersRes] = await Promise.all([
        pb.collection('products').getFullList<Product>({ sort: 'name', requestKey: null }),
        pb.collection('orders').getFullList<ExpandedOrder>({
          sort: '-date',
          expand: 'order_items(order).product,provider',
          requestKey: null,
        }),
      ])

      setProducts(productsRes)
      setOrders(ordersRes)
      setOrderReceived(true)
      return true
    } catch (err) {
      console.error('Error receiving order:', err)
      setError('Error al recibir el pedido')
      return false
    } finally {
      setIsReceiving(false)
    }
  }, [viewingOrder, user, receivedQuantities, pb])

  const handleDeleteOrder = useCallback(async (): Promise<boolean> => {
    if (!viewingOrder) return false

    setIsDeletingOrder(true)
    setError('')

    try {
      const orderItemsList = viewingOrder.expand?.['order_items(order)'] || []
      for (const item of orderItemsList) {
        await pb.collection('order_items').delete(item.id)
      }

      await pb.collection('orders').delete(viewingOrder.id)
      setOrders(prev => prev.filter(o => o.id !== viewingOrder.id))
      setOrderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting order:', err)
      setError('Error al eliminar el pedido')
      return false
    } finally {
      setIsDeletingOrder(false)
    }
  }, [viewingOrder, pb])

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
    setOrderProvider(order.provider || '')
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProductSearchQuery('')
    setError('')
    setEditOrderSaved(false)
  }, [])

  const getOrderReceiptUrl = useCallback((order: ExpandedOrder): string | null => {
    if (!order.receipt) return null
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    return `${pbUrl}/api/files/${order.collectionId}/${order.id}/${order.receipt}`
  }, [])

  // Set header
  useHeader({
    title: 'Productos',
    subtitle: TAB_SUBTITLES[activeTab],
  })

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
            onClick={() => setActiveTab('productos')}
            className={`section-tab ${activeTab === 'productos' ? 'section-tab-active' : ''}`}
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pedidos')}
            className={`section-tab ${activeTab === 'pedidos' ? 'section-tab-active' : ''}`}
          >
            Pedidos
          </button>
        </div>

        {activeTab === 'productos' ? (
          <ProductsTab
            products={products}
            filteredProducts={filteredProducts}
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

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={resetProductForm}
        name={name}
        onNameChange={setName}
        price={price}
        onPriceChange={setPrice}
        category={category}
        onCategoryChange={setCategory}
        active={active}
        onActiveChange={setActive}
        iconPreview={iconPreview}
        onClearIcon={() => {
          setIconPreview(null)
          setGeneratedIconBlob(null)
        }}
        editingProduct={editingProduct}
        newStockValue={newStockValue}
        onNewStockValueChange={setNewStockValue}
        onSaveAdjustment={handleSaveAdjustment}
        isAdjusting={isAdjusting}
        isSaving={isSaving}
        isDeleting={isDeleting}
        error={error}
        productSaved={productSaved}
        productDeleted={productDeleted}
        pipelineStep={pipeline.state.step}
        isCompressing={compression.state.isProcessing}
        aiProcessing={aiProcessing}
        onAbortAiProcessing={abortAiProcessing}
        onPipelineReset={() => pipeline.reset()}
        cameraInputRef={cameraInputRef}
        onAiPhotoCapture={handleAiPhotoCapture}
        onSubmit={handleSubmitProduct}
        onDelete={handleDeleteProduct}
        canDelete={canDelete}
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
