// ============================================
// USER TYPES
// ============================================

export type UserRole = 'owner' | 'partner' | 'employee'
export type UserStatus = 'active' | 'disabled'
export type MembershipStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  email: string
  name: string
  status: UserStatus
  avatar?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================
// INVITE CODE TYPES
// ============================================

export type InviteRole = 'partner' | 'employee'

export interface InviteCode {
  id: string
  code: string // 6 uppercase alphanumeric chars
  role: InviteRole
  createdBy: string
  usedBy?: string
  expiresAt: Date | string
  used: boolean
  createdAt: Date | string
  expand?: {
    createdBy?: User
    usedBy?: User
  }
}

// ============================================
// PRODUCT CATEGORY TYPES
// ============================================

/** Legacy enum category - kept for backwards compatibility */
/** Custom product category */
export interface ProductCategory {
  id: string
  businessId: string
  name: string
  sortOrder: number
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================
// PRODUCT SETTINGS TYPES
// ============================================

export type SortPreference = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category' | 'stock_asc' | 'stock_desc'

export interface ProductSettings {
  id: string
  businessId: string
  defaultCategoryId?: string | null
  sortPreference: SortPreference
  createdAt: Date | string
  updatedAt: Date | string
  defaultCategory?: ProductCategory | null
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string
  businessId: string
  name: string
  price: number
  costPrice?: number | null
  status: 'active' | 'inactive' | 'archived'
  categoryId?: string | null
  productCategory?: ProductCategory | null
  icon?: string | null
  barcode?: string | null
  stock?: number | null
  lowStockThreshold?: number | null
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================
// SALE TYPES
// ============================================

export type PaymentMethod = 'cash' | 'card' | 'other'
export type SalesChannel = 'in_store' | 'online'

export interface Sale {
  id: string
  businessId: string
  date: Date | string
  total: number
  paymentMethod: PaymentMethod
  channel: SalesChannel
  employeeId: string
  notes?: string
  createdAt: Date | string
  expand?: {
    'sale_items(sale)'?: SaleItem[]
    employee?: User
  }
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string | null
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  createdAt: Date | string
  expand?: {
    sale?: Sale
    product?: Product
  }
}

// ============================================
// PROVIDER TYPES
// ============================================

export interface Provider {
  id: string
  businessId: string
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
  active: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

// ============================================
// ORDER TYPES (purchases from suppliers)
// ============================================

export type OrderStatus = 'pending' | 'received'

export interface Order {
  id: string
  businessId: string
  providerId?: string | null
  date: Date | string
  receivedDate?: Date | string | null
  total: number
  status: OrderStatus
  estimatedArrival?: Date | string | null
  receipt?: string | null
  notes?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface OrderItem {
  id: string
  orderId: string
  productId?: string | null
  productName: string
  quantity: number
  unitCost?: number | null
  subtotal?: number | null
  createdAt: Date | string
}

// ============================================
// OWNERSHIP TRANSFER TYPES
// ============================================

export type TransferStatus = 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled'

export interface OwnershipTransfer {
  id: string
  code: string
  fromUser: string
  toEmail: string
  toUser?: string
  status: TransferStatus
  expiresAt: Date | string
  acceptedAt?: Date | string
  completedAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
  expand?: {
    fromUser?: User
    toUser?: User
  }
}

// ============================================
// CART TYPES (UI state only)
// ============================================

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

// ============================================
// CASH DRAWER TYPES
// ============================================

export type CashMovementType = 'deposit' | 'withdrawal'

export type CashMovementCategory =
  | 'sale'            // Cash sale (deposit)
  | 'bank_withdrawal' // Bank withdrawal (deposit)
  | 'bank_deposit'    // Bank deposit (withdrawal)
  | 'other'           // Other

export interface CashSession {
  id: string
  businessId: string
  openedAt: Date | string
  closedAt?: Date | string | null
  openedBy: string
  closedBy?: string | null
  openingBalance: number
  closingBalance?: number | null
  expectedBalance?: number | null
  discrepancy?: number | null
  discrepancyNote?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  opener?: { name: string } | null
  closer?: { name: string } | null
}

export interface CashMovement {
  id: string
  sessionId: string
  type: CashMovementType
  category: CashMovementCategory
  amount: number
  note?: string | null
  saleId?: string | null
  createdBy: string
  editedBy?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  creator?: { name: string } | null
}

// ============================================
// BUSINESS ARCHIVE TYPES
// ============================================

export interface BusinessArchive {
  id: string
  businessId: string
  businessName: string
  deletedBy: string
  archiveData: string // JSON blob of all business data
  createdAt: Date | string
}
