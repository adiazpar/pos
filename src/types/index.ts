// ============================================
// USER TYPES
// ============================================

export type UserRole = 'owner' | 'partner' | 'employee'
export type UserStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  email: string // Formatted phone as email (51987654321@phone.local) for PocketBase auth
  phoneNumber: string // E.164 format (+51987654321) for WhatsApp/display
  phoneVerified: boolean // Whether phone was verified via OTP
  name: string
  role: UserRole
  status: UserStatus
  pin?: string // Stored as SHA-256 hash for PIN verification
  pinResetRequired?: boolean // If true, user must reset PIN on next login
  invitedBy?: string // Relation ID to user who invited them
  avatar?: string // Optional avatar file
  created: string
  updated: string
  // Expanded relations
  expand?: {
    invitedBy?: User
  }
}

// ============================================
// INVITE CODE TYPES
// ============================================

export type InviteRole = 'partner' | 'employee'

export interface InviteCode {
  id: string
  code: string // 6 uppercase alphanumeric chars
  role: InviteRole
  createdBy: string // Relation ID to owner
  usedBy?: string // Relation ID to user who used it
  expiresAt: string // ISO date string
  used: boolean
  created: string
  // Expanded relations
  expand?: {
    createdBy?: User
    usedBy?: User
  }
}

// ============================================
// PRODUCT TYPES
// ============================================

export type ProductCategory = 'chifles_grande' | 'chifles_chico' | 'miel' | 'algarrobina' | 'postres'

export interface Product {
  id: string
  collectionId: string // Needed for image URL
  collectionName: string // Needed for image URL
  name: string
  price: number // Selling price per unit
  costPrice?: number // Estimated cost per unit (optional)
  active: boolean
  category?: ProductCategory // Product category for grouping
  image?: string // Filename from PocketBase
  stock?: number // Current stock quantity
  lowStockThreshold?: number // Alert threshold (default: 10)
  created: string
  updated: string
}

// ============================================
// SALE TYPES
// ============================================

export type PaymentMethod = 'cash' | 'yape' | 'pos'
export type SalesChannel = 'feria' | 'whatsapp'

export interface Sale {
  id: string
  date: string
  total: number
  paymentMethod: PaymentMethod
  channel: SalesChannel
  employee: string // Relation ID to users
  notes?: string
  created: string
  // Expanded relations
  expand?: {
    'sale_items(sale)'?: SaleItem[]
    employee?: User
  }
}

export interface SaleItem {
  id: string
  sale: string // Relation ID
  product?: string // Relation ID (optional - can be null if product was deleted)
  productName: string // Snapshot of product name at time of sale
  quantity: number
  unitPrice: number // Price charged (after any promo)
  subtotal: number
  created: string
  // Expanded relations
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
  name: string
  phone?: string
  email?: string
  notes?: string
  active: boolean
  created: string
  updated: string
}

// ============================================
// ORDER TYPES (purchases from suppliers)
// ============================================

export type OrderStatus = 'pending' | 'received'

export interface Order {
  id: string
  collectionId: string // Needed for file URL
  collectionName: string // Needed for file URL
  date: string
  receivedDate?: string
  total: number // Total paid to supplier
  status: OrderStatus
  estimatedArrival?: string // Estimated delivery date
  receipt?: string // Proof of purchase file (receipt, Yape screenshot)
  notes?: string
  provider?: string // Relation ID to provider
  created: string
  updated: string
  // Expanded relations
  expand?: {
    'order_items(order)'?: OrderItem[]
    provider?: Provider
  }
}

export interface OrderItem {
  id: string
  order: string // Relation ID
  product: string // Relation ID
  quantity: number // Units ordered
  created: string
  // Expanded relations
  expand?: {
    order?: Order
    product?: Product
  }
}

// ============================================
// OWNERSHIP TRANSFER TYPES
// ============================================

export type TransferStatus = 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled'

export interface OwnershipTransfer {
  id: string
  code: string // 8-char uppercase code
  fromUser: string // Relation ID to current owner
  toPhone: string // E.164 format
  toUser?: string // Relation ID to recipient (set when accepted)
  status: TransferStatus
  expiresAt: string // ISO date string
  acceptedAt?: string // ISO date string
  completedAt?: string // ISO date string
  created: string
  updated: string
  // Expanded relations
  expand?: {
    fromUser?: User
    toUser?: User
  }
}

// ============================================
// CART TYPES (for UI state, not stored in DB)
// ============================================

export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number // May differ from product.price if promo applied
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

// ============================================
// INVENTORY TRANSACTION TYPES
// ============================================

export type InventoryTransactionType =
  | 'purchase'   // Stock in from supplier order
  | 'sale'       // Stock out from customer sale
  | 'adjustment' // Manual stock adjustment
  | 'waste'      // Stock lost to waste/damage
  | 'correction' // Inventory count correction

export interface InventoryTransaction {
  id: string
  date: string
  product: string // Relation ID
  quantity: number // Positive = in, Negative = out
  type: InventoryTransactionType
  order?: string // Relation ID (for purchase type)
  sale?: string // Relation ID (for sale type)
  notes?: string
  createdBy: string // Relation ID to user
  created: string
  // Expanded relations
  expand?: {
    product?: Product
    order?: Order
    sale?: Sale
    createdBy?: User
  }
}

// ============================================
// CASH DRAWER TYPES
// ============================================

export type CashMovementType = 'ingreso' | 'retiro'

export type CashMovementCategory =
  | 'venta'              // Cash sale (ingreso) - auto from ventas
  | 'prestamo_empleado'  // Employee loan to drawer (ingreso)
  | 'retiro_banco'       // Bank withdrawal (ingreso)
  | 'devolucion_prestamo' // Repaying employee loan (retiro)
  | 'deposito_banco'     // Bank deposit (retiro)
  | 'otro'               // Other

export interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  openedBy: string
  closedBy?: string
  openingBalance: number
  closingBalance?: number
  expectedBalance?: number
  discrepancy?: number
  discrepancyNote?: string
  created: string
  updated: string
  expand?: {
    openedBy?: User
    closedBy?: User
    'cash_movements(session)'?: CashMovement[]
  }
}

export interface CashMovement {
  id: string
  session: string
  type: CashMovementType
  category: CashMovementCategory
  amount: number
  note?: string
  sale?: string
  employee?: string
  createdBy: string
  editedBy?: string
  created: string
  updated: string
  expand?: {
    session?: CashSession
    sale?: Sale
    employee?: User
    createdBy?: User
    editedBy?: User
  }
}
