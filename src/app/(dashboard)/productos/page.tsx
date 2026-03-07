'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import { Spinner } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { IconAdd, IconClose, IconTrash, IconImage, IconProducts, IconSearch, IconArrowUp, IconArrowDown, IconFilter, IconCheck, IconEdit, IconChevronRight, IconSelect, IconWarning, IconInventory } from '@/components/icons'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useAuth } from '@/contexts/auth-context'
import { getProductImageUrl } from '@/lib/products'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Product, ProductCategory, Order, OrderItem } from '@/types'

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
  }
}

// Modal component
function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'default',
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'large'
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${size === 'large' ? 'modal-lg' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Delete confirmation modal
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isDeleting
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  productName: string
  isDeleting: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Eliminar producto</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
            Estas seguro que deseas eliminar <strong>{productName}</strong>? Esta accion no se puede deshacer.
          </p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            style={{ flex: 1 }}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner /> : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
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

// LocalStorage key for product filters
const PRODUCT_FILTERS_KEY = 'chifles_product_filters'

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

  // Delete modal state
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Orders state (for Pedidos tab)
  const [orders, setOrders] = useState<ExpandedOrder[]>([])
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [orderItems, setOrderItems] = useState<{ product: Product; quantity: number }[]>([])
  const [orderTotal, setOrderTotal] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderEstimatedArrival, setOrderEstimatedArrival] = useState('')
  const [orderReceiptFile, setOrderReceiptFile] = useState<File | null>(null)
  const [orderReceiptPreview, setOrderReceiptPreview] = useState<string | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingOrder, setReceivingOrder] = useState<ExpandedOrder | null>(null)
  const [isReceiving, setIsReceiving] = useState(false)
  const [orderProductSearchQuery, setOrderProductSearchQuery] = useState('')

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
        const [productsRes, ordersRes] = await Promise.all([
          pb.collection('products').getFullList<Product>({
            sort: 'name',
            requestKey: null,
          }),
          pb.collection('orders').getFullList<ExpandedOrder>({
            sort: '-date',
            expand: 'order_items(order).product',
            requestKey: null,
          }),
        ])
        if (cancelled) return
        setProducts(productsRes)
        setOrders(ordersRes)
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Ingresa un precio valido')
      return
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

      handleCloseModal()
    } catch (err) {
      console.error('Error saving product:', err)
      setError('Error al guardar el producto')
    } finally {
      setIsSaving(false)
    }
  }, [name, price, category, active, imageFile, removeImage, editingProduct, pb, handleCloseModal])

  const handleDelete = useCallback(async () => {
    if (!deleteProduct) return

    setIsDeleting(true)

    try {
      await pb.collection('products').delete(deleteProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deleteProduct.id))
      setDeleteProduct(null)
      handleCloseModal()
    } catch (err) {
      console.error('Error deleting product:', err)
      setError('Error al eliminar el producto')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteProduct, pb, handleCloseModal])

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
    setOrderProductSearchQuery('')
    setError('')
  }, [])

  const handleOpenNewOrder = useCallback(() => {
    resetOrderForm()
    setIsOrderModalOpen(true)
  }, [resetOrderForm])

  const handleAddProductToOrder = useCallback((product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

  const handleUpdateOrderItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.product.id !== productId))
    } else {
      setOrderItems(prev => prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ))
    }
  }, [])

  const handleSaveOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      setError('Agrega al menos un producto')
      return
    }

    const totalNum = parseFloat(orderTotal)
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('Ingresa el total pagado')
      return
    }

    setIsSavingOrder(true)
    setError('')

    try {
      // Create the order using FormData for file upload
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
        expand: 'order_items(order).product',
        requestKey: null,
      })
      setOrders(updatedOrders)

      setIsOrderModalOpen(false)
      resetOrderForm()
    } catch (err) {
      console.error('Error saving order:', err)
      setError('Error al guardar el pedido')
    } finally {
      setIsSavingOrder(false)
    }
  }, [orderItems, orderTotal, orderNotes, orderEstimatedArrival, orderReceiptFile, pb, resetOrderForm])

  const handleOpenReceiveOrder = useCallback((order: ExpandedOrder) => {
    setReceivingOrder(order)
    setIsReceiveModalOpen(true)
  }, [])

  const handleReceiveOrder = useCallback(async () => {
    if (!receivingOrder || !user) return

    setIsReceiving(true)
    setError('')

    try {
      const now = new Date().toISOString()
      const orderItemsList = receivingOrder.expand?.['order_items(order)'] || []

      // Create inventory transactions and update stock for each item
      for (const item of orderItemsList) {
        const product = item.expand?.product
        if (!product) continue

        // Create inventory transaction
        await pb.collection('inventory_transactions').create({
          date: now,
          product: product.id,
          quantity: item.quantity,
          type: 'purchase',
          order: receivingOrder.id,
          createdBy: user.id,
          notes: `Pedido recibido`,
        })

        // Update product stock
        const currentStock = product.stock || 0
        await pb.collection('products').update(product.id, {
          stock: currentStock + item.quantity,
        })
      }

      // Update order status
      await pb.collection('orders').update(receivingOrder.id, {
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
          expand: 'order_items(order).product',
          requestKey: null,
        }),
      ])

      setProducts(productsRes)
      setOrders(ordersRes)
      setIsReceiveModalOpen(false)
      setReceivingOrder(null)
    } catch (err) {
      console.error('Error receiving order:', err)
      setError('Error al recibir el pedido')
    } finally {
      setIsReceiving(false)
    }
  }, [receivingOrder, user, pb])

  // Tab subtitle config
  const tabSubtitles: Record<PageTab, string> = {
    productos: 'Gestiona tu catalogo',
    pedidos: 'Pedidos a proveedores',
  }

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <PageHeader title="Productos" subtitle={tabSubtitles[activeTab]} />
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Productos"
        subtitle={tabSubtitles[activeTab]}
      />

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
              </>
            )}

            {/* Product List */}
            {products.length === 0 ? (
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
            ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <IconSearch className="empty-state-icon" />
              <h3 className="empty-state-title">Sin resultados</h3>
              <p className="empty-state-description">
                No se encontraron productos con ese criterio
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => {
                const imageUrl = getProductImageUrl(product, '100x100')
                const categoryConfig = product.category ? CATEGORY_CONFIG[product.category] : null
                const isSelected = selectedProducts.has(product.id)
                const stockValue = product.stock ?? 0
                const threshold = product.lowStockThreshold ?? 10
                const isLowStock = stockValue <= threshold

                return (
                  <div
                    key={product.id}
                    className="list-item-clickable"
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
                      {categoryConfig && (
                        <span className="text-xs text-text-tertiary mt-0.5 block">
                          {categoryConfig.label}
                        </span>
                      )}
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

            {/* Back to top button */}
            {filteredProducts.length > 5 && (
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <IconArrowUp className="w-4 h-4" />
                Volver arriba
              </button>
            )}
          </div>
        ) : (
          /* Pedidos tab */
          <div className="page-body space-y-4">
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
              /* Orders exist - show header and list */
              <>
                {/* Header with add button */}
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

              <div className="space-y-2">
                {orders.map(order => {
                  const items = order.expand?.['order_items(order)'] || []
                  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
                  const isPending = order.status === 'pending'

                  return (
                    <div
                      key={order.id}
                      className="list-item-clickable"
                      onClick={() => isPending ? handleOpenReceiveOrder(order) : undefined}
                      role={isPending ? 'button' : undefined}
                      tabIndex={isPending ? 0 : undefined}
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
                          {order.notes && (
                            <>
                              <span className="text-text-muted">·</span>
                              <span className="text-xs text-text-tertiary truncate">
                                {order.notes}
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
                      {isPending && (
                        <div className="text-text-tertiary ml-2">
                          <IconChevronRight className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
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
        footer={
          <>
            {editingProduct && canDelete && (
              <button
                type="button"
                onClick={() => {
                  setDeleteProduct(editingProduct)
                }}
                className="modal-action-delete"
                title="Eliminar producto"
              >
                <IconTrash className="w-5 h-5" />
              </button>
            )}
            <div className="modal-actions">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? <Spinner /> : 'Guardar'}
              </button>
            </div>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Image upload */}
          <div>
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
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">Nombre</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input"
              placeholder="Ej: Chifle Grande"
              autoComplete="off"
            />
          </div>

          {/* Price and Category inline */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="price" className="label">Precio (S/)</label>
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
              <label htmlFor="category" className="label">Categoria</label>
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

          {/* Active toggle */}
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
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={deleteProduct !== null}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        productName={deleteProduct?.name || ''}
        isDeleting={isDeleting}
      />

      {/* New Order Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false)
          resetOrderForm()
        }}
        title="Nuevo Pedido"
        size="large"
        footer={
          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                setIsOrderModalOpen(false)
                resetOrderForm()
              }}
              className="btn btn-secondary"
              disabled={isSavingOrder}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              className="btn btn-primary"
              disabled={isSavingOrder || orderItems.length === 0}
            >
              {isSavingOrder ? <Spinner /> : 'Guardar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Product search */}
          <div>
            <label className="label">Agregar productos</label>
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
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {orderFilteredProducts.slice(0, 10).map(product => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleAddProductToOrder(product)}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-brand hover:bg-brand-subtle transition-colors text-left min-w-0"
              >
                <div className="w-8 h-8 rounded bg-bg-muted flex items-center justify-center flex-shrink-0">
                  {getProductImageUrl(product, '100x100') ? (
                    <Image
                      src={getProductImageUrl(product, '100x100')!}
                      alt={product.name}
                      width={32}
                      height={32}
                      className="rounded"
                      unoptimized
                    />
                  ) : (
                    <IconImage className="w-4 h-4 text-text-tertiary" />
                  )}
                </div>
                <span className="text-sm truncate flex-1 min-w-0">{product.name}</span>
              </button>
            ))}
          </div>

          {/* Order items */}
          {orderItems.length > 0 && (
            <div>
              <label className="label">Productos en pedido</label>
              <div className="space-y-2">
                {orderItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm truncate min-w-0">{item.product.name}</span>
                    <div className="input-number-wrapper w-24 flex-shrink-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val) && val > 0) {
                            handleUpdateOrderItemQuantity(item.product.id, val)
                          }
                        }}
                        className="input"
                      />
                      <div className="input-number-spinners">
                        <button
                          type="button"
                          className="input-number-spinner"
                          onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity + 1)}
                          tabIndex={-1}
                        >
                          <IconArrowUp />
                        </button>
                        <button
                          type="button"
                          className="input-number-spinner"
                          onClick={() => handleUpdateOrderItemQuantity(item.product.id, item.quantity - 1)}
                          tabIndex={-1}
                        >
                          <IconArrowDown />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div>
            <label htmlFor="orderTotal" className="label">Total pagado (S/)</label>
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
          </div>

          {/* Estimated Arrival */}
          <div>
            <label htmlFor="orderEstimatedArrival" className="label">Fecha estimada de llegada (opcional)</label>
            <input
              id="orderEstimatedArrival"
              type="date"
              value={orderEstimatedArrival}
              onChange={e => setOrderEstimatedArrival(e.target.value)}
              className="input"
            />
          </div>

          {/* Receipt/Proof of Purchase */}
          <div>
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
                className="btn btn-secondary w-full"
              >
                <IconImage className="w-4 h-4" />
                Adjuntar comprobante
              </button>
            )}
            <p className="text-xs text-text-tertiary mt-1">Recibo, captura de Yape, etc.</p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="orderNotes" className="label">Notas (opcional)</label>
            <textarea
              id="orderNotes"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Notas del pedido..."
            />
          </div>
        </div>
      </Modal>

      {/* Receive Order Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false)
          setReceivingOrder(null)
        }}
        title="Recibir Pedido"
        footer={
          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                setIsReceiveModalOpen(false)
                setReceivingOrder(null)
              }}
              className="btn btn-secondary"
              disabled={isReceiving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReceiveOrder}
              className="btn btn-primary"
              disabled={isReceiving}
            >
              {isReceiving ? <Spinner /> : 'Confirmar Recepcion'}
            </button>
          </div>
        }
      >
        {receivingOrder && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-bg-muted">
              <div className="flex justify-between mb-2">
                <span className="text-text-secondary">Fecha:</span>
                <span className="font-medium">{formatDate(new Date(receivingOrder.date))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total pagado:</span>
                <span className="font-bold text-error">-{formatCurrency(receivingOrder.total)}</span>
              </div>
            </div>

            <div>
              <p className="label">Productos a recibir:</p>
              <div className="space-y-2">
                {receivingOrder.expand?.['order_items(order)']?.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                    <span>{item.expand?.product?.name || 'Producto'}</span>
                    <span className="font-medium text-success">+{item.quantity} unidades</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-warning-subtle text-warning text-sm">
              <IconWarning className="w-4 h-4 inline mr-2" />
              Al confirmar, el stock de estos productos aumentara automaticamente.
            </div>
          </div>
        )}
      </Modal>

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
    </div>
  )
}
