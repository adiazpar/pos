/**
 * Hook for managing order CRUD operations
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { Product, Provider } from '@/types'
import type { ExpandedOrder, OrderFormItem } from '@/lib/products'
import { formatDate } from '@/lib/utils'

// ============================================
// HOOK INTERFACE
// ============================================

export type OrderStatusFilter = 'all' | 'pending' | 'received'

export interface UseOrderManagementOptions {
  products: Product[]
  providers: Provider[]
  onOrdersUpdated?: (orders: ExpandedOrder[]) => void
  onProductsUpdated?: (products: Product[]) => void
}

export interface UseOrderManagementReturn {
  // Order form state
  orderItems: OrderFormItem[]
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>
  orderTotal: string
  setOrderTotal: (total: string) => void
  orderNotes: string
  setOrderNotes: (notes: string) => void
  orderEstimatedArrival: string
  setOrderEstimatedArrival: (date: string) => void
  orderReceiptFile: File | null
  setOrderReceiptFile: (file: File | null) => void
  orderReceiptPreview: string | null
  setOrderReceiptPreview: (preview: string | null) => void
  orderProvider: string
  setOrderProvider: (providerId: string) => void
  orderProductSearchQuery: string
  setOrderProductSearchQuery: (query: string) => void
  receiptInputRef: React.RefObject<HTMLInputElement | null>

  // Editing state
  editingOrder: ExpandedOrder | null
  setEditingOrder: (order: ExpandedOrder | null) => void
  viewingOrder: ExpandedOrder | null
  setViewingOrder: (order: ExpandedOrder | null) => void

  // Receive order state
  receivedQuantities: Record<string, number>
  setReceivedQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>

  // Search and filter state
  orderSearchQuery: string
  setOrderSearchQuery: (query: string) => void
  orderStatusFilter: OrderStatusFilter
  setOrderStatusFilter: (filter: OrderStatusFilter) => void

  // Operation states
  isSavingOrder: boolean
  isReceiving: boolean
  isDeletingOrder: boolean
  error: string
  setError: (error: string) => void

  // Success states
  orderSaved: boolean
  setOrderSaved: (saved: boolean) => void
  orderReceived: boolean
  setOrderReceived: (received: boolean) => void
  orderDeleted: boolean
  setOrderDeleted: (deleted: boolean) => void
  editOrderSaved: boolean
  setEditOrderSaved: (saved: boolean) => void

  // Derived data
  orderFilteredProducts: Product[]
  filteredOrders: ExpandedOrder[]

  // Handlers
  resetOrderForm: () => void
  handleToggleProductInOrder: (product: Product) => void
  handleUpdateOrderItemQuantity: (productId: string, quantity: number) => void
  handleSaveOrder: () => Promise<boolean>
  handleSaveEditOrder: () => Promise<boolean>
  handleReceiveOrder: () => Promise<boolean>
  handleDeleteOrder: () => Promise<boolean>
  initializeReceiveQuantities: (order: ExpandedOrder) => void
  initializeEditForm: (order: ExpandedOrder) => void
  getOrderReceiptUrl: (order: ExpandedOrder) => string | null
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useOrderManagement({
  products,
  providers: _providers,
  onOrdersUpdated,
  onProductsUpdated,
}: UseOrderManagementOptions): UseOrderManagementReturn {
  const { pb, user } = useAuth()

  // Order form state
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([])
  const [orderTotal, setOrderTotal] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderEstimatedArrival, setOrderEstimatedArrival] = useState('')
  const [orderReceiptFile, setOrderReceiptFile] = useState<File | null>(null)
  const [orderReceiptPreview, setOrderReceiptPreview] = useState<string | null>(null)
  const [orderProvider, setOrderProvider] = useState('')
  const [orderProductSearchQuery, setOrderProductSearchQuery] = useState('')
  const receiptInputRef = useRef<HTMLInputElement | null>(null)

  // Editing state
  const [editingOrder, setEditingOrder] = useState<ExpandedOrder | null>(null)
  const [viewingOrder, setViewingOrder] = useState<ExpandedOrder | null>(null)

  // Receive order state
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})

  // Search and filter state
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all')

  // Operation states
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)
  const [error, setError] = useState('')

  // Success states
  const [orderSaved, setOrderSaved] = useState(false)
  const [orderReceived, setOrderReceived] = useState(false)
  const [orderDeleted, setOrderDeleted] = useState(false)
  const [editOrderSaved, setEditOrderSaved] = useState(false)

  // Orders state - kept here for filtering
  const [orders, setOrders] = useState<ExpandedOrder[]>([])

  // Update local orders when parent updates them
  const updateOrders = useCallback((newOrders: ExpandedOrder[]) => {
    setOrders(newOrders)
    onOrdersUpdated?.(newOrders)
  }, [onOrdersUpdated])

  // Get receipt URL
  const getOrderReceiptUrl = useCallback((order: ExpandedOrder): string | null => {
    if (!order.receipt) return null
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    return `${pbUrl}/api/files/${order.collectionId}/${order.id}/${order.receipt}`
  }, [])

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

  // Reset order form
  const resetOrderForm = useCallback(() => {
    setOrderItems([])
    setOrderTotal('')
    setOrderNotes('')
    setOrderEstimatedArrival('')
    setOrderReceiptFile(null)
    setOrderReceiptPreview(null)
    setOrderProvider('')
    setOrderProductSearchQuery('')
    setEditingOrder(null)
    setError('')
    setOrderSaved(false)
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
  }, [])

  // Toggle product in order
  const handleToggleProductInOrder = useCallback((product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.filter(item => item.product.id !== product.id)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  // Update order item quantity
  const handleUpdateOrderItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return
    setOrderItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ))
  }, [])

  // Initialize receive quantities
  const initializeReceiveQuantities = useCallback((order: ExpandedOrder) => {
    const items = order.expand?.['order_items(order)'] || []
    const initialQuantities: Record<string, number> = {}
    for (const item of items) {
      initialQuantities[item.id] = item.quantity
    }
    setReceivedQuantities(initialQuantities)
  }, [])

  // Initialize edit form
  const initializeEditForm = useCallback((order: ExpandedOrder) => {
    setEditingOrder(order)
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

  // Save new order
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
      if (orderNotes.trim()) {
        formData.append('notes', orderNotes.trim())
      }
      if (orderEstimatedArrival) {
        formData.append('estimatedArrival', new Date(orderEstimatedArrival).toISOString())
      }
      if (orderReceiptFile) {
        formData.append('receipt', orderReceiptFile)
      }
      if (orderProvider) {
        formData.append('provider', orderProvider)
      }

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
      updateOrders(updatedOrders)
      setOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, pb, updateOrders])

  // Save edit order
  const handleSaveEditOrder = useCallback(async (): Promise<boolean> => {
    if (!editingOrder) return false
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
      if (orderReceiptFile) {
        formData.append('receipt', orderReceiptFile)
      }
      formData.append('provider', orderProvider || '')

      await pb.collection('orders').update(editingOrder.id, formData)

      const existingItems = editingOrder.expand?.['order_items(order)'] || []
      for (const item of existingItems) {
        await pb.collection('order_items').delete(item.id)
      }

      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order: editingOrder.id,
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
      updateOrders(updatedOrders)
      setEditOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, editingOrder, pb, updateOrders])

  // Receive order
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
        await pb.collection('products').update(product.id, {
          stock: currentStock + receivedQty,
        })
      }

      await pb.collection('orders').update(viewingOrder.id, {
        status: 'received',
        receivedDate: now,
      })

      const [productsRes, ordersRes] = await Promise.all([
        pb.collection('products').getFullList<Product>({
          sort: 'name',
          requestKey: null,
        }),
        pb.collection('orders').getFullList<ExpandedOrder>({
          sort: '-date',
          expand: 'order_items(order).product,provider',
          requestKey: null,
        }),
      ])

      onProductsUpdated?.(productsRes)
      updateOrders(ordersRes)
      setOrderReceived(true)
      return true
    } catch (err) {
      console.error('Error receiving order:', err)
      setError('Error al recibir el pedido')
      return false
    } finally {
      setIsReceiving(false)
    }
  }, [viewingOrder, user, receivedQuantities, pb, onProductsUpdated, updateOrders])

  // Delete order
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
      onOrdersUpdated?.(orders.filter(o => o.id !== viewingOrder.id))
      setOrderDeleted(true)
      return true
    } catch (err) {
      console.error('Error deleting order:', err)
      setError('Error al eliminar el pedido')
      return false
    } finally {
      setIsDeletingOrder(false)
    }
  }, [viewingOrder, pb, orders, onOrdersUpdated])

  return {
    orderItems,
    setOrderItems,
    orderTotal,
    setOrderTotal,
    orderNotes,
    setOrderNotes,
    orderEstimatedArrival,
    setOrderEstimatedArrival,
    orderReceiptFile,
    setOrderReceiptFile,
    orderReceiptPreview,
    setOrderReceiptPreview,
    orderProvider,
    setOrderProvider,
    orderProductSearchQuery,
    setOrderProductSearchQuery,
    receiptInputRef,
    editingOrder,
    setEditingOrder,
    viewingOrder,
    setViewingOrder,
    receivedQuantities,
    setReceivedQuantities,
    orderSearchQuery,
    setOrderSearchQuery,
    orderStatusFilter,
    setOrderStatusFilter,
    isSavingOrder,
    isReceiving,
    isDeletingOrder,
    error,
    setError,
    orderSaved,
    setOrderSaved,
    orderReceived,
    setOrderReceived,
    orderDeleted,
    setOrderDeleted,
    editOrderSaved,
    setEditOrderSaved,
    orderFilteredProducts,
    filteredOrders,
    resetOrderForm,
    handleToggleProductInOrder,
    handleUpdateOrderItemQuantity,
    handleSaveOrder,
    handleSaveEditOrder,
    handleReceiveOrder,
    handleDeleteOrder,
    initializeReceiveQuantities,
    initializeEditForm,
    getOrderReceiptUrl,
  }
}
