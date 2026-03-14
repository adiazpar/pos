'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { useHeader } from '@/contexts/header-context'
import { IconAdd, IconClose, IconTrash, IconImage, IconProducts, IconSearch, IconArrowUp, IconArrowDown, IconFilter, IconCheck, IconEdit, IconChevronRight, IconChevronDown, IconSelect, IconWarning, IconInventory, IconAdjust, IconCirclePlus, IconCircleMinus, IconCalendarTime } from '@/components/icons'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency, formatDate, getProductImageUrl } from '@/lib/utils'
import { transitionModals } from '@/lib/modal-utils'
import { PRODUCT_FILTERS_KEY } from '@/lib/constants'
import type { Product, ProductCategory, Order, OrderItem, Provider } from '@/types'

// Category configuration
const CATEGORY_CONFIG: Record<ProductCategory, { label: string; size?: string; order: number }> = {
  chifles_grande: { label: 'Chifles Grande', size: '250g', order: 1 },
  chifles_chico: { label: 'Chifles Chico', size: '160g', order: 2 },
  miel: { label: 'Miel de Abeja', order: 3 },
  algarrobina: { label: 'Algarrobina', order: 4 },
  postres: { label: 'Postres', order: 5 },
}

// Filter tab configuration (combines chifles into one)
type FilterCategory = 'all' | 'low_stock' | 'chifles' | 'miel' | 'algarrobina' | 'postres'

const FILTER_CONFIG: Record<Exclude<FilterCategory, 'all' | 'low_stock'>, { label: string; categories: ProductCategory[] }> = {
  chifles: { label: 'Chifles', categories: ['chifles_grande', 'chifles_chico'] },
  miel: { label: 'Miel', categories: ['miel'] },
  algarrobina: { label: 'Algarrobina', categories: ['algarrobina'] },
  postres: { label: 'Postres', categories: ['postres'] },
}

// Expanded Order type for display
interface ExpandedOrder extends Order {
  expand?: {
    'order_items(order)'?: (OrderItem & {
      expand?: {
        product?: Product
      }
    })[]
    provider?: Provider
  }
}

// Tab types
type PageTab = 'productos' | 'pedidos'

// Sort options
type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name_asc', label: 'Nombre (A-Z)' },
  { value: 'name_desc', label: 'Nombre (Z-A)' },
  { value: 'price_asc', label: 'Precio (menor a mayor)' },
  { value: 'price_desc', label: 'Precio (mayor a menor)' },
  { value: 'stock_asc', label: 'Stock (menor a mayor)' },
  { value: 'stock_desc', label: 'Stock (mayor a menor)' },
  { value: 'category', label: 'Categoria' },
]

interface ProductFilters {
  selectedFilter: FilterCategory
  sortBy: SortOption
}

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


export default function ProductosPage() {
  const { user, pb } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>('productos')

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>(() => {
    const saved = loadProductFilters()
    return saved?.selectedFilter ?? 'all'
  })
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = loadProductFilters()
    return saved?.sortBy ?? 'name_asc'
  })
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false)
  const [productDeleted, setProductDeleted] = useState(false)
  const [productSaved, setProductSaved] = useState(false)

  // Stock adjustment form state (used in modal step 1)
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'remove'>('remove')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  // Orders state (for Pedidos tab)
  const [orders, setOrders] = useState<ExpandedOrder[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<{ product: Product; quantity: number }[]>([])
  const [orderTotal, setOrderTotal] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderEstimatedArrival, setOrderEstimatedArrival] = useState('')
  const [orderReceiptFile, setOrderReceiptFile] = useState<File | null>(null)
  const [orderReceiptPreview, setOrderReceiptPreview] = useState<string | null>(null)
  const [orderProvider, setOrderProvider] = useState('')
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [orderReceived, setOrderReceived] = useState(false)
  const [orderDeleted, setOrderDeleted] = useState(false)
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [isReceiving, setIsReceiving] = useState(false)
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<ExpandedOrder | null>(null)
  const [orderProductSearchQuery, setOrderProductSearchQuery] = useState('')
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ExpandedOrder | null>(null)
  const [editOrderSaved, setEditOrderSaved] = useState(false)
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'received'>('all')

  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [active, setActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  // Permission check
  const canDelete = user?.role === 'owner' || user?.role === 'partner'

  // Load products and orders
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

    return () => {
      cancelled = true
    }
  }, [pb])

  // Save filters to localStorage when they change
  useEffect(() => {
    saveProductFilters({ selectedFilter, sortBy })
  }, [selectedFilter, sortBy])

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

  // Filtered products for order selection
  const orderFilteredProducts = useMemo(() => {
    if (!orderProductSearchQuery.trim()) return products.filter(p => p.active)
    const query = orderProductSearchQuery.toLowerCase()
    return products.filter(p => p.active && p.name.toLowerCase().includes(query))
  }, [products, orderProductSearchQuery])

  // Filtered orders for Pedidos tab
  const filteredOrders = useMemo(() => {
    let result = orders

    // Filter by status
    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.status === orderStatusFilter)
    }

    // Filter by search query (provider name or date)
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

  const resetForm = useCallback(() => {
    setName('')
    setPrice('')
    setCategory('')
    setActive(true)
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(false)
    setEditingProduct(null)
    setError('')
    setProductDeleted(false)
    setProductSaved(false)
  }, [])

  const handleOpenAdd = useCallback(() => {
    resetForm()
    setIsModalOpen(true)
  }, [resetForm])

  const handleOpenEdit = useCallback((product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(product.price.toString())
    setCategory(product.category || '')
    setActive(product.active)
    setImageFile(null)
    setRemoveImage(false)
    // Set existing image preview
    const existingImageUrl = getProductImageUrl(product, '200x200')
    setImagePreview(existingImageUrl)
    // Reset adjustment form state for step 1
    setAdjustmentMode('remove')
    setAdjustmentQuantity('')
    setAdjustmentReason('')
    setAdjustmentNotes('')
    setError('')
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    resetForm()
  }, [resetForm])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5242880) {
      setError('La imagen debe ser menor a 5MB')
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const isHeicFile = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
    if (!validTypes.includes(file.type) && !isHeicFile) {
      setError('Solo se permiten imagenes JPG, PNG, WebP o HEIC')
      return
    }

    setError('')
    setImageFile(file)
    setRemoveImage(false)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleRemoveImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    // Validate
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
      if (category) {
        formData.append('category', category)
      }
      formData.append('active', active.toString())

      if (imageFile) {
        formData.append('image', imageFile)
      } else if (removeImage && editingProduct?.image) {
        formData.append('image', '')
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
  }, [name, price, category, active, imageFile, removeImage, editingProduct, pb])

  // Stock adjustment handler
  const handleSaveAdjustment = useCallback(async () => {
    if (!editingProduct) return

    const qty = parseInt(adjustmentQuantity, 10)
    if (isNaN(qty) || qty <= 0) {
      setError('Ingresa una cantidad valida')
      return
    }

    // Check if removing more than available
    const currentStock = editingProduct.stock ?? 0
    if (adjustmentMode === 'remove' && qty > currentStock) {
      setError(`No puedes remover mas de ${currentStock} unidades`)
      return
    }

    if (!adjustmentReason) {
      setError('Selecciona un motivo')
      return
    }

    setIsAdjusting(true)
    setError('')

    try {
      const adjustmentQty = adjustmentMode === 'add' ? qty : -qty
      const newStock = currentStock + adjustmentQty

      // Update product stock
      await pb.collection('products').update(editingProduct.id, {
        stock: newStock
      })

      // Create inventory transaction for tracking
      await pb.collection('inventory_transactions').create({
        date: new Date().toISOString(),
        product: editingProduct.id,
        type: 'adjustment',
        quantity: adjustmentQty,
        notes: `${adjustmentReason}${adjustmentNotes ? ': ' + adjustmentNotes : ''}`,
        createdBy: user?.id,
      })

      // Update local state
      setProducts(prev =>
        prev.map(p =>
          p.id === editingProduct.id ? { ...p, stock: newStock } : p
        )
      )

      // Reset adjustment form state
      setAdjustmentQuantity('')
      setAdjustmentReason('')
      setAdjustmentNotes('')
      handleCloseModal()
    } catch (err) {
      console.error('Error adjusting stock:', err)
      setError('Error al ajustar el inventario')
    } finally {
      setIsAdjusting(false)
    }
  }, [editingProduct, adjustmentQuantity, adjustmentMode, adjustmentReason, adjustmentNotes, pb, user?.id, handleCloseModal])

  // Selection mode handlers
  const handleEnterSelectionMode = useCallback(() => {
    setIsEditSheetOpen(false)
    setIsSelectionMode(true)
    setSelectedProducts(new Set())
  }, [])

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedProducts(new Set())
  }, [])

  const handleToggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }, [])

  const handleBulkUpdateStatus = useCallback(async (newStatus: boolean) => {
    if (selectedProducts.size === 0) return

    setError('')

    try {
      const updatePromises = Array.from(selectedProducts).map(id =>
        pb.collection('products').update<Product>(id, { active: newStatus })
      )
      const updatedRecords = await Promise.all(updatePromises)

      // Update local state
      setProducts(prev =>
        prev.map(p => {
          const updated = updatedRecords.find(r => r.id === p.id)
          return updated || p
        })
      )

      handleExitSelectionMode()
    } catch (err) {
      console.error('Error updating products:', err)
      setError('Error al actualizar los productos')
    }
  }, [selectedProducts, pb, handleExitSelectionMode])

  const scrollToTop = useCallback(() => {
    // The scrolling container is the .with-sidebar div, not window
    const scrollContainer = document.querySelector('.with-sidebar')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

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
    setEditingOrder(null)
    setError('')
    setOrderSaved(false)
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
  }, [])

  const handleOpenNewOrder = useCallback(() => {
    resetOrderForm()
    setIsOrderModalOpen(true)
  }, [resetOrderForm])

  const handleToggleProductInOrder = useCallback((product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        // Remove if already selected
        return prev.filter(item => item.product.id !== product.id)
      }
      // Add with quantity 1
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const handleUpdateOrderItemQuantity = useCallback((productId: string, quantity: number) => {
    // Minimum quantity is 1 - use toggle function to remove items
    if (quantity < 1) return
    setOrderItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    ))
  }, [])

  const handleSaveOrder = useCallback(async () => {
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
      // CREATE new order
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

      const order = await pb.collection('orders').create<Order>(formData)

      // Create order items
      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order: order.id,
          product: item.product.id,
          quantity: item.quantity,
        })
      }

      // Reload orders with expanded data
      const updatedOrders = await pb.collection('orders').getFullList<ExpandedOrder>({
        sort: '-date',
        expand: 'order_items(order).product,provider',
        requestKey: null,
      })
      setOrders(updatedOrders)

      // Mark as saved - the button component will navigate to success step
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

  // Save handler specifically for edit order modal
  const handleSaveEditOrder = useCallback(async () => {
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
      // UPDATE existing order
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

      // Handle order items: delete old ones and create new ones
      const existingItems = editingOrder.expand?.['order_items(order)'] || []
      for (const item of existingItems) {
        await pb.collection('order_items').delete(item.id)
      }

      // Create new order items
      for (const item of orderItems) {
        await pb.collection('order_items').create({
          order: editingOrder.id,
          product: item.product.id,
          quantity: item.quantity,
        })
      }

      // Reload orders with expanded data
      const updatedOrders = await pb.collection('orders').getFullList<ExpandedOrder>({
        sort: '-date',
        expand: 'order_items(order).product,provider',
        requestKey: null,
      })
      setOrders(updatedOrders)

      // Mark as saved for edit modal
      setEditOrderSaved(true)
      return true
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
      return false
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, orderProvider, editingOrder, pb])

  const handleOpenOrderDetail = useCallback((order: ExpandedOrder) => {
    setViewingOrder(order)
    setOrderReceived(false)
    setOrderDeleted(false)
    setEditOrderSaved(false)
    setIsOrderDetailModalOpen(true)
  }, [])

  // Get receipt URL from order
  const getOrderReceiptUrl = useCallback((order: ExpandedOrder): string | null => {
    if (!order.receipt) return null
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    return `${pbUrl}/api/files/${order.collectionId}/${order.id}/${order.receipt}`
  }, [])

  // Confirm Order Button - needs to be inside modal to access context
  const ConfirmOrderButton = ({ disabled }: { disabled: boolean }) => {
    const { goNext } = useMorphingModal()

    const handleClick = async () => {
      const success = await handleSaveOrder()
      if (success) {
        goNext()
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-primary flex-1"
        disabled={disabled}
      >
        {isSavingOrder ? <Spinner /> : 'Confirmar'}
      </button>
    )
  }

  // GoToReceiveStepButton - initializes receivedQuantities and navigates to receive step
  const GoToReceiveStepButton = ({ order }: { order: ExpandedOrder }) => {
    const { goToStep } = useMorphingModal()

    const handleClick = () => {
      // Initialize received quantities with ordered quantities
      const items = order.expand?.['order_items(order)'] || []
      const initialQuantities: Record<string, number> = {}
      for (const item of items) {
        initialQuantities[item.id] = item.quantity
      }
      setReceivedQuantities(initialQuantities)
      goToStep(3) // Step 3 is receive (0=details, 1=edit, 2=edit success, 3=receive, 4=delete)
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-primary flex-1"
      >
        Recibir
      </button>
    )
  }

  // ConfirmReceiveButton - confirms receipt and updates stock
  const ConfirmReceiveButton = () => {
    const { goToStep } = useMorphingModal()

    const handleClick = async () => {
      if (!viewingOrder || !user) return

      setIsReceiving(true)
      setError('')

      try {
        const now = new Date().toISOString()
        const orderItemsList = viewingOrder.expand?.['order_items(order)'] || []

        // Create inventory transactions and update stock for each item
        for (const item of orderItemsList) {
          const product = item.expand?.product
          if (!product) continue

          // Get the received quantity (may be different from ordered)
          const receivedQty = receivedQuantities[item.id] ?? item.quantity
          if (receivedQty <= 0) continue // Skip items not received

          // Build notes based on whether quantity differs
          const orderedQty = item.quantity
          const notes = receivedQty !== orderedQty
            ? `Pedido recibido (${receivedQty} de ${orderedQty} ordenados)`
            : `Pedido recibido`

          // Create inventory transaction
          await pb.collection('inventory_transactions').create({
            date: now,
            product: product.id,
            quantity: receivedQty,
            type: 'purchase',
            order: viewingOrder.id,
            createdBy: user.id,
            notes,
          })

          // Update product stock
          const currentStock = product.stock || 0
          await pb.collection('products').update(product.id, {
            stock: currentStock + receivedQty,
          })
        }

        // Update order status
        await pb.collection('orders').update(viewingOrder.id, {
          status: 'received',
          receivedDate: now,
        })

        // Reload data
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

        setProducts(productsRes)
        setOrders(ordersRes)
        setOrderReceived(true)
        goToStep(5) // Go to receive success step
      } catch (err) {
        console.error('Error receiving order:', err)
        setError('Error al recibir el pedido')
      } finally {
        setIsReceiving(false)
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-primary flex-1"
        disabled={isReceiving}
      >
        {isReceiving ? <Spinner /> : 'Confirmar'}
      </button>
    )
  }

  // ConfirmDeleteButton - deletes the order
  const ConfirmDeleteButton = () => {
    const { goToStep } = useMorphingModal()

    const handleClick = async () => {
      if (!viewingOrder) return

      setIsDeletingOrder(true)
      setError('')

      try {
        // First delete all order items
        const orderItemsList = viewingOrder.expand?.['order_items(order)'] || []
        for (const item of orderItemsList) {
          await pb.collection('order_items').delete(item.id)
        }

        // Then delete the order
        await pb.collection('orders').delete(viewingOrder.id)

        // Update local state
        setOrders(prev => prev.filter(o => o.id !== viewingOrder.id))
        setOrderDeleted(true)
        goToStep(6) // Go to delete success step
      } catch (err) {
        console.error('Error deleting order:', err)
        setError('Error al eliminar el pedido')
      } finally {
        setIsDeletingOrder(false)
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-danger flex-1"
        disabled={isDeletingOrder}
      >
        {isDeletingOrder ? <Spinner /> : 'Eliminar'}
      </button>
    )
  }

  // SaveProductButton - saves product and goes to success step
  const SaveProductButton = () => {
    const { goToStep } = useMorphingModal()

    const handleClick = async () => {
      const success = await handleSubmit()
      if (success) {
        goToStep(5) // Go to save success step
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-primary flex-1"
        disabled={isSaving || !name.trim() || !price || parseFloat(price) < 0 || !category}
      >
        {isSaving ? <Spinner /> : 'Guardar'}
      </button>
    )
  }

  // ConfirmDeleteProductButton - deletes the product
  const ConfirmDeleteProductButton = () => {
    const { goToStep } = useMorphingModal()

    const handleClick = async () => {
      if (!editingProduct) return

      setIsDeleting(true)
      setError('')

      try {
        await pb.collection('products').delete(editingProduct.id)
        setProducts(prev => prev.filter(p => p.id !== editingProduct.id))
        setProductDeleted(true)
        goToStep(4) // Go to delete success step
      } catch (err) {
        console.error('Error deleting product:', err)
        setError('Error al eliminar el producto')
      } finally {
        setIsDeleting(false)
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-danger flex-1"
        disabled={isDeleting}
      >
        {isDeleting ? <Spinner /> : 'Eliminar'}
      </button>
    )
  }

  // GoToEditStepButton - initializes edit form and navigates to edit step
  const GoToEditStepButton = ({ order }: { order: ExpandedOrder }) => {
    const { goToStep } = useMorphingModal()

    const handleClick = () => {
      // Pre-fill form with order data
      setEditingOrder(order)

      // Convert order items to the format expected by the form
      const items = order.expand?.['order_items(order)'] || []
      const formItems = items.map(item => ({
        product: item.expand?.product as Product,
        quantity: item.quantity,
      })).filter(item => item.product)

      setOrderItems(formItems as { product: Product; quantity: number }[])
      setOrderTotal(order.total.toString())
      setOrderNotes(order.notes || '')
      setOrderEstimatedArrival(order.estimatedArrival ? new Date(order.estimatedArrival).toISOString().split('T')[0] : '')
      setOrderProvider(order.provider || '')
      setOrderReceiptFile(null)
      setOrderReceiptPreview(null)
      setOrderProductSearchQuery('')
      setError('')
      setEditOrderSaved(false)

      goToStep(1)
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="modal-action-adjust"
        title="Editar pedido"
      >
        <IconEdit className="w-5 h-5" />
      </button>
    )
  }

  // ConfirmEditOrderInDetailButton - saves edit and goes to success step
  const ConfirmEditOrderInDetailButton = ({ disabled }: { disabled: boolean }) => {
    const { goToStep } = useMorphingModal()

    const handleClick = async () => {
      const success = await handleSaveEditOrder()
      if (success) {
        goToStep(2) // Go to success step
      }
    }

    return (
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-primary flex-1"
        disabled={disabled}
      >
        {isSavingOrder ? <Spinner /> : 'Guardar'}
      </button>
    )
  }

  // Tab subtitle config
  const tabSubtitles: Record<PageTab, string> = {
    productos: 'Gestiona tu catalogo',
    pedidos: 'Pedidos a proveedores',
  }

  // Set header based on active tab
  useHeader({
    title: 'Productos',
    subtitle: tabSubtitles[activeTab],
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
          <div className="page-body space-y-4 page-stagger">
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
                    <IconSearch className="search-bar-icon" />
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="search-bar-input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="search-bar-clear"
                        aria-label="Limpiar busqueda"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSortSheetOpen(true)}
                    className="btn btn-secondary btn-icon flex-shrink-0"
                    aria-label="Ordenar productos"
                  >
                    <IconFilter className="w-4 h-4" />
                  </button>
                </div>

                {/* Category Filter Tabs */}
                {availableFilters.length > 0 && (
                  <div className="filter-tabs">
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className={`filter-tab ${selectedFilter === 'all' ? 'filter-tab-active' : ''}`}
                    >
                      Todos
                    </button>
                    {availableFilters.map(filter => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSelectedFilter(filter)}
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
                    {isSelectionMode ? (
                      <>
                        <span className="text-sm text-text-secondary">
                          {selectedProducts.size} {selectedProducts.size === 1 ? 'seleccionado' : 'seleccionados'}
                        </span>
                        <button
                          type="button"
                          onClick={handleExitSelectionMode}
                          className="btn btn-secondary btn-sm"
                        >
                          <IconClose className="w-4 h-4" />
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-text-secondary">
                          {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditSheetOpen(true)}
                          className="btn btn-primary btn-sm"
                        >
                          <IconEdit className="w-4 h-4" />
                          Editar
                        </button>
                      </>
                    )}
                  </div>

                  {/* Product List */}
                  {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                      <IconSearch className="empty-state-icon" />
                      <h3 className="empty-state-title">Sin resultados</h3>
                      <p className="empty-state-description">
                        No se encontraron productos con ese criterio
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((product) => {
                        const imageUrl = getProductImageUrl(product, '100x100')
                        const categoryConfig = product.category ? CATEGORY_CONFIG[product.category] : null
                        const isSelected = selectedProducts.has(product.id)
                        const stockValue = product.stock ?? 0
                        const threshold = product.lowStockThreshold ?? 10
                        const isLowStock = stockValue <= threshold

                        return (
                          <div
                            key={product.id}
                            className="list-item-clickable list-item-flat"
                            onClick={() => {
                              if (isSelectionMode) {
                                handleToggleProductSelection(product.id)
                              } else {
                                handleOpenEdit(product)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                if (isSelectionMode) {
                                  handleToggleProductSelection(product.id)
                                } else {
                                  handleOpenEdit(product)
                                }
                              }
                            }}
                            tabIndex={0}
                            role="button"
                          >
                            {/* Selection checkbox or Product Image/Icon */}
                            {isSelectionMode ? (
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-brand text-white' : 'bg-bg-muted text-text-tertiary'}`}>
                                {isSelected && <IconCheck className="w-4 h-4" />}
                              </div>
                            ) : (
                              <div className={`product-list-image ${isLowStock && product.active ? 'ring-2 ring-error' : ''}`}>
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={product.name}
                                    width={40}
                                    height={40}
                                    className="product-list-image-img"
                                    unoptimized
                                  />
                                ) : (
                                  <IconImage className="w-5 h-5 text-text-tertiary" />
                                )}
                              </div>
                            )}

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

                            {/* Chevron (only in normal mode) */}
                            {!isSelectionMode && (
                              <div className="text-text-tertiary ml-2">
                                <IconChevronRight className="w-5 h-5" />
                              </div>
                            )}
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
                    <IconArrowUp className="w-4 h-4" />
                    Volver arriba
                  </button>
                )}
              </>
            )}

            {/* Empty state - no products at all */}
            {products.length === 0 && (
              <div className="empty-state-fill">
                <IconProducts className="empty-state-icon" />
                <h3 className="empty-state-title">No hay productos</h3>
                <p className="empty-state-description">
                  Agrega tu primer producto para comenzar
                </p>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="btn btn-primary mt-4"
                >
                  Agregar producto
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Pedidos tab */
          <div className="page-body space-y-4 page-stagger">
            {error && !isOrderModalOpen && (
              <div className="p-4 bg-error-subtle text-error rounded-lg">
                {error}
              </div>
            )}

            {/* No products yet - can't create orders */}
            {products.length === 0 ? (
              <div className="empty-state-fill">
                <IconProducts className="empty-state-icon" />
                <h3 className="empty-state-title">No hay productos</h3>
                <p className="empty-state-description">
                  Agrega productos primero para poder crear pedidos
                </p>
              </div>
            ) : orders.length === 0 ? (
              /* Products exist but no orders yet */
              <div className="empty-state-fill">
                <IconInventory className="empty-state-icon" />
                <h3 className="empty-state-title">No hay pedidos</h3>
                <p className="empty-state-description">
                  Registra tu primer pedido
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewOrder}
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
                  <IconSearch className="search-bar-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por proveedor o fecha..."
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className="search-bar-input"
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="search-bar-clear"
                      aria-label="Limpiar busqueda"
                    >
                      <IconClose className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status Filter Tabs */}
                <div className="filter-tabs">
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('all')}
                    className={`filter-tab ${orderStatusFilter === 'all' ? 'filter-tab-active' : ''}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('pending')}
                    className={`filter-tab ${orderStatusFilter === 'pending' ? 'filter-tab-active' : ''}`}
                  >
                    Pendientes ({orders.filter(o => o.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderStatusFilter('received')}
                    className={`filter-tab ${orderStatusFilter === 'received' ? 'filter-tab-active' : ''}`}
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
                      onClick={handleOpenNewOrder}
                      className="btn btn-primary btn-sm"
                    >
                      <IconAdd className="w-4 h-4" />
                      Nuevo Pedido
                    </button>
                  </div>

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
                            onClick={() => handleOpenOrderDetail(order)}
                            role="button"
                            tabIndex={0}
                          >
                            {/* Status indicator */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isPending
                                ? 'bg-warning-subtle text-warning'
                                : 'bg-success-subtle text-success'
                            }`}>
                              <IconInventory className="w-5 h-5" />
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
                              <IconChevronRight className="w-5 h-5" />
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
                    <IconArrowUp className="w-4 h-4" />
                    Volver arriba
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Editar producto' : 'Agregar producto'}
      >
        <Modal.Step title={editingProduct ? 'Editar producto' : 'Agregar producto'}>
          {error && (
            <Modal.Item>
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            </Modal.Item>
          )}

          {/* Image upload */}
          <Modal.Item>
            <label className="label">Imagen</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="image-preview">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  width={120}
                  height={120}
                  className="image-preview-img"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="image-preview-remove"
                  title="Eliminar imagen"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="image-upload-zone"
              >
                <IconImage className="w-8 h-8 text-text-tertiary mb-2" />
                <span className="text-sm text-text-secondary">
                  Toca para agregar imagen
                </span>
                <span className="text-xs text-text-tertiary mt-1">
                  JPG, PNG, WebP o HEIC (max 5MB)
                </span>
              </button>
            )}
          </Modal.Item>

          {/* Name */}
          <Modal.Item>
            <label htmlFor="name" className="label">Nombre <span className="text-error">*</span></label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Ej: Chifle Grande"
              autoComplete="off"
            />
          </Modal.Item>

          {/* Price and Category inline */}
          <Modal.Item>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="price" className="label">Precio (S/) <span className="text-error">*</span></label>
                <div className="input-number-wrapper">
                  <input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="input"
                    placeholder="0.00"
                  />
                  <div className="input-number-spinners">
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice((current + 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Incrementar precio"
                    >
                      <IconArrowUp />
                    </button>
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice(Math.max(0, current - 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Decrementar precio"
                    >
                      <IconArrowDown />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label htmlFor="category" className="label">Categoria <span className="text-error">*</span></label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value as ProductCategory | '')}
                  className={`input ${category === '' ? 'select-placeholder' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {Object.entries(CATEGORY_CONFIG)
                    .sort(([, a], [, b]) => a.order - b.order)
                    .map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}{config.size ? ` (${config.size})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </Modal.Item>

          {/* Active toggle */}
          <Modal.Item>
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="label mb-0">Activo</span>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Mostrar en la lista de ventas
                </p>
              </div>
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="toggle"
              />
            </div>
          </Modal.Item>

          <Modal.Footer>
            {editingProduct && (
              <>
                {canDelete && (
                  <Modal.GoToStepButton step={3} className="btn-icon !bg-transparent text-error hover:!bg-error-subtle rounded-lg">
                    <IconTrash className="w-5 h-5" />
                  </Modal.GoToStepButton>
                )}
                <Modal.GoToStepButton step={1} className="modal-action-adjust">
                  <IconAdjust className="w-5 h-5" />
                </Modal.GoToStepButton>
              </>
            )}
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-secondary flex-1"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <SaveProductButton />
          </Modal.Footer>
        </Modal.Step>

        {/* Adjust inventory - mode selection step */}
        <Modal.Step title="Ajustar inventario">
          {/* Product info - flush layout */}
          {editingProduct && (
            <Modal.Item>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-bg-muted">
                  {editingProduct.image ? (
                    <Image
                      src={getProductImageUrl(editingProduct)!}
                      alt={editingProduct.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <IconImage className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{editingProduct.name}</div>
                  <div className="text-sm text-text-secondary">
                    Stock actual: <span className="font-medium">{editingProduct.stock ?? 0}</span>
                  </div>
                </div>
              </div>
            </Modal.Item>
          )}

          {/* Mode selection buttons - stacked vertically */}
          <Modal.Item>
            <Modal.GoToStepButton
              step={2}
              className="caja-action-btn caja-action-btn--horizontal w-full"
              onClick={() => {
                setAdjustmentMode('remove')
                setAdjustmentReason('')
              }}
            >
              <IconCircleMinus className="w-6 h-6 text-error flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">Remover</div>
                <div className="text-xs text-text-tertiary">Perdidas, danos, uso interno</div>
              </div>
            </Modal.GoToStepButton>
          </Modal.Item>

          <Modal.Item>
            <Modal.GoToStepButton
              step={2}
              className="caja-action-btn caja-action-btn--horizontal w-full"
              onClick={() => {
                setAdjustmentMode('add')
                setAdjustmentReason('')
              }}
            >
              <IconCirclePlus className="w-6 h-6 text-success flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">Agregar</div>
                <div className="text-xs text-text-tertiary">Correcciones, devoluciones</div>
              </div>
            </Modal.GoToStepButton>
          </Modal.Item>

          <Modal.Footer>
            <Modal.CancelBackButton className="btn btn-secondary flex-1">
              Cancelar
            </Modal.CancelBackButton>
          </Modal.Footer>
        </Modal.Step>

        {/* Adjust inventory - form step */}
        <Modal.Step title={adjustmentMode === 'remove' ? 'Remover stock' : 'Agregar stock'}>
          {error && (
            <Modal.Item>
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            </Modal.Item>
          )}

          {/* Quantity */}
          <Modal.Item>
            <label className="label">Cantidad</label>
            <input
              type="number"
              inputMode="numeric"
              value={adjustmentQuantity}
              onChange={e => setAdjustmentQuantity(e.target.value)}
              className="input text-lg"
              placeholder="0"
              min="1"
              max={adjustmentMode === 'remove' ? (editingProduct?.stock ?? 0) : undefined}
              autoFocus
            />
          </Modal.Item>

          {/* Reason dropdown */}
          <Modal.Item>
            <label className="label">Motivo</label>
            <select
              value={adjustmentReason}
              onChange={e => setAdjustmentReason(e.target.value)}
              className="input"
            >
              <option value="">Seleccionar motivo...</option>
              {adjustmentMode === 'remove' ? (
                <>
                  <option value="Producto danado">Producto danado</option>
                  <option value="Producto vencido">Producto vencido</option>
                  <option value="Perdida">Perdida</option>
                  <option value="Conteo incorrecto">Conteo incorrecto</option>
                  <option value="Uso interno">Uso interno</option>
                  <option value="Otro">Otro</option>
                </>
              ) : (
                <>
                  <option value="Conteo incorrecto">Conteo incorrecto</option>
                  <option value="Envio extra">Envio extra</option>
                  <option value="Devolucion">Devolucion</option>
                  <option value="Otro">Otro</option>
                </>
              )}
            </select>
          </Modal.Item>

          {/* Notes */}
          <Modal.Item>
            <label className="label">Notas (opcional)</label>
            <textarea
              value={adjustmentNotes}
              onChange={e => setAdjustmentNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Detalles adicionales..."
            />
          </Modal.Item>

          {/* Preview */}
          {editingProduct && adjustmentQuantity && (
            <Modal.Item>
              <div className={`p-3 rounded-lg text-sm ${adjustmentMode === 'remove' ? 'bg-error-subtle' : 'bg-success-subtle'}`}>
                <span className="text-text-secondary">Nuevo stock: </span>
                <span className="font-semibold">
                  {adjustmentMode === 'add'
                    ? (editingProduct.stock ?? 0) + parseInt(adjustmentQuantity || '0', 10)
                    : Math.max(0, (editingProduct.stock ?? 0) - parseInt(adjustmentQuantity || '0', 10))
                  }
                </span>
                <span className="text-text-tertiary ml-2">
                  (actual: {editingProduct.stock ?? 0})
                </span>
              </div>
            </Modal.Item>
          )}

          <Modal.Footer>
            <Modal.CancelBackButton className="btn btn-secondary flex-1" disabled={isAdjusting}>
              Atras
            </Modal.CancelBackButton>
            <button
              type="button"
              onClick={handleSaveAdjustment}
              className={`btn flex-1 ${adjustmentMode === 'remove' ? 'btn-danger' : 'btn-primary'}`}
              disabled={isAdjusting || !adjustmentQuantity || !adjustmentReason}
            >
              {isAdjusting ? <Spinner /> : (adjustmentMode === 'remove' ? 'Remover' : 'Agregar')}
            </button>
          </Modal.Footer>
        </Modal.Step>

        {/* Delete confirmation step */}
        <Modal.Step title="Eliminar producto" backStep={0}>
          <Modal.Item>
            <p className="text-text-secondary">
              Estas seguro que deseas eliminar <strong>{editingProduct?.name}</strong>? Esta accion no se puede deshacer.
            </p>
          </Modal.Item>

          <Modal.Footer>
            <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
              Cancelar
            </Modal.GoToStepButton>
            <ConfirmDeleteProductButton />
          </Modal.Footer>
        </Modal.Step>

        {/* Delete success step */}
        <Modal.Step title="Producto eliminado" hideBackButton>
          <Modal.Item>
            <div className="flex flex-col items-center text-center py-4">
              {/* Lottie animation */}
              <div style={{ width: 160, height: 160 }}>
                {productDeleted && (
                  <LottiePlayer
                    src="/animations/error.json"
                    loop={false}
                    autoplay={true}
                    delay={500}
                    style={{ width: 160, height: 160 }}
                  />
                )}
              </div>
              <p
                className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                style={{ opacity: productDeleted ? 1 : 0 }}
              >
                Producto eliminado
              </p>
              <p
                className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                style={{ opacity: productDeleted ? 1 : 0 }}
              >
                El producto ha sido eliminado correctamente
              </p>
            </div>
          </Modal.Item>

          <Modal.Footer>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              Listo
            </button>
          </Modal.Footer>
        </Modal.Step>

        {/* Step 5: Product saved success */}
        <Modal.Step title={editingProduct ? 'Producto actualizado' : 'Producto creado'} hideBackButton>
          <Modal.Item>
            <div className="flex flex-col items-center text-center py-4">
              {/* Lottie animation */}
              <div style={{ width: 160, height: 160 }}>
                {productSaved && (
                  <LottiePlayer
                    src="/animations/success.json"
                    loop={false}
                    autoplay={true}
                    delay={500}
                    style={{ width: 160, height: 160 }}
                  />
                )}
              </div>

              {/* Confirmation text with fade-in */}
              <p
                className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                style={{ opacity: productSaved ? 1 : 0 }}
              >
                {editingProduct ? 'Cambios guardados!' : 'Producto agregado!'}
              </p>
              <p
                className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                style={{ opacity: productSaved ? 1 : 0 }}
              >
                {editingProduct ? 'El producto ha sido actualizado' : 'El producto ha sido creado correctamente'}
              </p>
            </div>
          </Modal.Item>

          <Modal.Footer>
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-primary flex-1"
            >
              Listo
            </button>
          </Modal.Footer>
        </Modal.Step>
      </Modal>

      {/* New Order Modal - 3 Step Flow */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false)
          resetOrderForm()
        }}
        title="Nuevo Pedido"
        size="large"
      >
        {/* Step 1: Select Products */}
        <Modal.Step title="Seleccionar productos">
          {/* Search bar */}
          <Modal.Item>
            <div className="search-bar">
              <IconSearch className="search-bar-icon" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={orderProductSearchQuery}
                onChange={e => setOrderProductSearchQuery(e.target.value)}
                className="search-bar-input"
              />
            </div>
          </Modal.Item>

          {/* Products list - compact horizontal cards */}
          <Modal.Item>
            <div className="space-y-2">
              {orderFilteredProducts.map(product => {
                const isSelected = orderItems.some(i => i.product.id === product.id)
                const stockValue = product.stock ?? 0
                const isOutOfStock = stockValue === 0
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleToggleProductInOrder(product)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                    style={{
                      border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected ? 'var(--color-brand-subtle)' : 'var(--color-bg-surface)',
                    }}
                  >
                    {/* Product image */}
                    <div className="w-10 h-10 rounded-lg bg-bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {getProductImageUrl(product, '100x100') ? (
                        <Image
                          src={getProductImageUrl(product, '100x100')!}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <IconImage className="w-5 h-5 text-text-tertiary" />
                      )}
                    </div>
                    {/* Product name and stock */}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium truncate block">
                        {product.name}
                      </span>
                      <span className={`text-xs ${isOutOfStock ? 'text-error' : 'text-text-tertiary'}`}>
                        {stockValue} uds
                      </span>
                    </div>
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                        <IconCheck className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </Modal.Item>

          <Modal.Footer>
            <div className="w-full flex flex-col gap-3">
              {/* Summary */}
              <div className={`flex items-center justify-center p-2 rounded-lg ${
                orderItems.length > 0 ? 'bg-brand-subtle' : 'bg-bg-muted'
              }`}>
                <span className={`text-sm font-medium ${
                  orderItems.length > 0 ? 'text-brand' : 'text-text-tertiary'
                }`}>
                  {orderItems.length} {orderItems.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </span>
              </div>
              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOrderModalOpen(false)
                    resetOrderForm()
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <Modal.NextButton
                  className="btn btn-primary flex-1"
                  disabled={orderItems.length === 0}
                >
                  Continuar
                </Modal.NextButton>
              </div>
            </div>
          </Modal.Footer>
        </Modal.Step>

        {/* Step 2: Review Quantities */}
        <Modal.Step title="Revisar cantidades">
          <Modal.Item>
            <div className="space-y-3">
              {orderItems.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getProductImageUrl(item.product, '100x100') ? (
                      <Image
                        src={getProductImageUrl(item.product, '100x100')!}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <IconImage className="w-5 h-5 text-text-tertiary" />
                    )}
                  </div>
                  {/* Product name */}
                  <span className="flex-1 text-sm font-medium truncate min-w-0">
                    {item.product.name}
                  </span>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                        item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                      }`}
                    >
                      <IconCircleMinus className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          // Allow blank temporarily, will reset on blur
                          setOrderItems(prev => prev.map(i =>
                            i.product.id === item.product.id
                              ? { ...i, quantity: '' as unknown as number }
                              : i
                          ))
                        } else {
                          const num = parseInt(val, 10)
                          if (!isNaN(num)) {
                            handleUpdateOrderItemQuantity(item.product.id, Math.max(1, num))
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (isNaN(val) || val < 1) {
                          handleUpdateOrderItemQuantity(item.product.id, 1)
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-10 text-center font-semibold bg-primary text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                    >
                      <IconCirclePlus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Modal.Item>

          <Modal.Footer>
            <div className="w-full flex flex-col gap-3">
              {/* Summary */}
              <div className="flex items-center justify-center p-2 bg-bg-muted rounded-lg">
                <span className="text-sm font-medium text-text-secondary">
                  {orderItems.reduce((sum, i) => sum + i.quantity, 0)} unidades en total
                </span>
              </div>
              {/* Buttons */}
              <div className="flex gap-3">
                <Modal.BackButton className="btn btn-secondary flex-1">
                  Atras
                </Modal.BackButton>
                <Modal.NextButton className="btn btn-primary flex-1">
                  Continuar
                </Modal.NextButton>
              </div>
            </div>
          </Modal.Footer>
        </Modal.Step>

        {/* Step 3: Order Details */}
        <Modal.Step title="Detalles del pedido">
          {error && (
            <Modal.Item>
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            </Modal.Item>
          )}

          {/* Total & Provider - inline */}
          <Modal.Item>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="orderTotal" className="label">Total pagado (S/) <span className="text-error">*</span></label>
                <div className="input-number-wrapper">
                  <input
                    id="orderTotal"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={orderTotal}
                    onChange={e => setOrderTotal(e.target.value)}
                    className="input"
                    placeholder="0.00"
                  />
                  <div className="input-number-spinners">
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(orderTotal) || 0
                        setOrderTotal((current + 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Incrementar total"
                    >
                      <IconArrowUp />
                    </button>
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(orderTotal) || 0
                        setOrderTotal(Math.max(0, current - 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label="Decrementar total"
                    >
                      <IconArrowDown />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="orderProvider" className="label">Proveedor</label>
                <div className="relative">
                  <select
                    id="orderProvider"
                    value={orderProvider}
                    onChange={e => setOrderProvider(e.target.value)}
                    className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                    style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
                  >
                    <option value="">N/A</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <IconChevronDown className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </Modal.Item>

          {/* Estimated Arrival */}
          <Modal.Item>
            <label className="label">Fecha estimada de llegada (opcional)</label>
            <div className="relative">
              {/* Visual display */}
              <div className={`input w-full flex items-center justify-between pointer-events-none ${orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}`}>
                <span>{orderEstimatedArrival ? formatDate(orderEstimatedArrival) : 'Seleccionar fecha...'}</span>
                <IconCalendarTime className="w-5 h-5 text-text-tertiary" />
              </div>
              {/* Invisible native date input overlay */}
              <input
                type="date"
                value={orderEstimatedArrival}
                onChange={e => setOrderEstimatedArrival(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </Modal.Item>

          {/* Receipt/Proof of Purchase */}
          <Modal.Item>
            <label className="label">Comprobante (opcional)</label>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  setOrderReceiptFile(file)
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader()
                    reader.onload = () => setOrderReceiptPreview(reader.result as string)
                    reader.readAsDataURL(file)
                  } else {
                    setOrderReceiptPreview(null)
                  }
                }
              }}
              className="hidden"
            />
            {orderReceiptPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orderReceiptPreview}
                  alt="Comprobante"
                  className="w-full h-40 object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => {
                    setOrderReceiptFile(null)
                    setOrderReceiptPreview(null)
                    if (receiptInputRef.current) receiptInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 p-1 bg-bg-surface rounded-full border border-border"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            ) : orderReceiptFile ? (
              <div className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                <span className="text-sm text-text-secondary truncate flex-1 min-w-0">{orderReceiptFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOrderReceiptFile(null)
                    if (receiptInputRef.current) receiptInputRef.current.value = ''
                  }}
                  className="p-1"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="input w-full text-left text-text-tertiary flex items-center justify-between"
              >
                <span>Adjuntar imagen o PDF...</span>
                <IconImage className="w-5 h-5" />
              </button>
            )}
          </Modal.Item>

          {/* Notes */}
          <Modal.Item>
            <label htmlFor="orderNotes" className="label">Notas (opcional)</label>
            <textarea
              id="orderNotes"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Notas del pedido..."
            />
          </Modal.Item>

          <Modal.Footer>
            <Modal.BackButton className="btn btn-secondary flex-1">
              Atras
            </Modal.BackButton>
            <Modal.NextButton
              className="btn btn-primary flex-1"
              disabled={!orderTotal || parseFloat(orderTotal) <= 0}
            >
              Revisar
            </Modal.NextButton>
          </Modal.Footer>
        </Modal.Step>

        {/* Step 4: Confirmation */}
        <Modal.Step title="Confirmar pedido">
          {error && (
            <Modal.Item>
              <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                {error}
              </div>
            </Modal.Item>
          )}

          {/* Products list - compact */}
          <Modal.Item>
            <div className="space-y-1">
              {orderItems.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.product.name}</span>
                  <span className="text-text-secondary">{item.quantity}x</span>
                </div>
              ))}
            </div>
          </Modal.Item>

          {/* Divider */}
          <Modal.Item>
            <div className="border-t border-dashed border-border" />
          </Modal.Item>

          {/* Details */}
          <Modal.Item>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Total</span>
                <span className="font-semibold">{orderTotal ? `S/ ${parseFloat(orderTotal).toFixed(2)}` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Proveedor</span>
                <span>{providers.find(p => p.id === orderProvider)?.name || '—'}</span>
              </div>
              {orderEstimatedArrival && (
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Llegada est.</span>
                  <span>{formatDate(orderEstimatedArrival)}</span>
                </div>
              )}
              {orderReceiptFile && (
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Comprobante</span>
                  <span className="text-success">Adjunto</span>
                </div>
              )}
              {orderNotes && (
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Notas</span>
                  <span className="text-right max-w-[60%] truncate">{orderNotes}</span>
                </div>
              )}
            </div>
          </Modal.Item>

          <Modal.Footer>
            <Modal.BackButton className="btn btn-secondary flex-1" disabled={isSavingOrder}>
              Atras
            </Modal.BackButton>
            <ConfirmOrderButton disabled={isSavingOrder} />
          </Modal.Footer>
        </Modal.Step>

        {/* Step 5: Success */}
        <Modal.Step title="Pedido creado" hideBackButton>
          <Modal.Item>
            <div className="flex flex-col items-center text-center py-4">
              {/* Lottie animation */}
              <div style={{ width: 160, height: 160 }}>
                {orderSaved && (
                  <LottiePlayer
                    src="/animations/success.json"
                    loop={false}
                    autoplay={true}
                    delay={500}
                    style={{ width: 160, height: 160 }}
                  />
                )}
              </div>

              {/* Confirmation text with fade-in */}
              <p
                className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                style={{ opacity: orderSaved ? 1 : 0 }}
              >
                Pedido registrado!
              </p>
              <p
                className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                style={{ opacity: orderSaved ? 1 : 0 }}
              >
                El pedido ha sido guardado correctamente
              </p>
            </div>
          </Modal.Item>

          <Modal.Footer>
            <button
              type="button"
              onClick={() => {
                setIsOrderModalOpen(false)
                resetOrderForm()
              }}
              className="btn btn-primary flex-1"
            >
              Cerrar
            </button>
          </Modal.Footer>
        </Modal.Step>
      </Modal>

      {/* Order Detail Modal - Combined with Receive and Delete steps */}
      {viewingOrder && (
        <Modal
          isOpen={isOrderDetailModalOpen}
          onClose={() => setIsOrderDetailModalOpen(false)}
          onExitComplete={() => {
            setViewingOrder(null)
            setReceivedQuantities({})
          }}
          title="Detalle del Pedido"
          size="large"
        >
          {/* Step 0: Order Details */}
          <Modal.Step title="Detalle del Pedido">
            {/* Products list - compact */}
            <Modal.Item>
              <div className="space-y-1">
                {viewingOrder.expand?.['order_items(order)']?.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{item.expand?.product?.name || 'Producto'}</span>
                    <span className="text-text-secondary">{item.quantity}x</span>
                  </div>
                ))}
              </div>
            </Modal.Item>

            {/* Divider */}
            <Modal.Item>
              <div className="border-t border-dashed border-border" />
            </Modal.Item>

            {/* Details */}
            <Modal.Item>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Total</span>
                  <span className="font-semibold">{formatCurrency(viewingOrder.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Proveedor</span>
                  <span>{viewingOrder.expand?.provider?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Estado</span>
                  <span className={viewingOrder.status === 'pending' ? 'text-warning' : 'text-success'}>
                    {viewingOrder.status === 'pending' ? 'Pendiente' : 'Recibido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Fecha</span>
                  <span>{formatDate(new Date(viewingOrder.date))}</span>
                </div>
                {viewingOrder.estimatedArrival && viewingOrder.status === 'pending' && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Llegada est.</span>
                    <span>{formatDate(new Date(viewingOrder.estimatedArrival))}</span>
                  </div>
                )}
                {viewingOrder.receivedDate && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Fecha recibido</span>
                    <span>{formatDate(new Date(viewingOrder.receivedDate))}</span>
                  </div>
                )}
                {viewingOrder.receipt && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Comprobante</span>
                    <a
                      href={getOrderReceiptUrl(viewingOrder) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand"
                    >
                      Ver adjunto
                    </a>
                  </div>
                )}
                {viewingOrder.notes && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Notas</span>
                    <span className="text-right max-w-[60%] truncate">{viewingOrder.notes}</span>
                  </div>
                )}
              </div>
            </Modal.Item>

            {/* Footer for pending orders */}
            {viewingOrder.status === 'pending' ? (
              <Modal.Footer>
                {canDelete && (
                  <Modal.GoToStepButton
                    step={4}
                    className="btn-icon !bg-transparent text-error hover:!bg-error-subtle rounded-lg"
                    title="Eliminar pedido"
                  >
                    <IconTrash className="w-5 h-5" />
                  </Modal.GoToStepButton>
                )}
                <GoToEditStepButton order={viewingOrder} />
                <button
                  type="button"
                  onClick={() => setIsOrderDetailModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <GoToReceiveStepButton order={viewingOrder} />
              </Modal.Footer>
            ) : (
              <Modal.Footer>
                <button
                  type="button"
                  onClick={() => setIsOrderDetailModalOpen(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cerrar
                </button>
              </Modal.Footer>
            )}
          </Modal.Step>

          {/* Step 1: Edit Order */}
          <Modal.Step title="Editar Pedido" backStep={0}>
            {error && (
              <Modal.Item>
                <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
                  {error}
                </div>
              </Modal.Item>
            )}

            {/* Products with quantities */}
            <Modal.Item>
              <label className="label">Productos</label>
              <div className="space-y-3">
                {orderItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                    {/* Product image */}
                    <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                      {getProductImageUrl(item.product, '100x100') ? (
                        <Image
                          src={getProductImageUrl(item.product, '100x100')!}
                          alt={item.product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <IconImage className="w-5 h-5 text-text-tertiary" />
                      )}
                    </div>
                    {/* Product name */}
                    <span className="flex-1 text-sm font-medium truncate min-w-0">
                      {item.product.name}
                    </span>
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                          item.quantity <= 1 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                        }`}
                      >
                        <IconCircleMinus className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setOrderItems(prev => prev.map(i =>
                              i.product.id === item.product.id
                                ? { ...i, quantity: '' as unknown as number }
                                : i
                            ))
                          } else {
                            const num = parseInt(val, 10)
                            if (!isNaN(num)) {
                              handleUpdateOrderItemQuantity(item.product.id, Math.max(1, num))
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (isNaN(val) || val < 1) {
                            handleUpdateOrderItemQuantity(item.product.id, 1)
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-10 text-center font-semibold bg-primary text-text-primary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                      >
                        <IconCirclePlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Modal.Item>

            {/* Total & Provider */}
            <Modal.Item>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="editOrderTotal" className="label">Total pagado (S/) <span className="text-error">*</span></label>
                  <div className="input-number-wrapper">
                    <input
                      id="editOrderTotal"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={orderTotal}
                      onChange={e => setOrderTotal(e.target.value)}
                      className="input"
                      placeholder="0.00"
                    />
                    <div className="input-number-spinners">
                      <button
                        type="button"
                        className="input-number-spinner"
                        onClick={() => {
                          const current = parseFloat(orderTotal) || 0
                          setOrderTotal((current + 1).toFixed(2))
                        }}
                        tabIndex={-1}
                        aria-label="Incrementar total"
                      >
                        <IconArrowUp />
                      </button>
                      <button
                        type="button"
                        className="input-number-spinner"
                        onClick={() => {
                          const current = parseFloat(orderTotal) || 0
                          setOrderTotal(Math.max(0, current - 1).toFixed(2))
                        }}
                        tabIndex={-1}
                        aria-label="Decrementar total"
                      >
                        <IconArrowDown />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="editOrderProvider" className="label">Proveedor</label>
                  <div className="relative">
                    <select
                      id="editOrderProvider"
                      value={orderProvider}
                      onChange={e => setOrderProvider(e.target.value)}
                      className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                      style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
                    >
                      <option value="">N/A</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <IconChevronDown className="w-5 h-5 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </Modal.Item>

            {/* Estimated Arrival */}
            <Modal.Item>
              <label className="label">Fecha estimada de llegada (opcional)</label>
              <div className="relative">
                {/* Visual display */}
                <div className={`input w-full flex items-center justify-between pointer-events-none ${orderEstimatedArrival ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  <span>{orderEstimatedArrival ? formatDate(orderEstimatedArrival) : 'Seleccionar fecha...'}</span>
                  <IconCalendarTime className="w-5 h-5 text-text-tertiary" />
                </div>
                {/* Invisible native date input overlay */}
                <input
                  type="date"
                  value={orderEstimatedArrival}
                  onChange={e => setOrderEstimatedArrival(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </Modal.Item>

            {/* Notes */}
            <Modal.Item>
              <label htmlFor="editOrderNotes" className="label">Notas (opcional)</label>
              <textarea
                id="editOrderNotes"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="Notas del pedido..."
              />
            </Modal.Item>

            <Modal.Footer>
              <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
                Cancelar
              </Modal.GoToStepButton>
              <ConfirmEditOrderInDetailButton disabled={isSavingOrder || !orderTotal || parseFloat(orderTotal) <= 0} />
            </Modal.Footer>
          </Modal.Step>

          {/* Step 2: Edit Success */}
          <Modal.Step title="Pedido actualizado" hideBackButton>
            <Modal.Item>
              <div className="flex flex-col items-center text-center py-4">
                <div style={{ width: 160, height: 160 }}>
                  {editOrderSaved && (
                    <LottiePlayer
                      src="/animations/success.json"
                      loop={false}
                      autoplay={true}
                      delay={500}
                      style={{ width: 160, height: 160 }}
                    />
                  )}
                </div>
                <p
                  className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                  style={{ opacity: editOrderSaved ? 1 : 0 }}
                >
                  Pedido actualizado!
                </p>
                <p
                  className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                  style={{ opacity: editOrderSaved ? 1 : 0 }}
                >
                  Los cambios han sido guardados
                </p>
              </div>
            </Modal.Item>
            <Modal.Footer>
              <button
                type="button"
                onClick={() => {
                  setIsOrderDetailModalOpen(false)
                }}
                className="btn btn-primary flex-1"
              >
                Cerrar
              </button>
            </Modal.Footer>
          </Modal.Step>

          {/* Step 3: Receive Order */}
          <Modal.Step title="Recibir Pedido" backStep={0}>
            <Modal.Item>
              <div className="p-4 rounded-lg bg-bg-muted">
                <div className="flex justify-between mb-2">
                  <span className="text-text-secondary">Fecha:</span>
                  <span className="font-medium">{formatDate(new Date(viewingOrder.date))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total pagado:</span>
                  <span className="font-bold text-error">-{formatCurrency(viewingOrder.total)}</span>
                </div>
              </div>
            </Modal.Item>

            <Modal.Item>
              <p className="label">Productos a recibir:</p>
              <p className="text-xs text-text-tertiary mb-2">Ajusta las cantidades si recibiste menos de lo ordenado</p>
              <div className="space-y-3">
                {viewingOrder.expand?.['order_items(order)']?.map(item => {
                  const product = item.expand?.product
                  const orderedQty = item.quantity
                  const receivedQty = receivedQuantities[item.id] ?? orderedQty
                  const isDifferent = receivedQty !== orderedQty

                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-bg-muted rounded-lg">
                      {/* Product image */}
                      <div className="w-12 h-12 rounded-lg bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product && getProductImageUrl(product, '100x100') ? (
                          <Image
                            src={getProductImageUrl(product, '100x100')!}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <IconImage className="w-5 h-5 text-text-tertiary" />
                        )}
                      </div>
                      {/* Product name and ordered qty */}
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{product?.name || 'Producto'}</span>
                        <span className="text-xs text-text-tertiary">Ordenado: {orderedQty}</span>
                      </div>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReceivedQuantities(prev => ({
                            ...prev,
                            [item.id]: Math.max(0, (prev[item.id] ?? orderedQty) - 1)
                          }))}
                          disabled={receivedQty <= 0}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 ${
                            receivedQty <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-90'
                          }`}
                        >
                          <IconCircleMinus className="w-5 h-5" />
                        </button>
                        <span className={`w-10 text-center font-semibold ${
                          receivedQty === 0 ? 'text-error' : isDifferent ? 'text-warning' : 'text-text-primary'
                        }`}>
                          {receivedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceivedQuantities(prev => ({
                            ...prev,
                            [item.id]: (prev[item.id] ?? orderedQty) + 1
                          }))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-100 active:scale-90"
                        >
                          <IconCirclePlus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Modal.Item>

            <Modal.Item>
              <div className="p-3 rounded-lg bg-warning-subtle text-warning text-sm">
                <IconWarning className="w-4 h-4 inline mr-2" />
                Al confirmar, el stock aumentara segun las cantidades indicadas.
              </div>
            </Modal.Item>

            <Modal.Footer>
              <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
                Atras
              </Modal.GoToStepButton>
              <ConfirmReceiveButton />
            </Modal.Footer>
          </Modal.Step>

          {/* Step 4: Delete Confirmation */}
          <Modal.Step title="Eliminar pedido" backStep={0}>
            <Modal.Item>
              <p className="text-text-secondary">
                Estas seguro que deseas eliminar el pedido del <strong>{formatDate(new Date(viewingOrder.date))}</strong>? Esta accion no se puede deshacer.
              </p>
            </Modal.Item>

            <Modal.Footer>
              <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
                Cancelar
              </Modal.GoToStepButton>
              <ConfirmDeleteButton />
            </Modal.Footer>
          </Modal.Step>

          {/* Step 5: Receive Success */}
          <Modal.Step title="Pedido recibido" hideBackButton>
            <Modal.Item>
              <div className="flex flex-col items-center text-center py-4">
                {/* Lottie animation */}
                <div style={{ width: 160, height: 160 }}>
                  {orderReceived && (
                    <LottiePlayer
                      src="/animations/success.json"
                      loop={false}
                      autoplay={true}
                      delay={500}
                      style={{ width: 160, height: 160 }}
                    />
                  )}
                </div>
                <p
                  className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                  style={{ opacity: orderReceived ? 1 : 0 }}
                >
                  Stock actualizado!
                </p>
                <p
                  className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                  style={{ opacity: orderReceived ? 1 : 0 }}
                >
                  El pedido ha sido recibido y el inventario actualizado
                </p>
              </div>
            </Modal.Item>

            <Modal.Footer>
              <button
                type="button"
                onClick={() => setIsOrderDetailModalOpen(false)}
                className="btn btn-primary flex-1"
              >
                Listo
              </button>
            </Modal.Footer>
          </Modal.Step>

          {/* Step 6: Delete Success */}
          <Modal.Step title="Pedido eliminado" hideBackButton>
            <Modal.Item>
              <div className="flex flex-col items-center text-center py-4">
                {/* Lottie animation */}
                <div style={{ width: 160, height: 160 }}>
                  {orderDeleted && (
                    <LottiePlayer
                      src="/animations/error.json"
                      loop={false}
                      autoplay={true}
                      delay={500}
                      style={{ width: 160, height: 160 }}
                    />
                  )}
                </div>
                <p
                  className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
                  style={{ opacity: orderDeleted ? 1 : 0 }}
                >
                  Pedido eliminado
                </p>
                <p
                  className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
                  style={{ opacity: orderDeleted ? 1 : 0 }}
                >
                  El pedido ha sido eliminado correctamente
                </p>
              </div>
            </Modal.Item>

            <Modal.Footer>
              <button
                type="button"
                onClick={() => setIsOrderDetailModalOpen(false)}
                className="btn btn-primary flex-1"
              >
                Listo
              </button>
            </Modal.Footer>
          </Modal.Step>
        </Modal>
      )}

      {/* Sort bottom sheet */}
      <BottomSheet
        isOpen={isSortSheetOpen}
        onClose={() => setIsSortSheetOpen(false)}
        title="Ordenar por"
      >
        <div className="space-y-1">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSortBy(option.value)
                setIsSortSheetOpen(false)
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left hover:bg-bg-muted transition-colors"
            >
              <span className={sortBy === option.value ? 'font-medium text-brand' : 'text-text-primary'}>
                {option.label}
              </span>
              {sortBy === option.value && (
                <IconCheck className="w-5 h-5 text-brand" />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Edit options bottom sheet */}
      <BottomSheet
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        title="Editar productos"
      >
        <div className="user-menu-items">
          <button
            type="button"
            className="user-menu-item"
            onClick={() => {
              setIsEditSheetOpen(false)
              handleOpenAdd()
            }}
          >
            <IconAdd width={20} height={20} />
            <span>Agregar producto</span>
            <IconChevronRight width={16} height={16} className="user-menu-item-arrow" />
          </button>
          <button
            type="button"
            className="user-menu-item"
            onClick={handleEnterSelectionMode}
          >
            <IconSelect width={20} height={20} />
            <span>Seleccionar productos</span>
            <IconChevronRight width={16} height={16} className="user-menu-item-arrow" />
          </button>
        </div>
      </BottomSheet>

      {/* Bulk action bar (fixed above mobile nav when in selection mode) */}
      {isSelectionMode && selectedProducts.size > 0 && (
        <div
          className="fixed left-0 right-0 p-4 bg-bg-surface border-t border-border z-40 lg:ml-64 lg:bottom-0"
          style={{ bottom: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => handleBulkUpdateStatus(true)}
              className="btn btn-primary flex-1"
            >
              Activar
            </button>
            <button
              type="button"
              onClick={() => handleBulkUpdateStatus(false)}
              className="btn btn-danger flex-1"
            >
              Desactivar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
