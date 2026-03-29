import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ===========================================
// BUSINESSES (Multi-tenant support)
// ===========================================
export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// USERS
// ===========================================
// Simple email/password auth
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // bcrypt hash
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'disabled'] }).default('active').notNull(),
  avatar: text('avatar'), // Base64 or URL
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// BUSINESS USERS (Multi-business membership)
// ===========================================
// Join table enabling users to belong to multiple businesses
export const businessUsers = sqliteTable('business_users', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  businessId: text('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['owner', 'partner', 'employee'] }).notNull(),
  status: text('status', { enum: ['active', 'pending', 'disabled'] }).default('active').notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
  invitedBy: text('invited_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// PRODUCT CATEGORIES
// ===========================================
export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// PRODUCT SETTINGS
// ===========================================
export const productSettings = sqliteTable('product_settings', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull().unique(),
  defaultCategoryId: text('default_category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  sortPreference: text('sort_preference').default('name_asc'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// PRODUCTS
// ===========================================
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  costPrice: real('cost_price'),
  // Legacy category field (kept for backwards compatibility during migration)
  category: text('category', {
    enum: ['food', 'beverage', 'snack', 'dessert', 'other']
  }),
  // New foreign key to product_categories
  categoryId: text('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  stock: integer('stock').default(0),
  lowStockThreshold: integer('low_stock_threshold').default(10),
  icon: text('icon'), // Base64-encoded image data
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// SALES
// ===========================================
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  total: real('total').notNull(),
  paymentMethod: text('payment_method', { enum: ['cash', 'card', 'other'] }).notNull(),
  channel: text('channel', { enum: ['in_store', 'online'] }),
  employeeId: text('employee_id').references(() => users.id),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// SALE ITEMS
// ===========================================
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(), // Snapshot at time of sale
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// PROVIDERS (Suppliers)
// ===========================================
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// ORDERS (Purchase orders from suppliers)
// ===========================================
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  providerId: text('provider_id').references(() => providers.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  receivedDate: integer('received_date', { mode: 'timestamp' }),
  total: real('total').notNull(),
  status: text('status', { enum: ['pending', 'received'] }).default('pending').notNull(),
  estimatedArrival: integer('estimated_arrival', { mode: 'timestamp' }),
  receipt: text('receipt'), // R2 URL for receipt image
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// ORDER ITEMS
// ===========================================
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(), // Snapshot at order time
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost'),
  subtotal: real('subtotal'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// CASH SESSIONS
// ===========================================
export const cashSessions = sqliteTable('cash_sessions', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  openedBy: text('opened_by').references(() => users.id).notNull(),
  closedBy: text('closed_by').references(() => users.id),
  openedAt: integer('opened_at', { mode: 'timestamp' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  openingBalance: real('opening_balance').notNull(),
  closingBalance: real('closing_balance'),
  expectedBalance: real('expected_balance'),
  discrepancy: real('discrepancy'),
  discrepancyNote: text('discrepancy_note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// CASH MOVEMENTS
// ===========================================
export const cashMovements = sqliteTable('cash_movements', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => cashSessions.id, { onDelete: 'cascade' }).notNull(),
  type: text('type', { enum: ['deposit', 'withdrawal'] }).notNull(),
  category: text('category', {
    enum: ['sale', 'bank_withdrawal', 'bank_deposit', 'other']
  }).notNull(),
  amount: real('amount').notNull(),
  note: text('note'),
  saleId: text('sale_id').references(() => sales.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id).notNull(),
  editedBy: text('edited_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// INVITE CODES
// ===========================================
export const inviteCodes = sqliteTable('invite_codes', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  code: text('code').unique().notNull(), // 6 uppercase alphanumeric
  role: text('role', { enum: ['partner', 'employee'] }).notNull(),
  createdBy: text('created_by').references(() => users.id).notNull(),
  usedBy: text('used_by').references(() => users.id),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// OWNERSHIP TRANSFERS
// ===========================================
export const ownershipTransfers = sqliteTable('ownership_transfers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  code: text('code').unique().notNull(), // 6 uppercase alphanumeric
  fromUser: text('from_user').references(() => users.id).notNull(),
  toEmail: text('to_email').notNull(), // Email instead of phone
  toUser: text('to_user').references(() => users.id),
  status: text('status', {
    enum: ['pending', 'accepted', 'completed', 'expired', 'cancelled']
  }).default('pending').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// BUSINESS ARCHIVES (Deleted business recovery)
// ===========================================
export const businessArchives = sqliteTable('business_archives', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull(), // Original business ID (not FK since business is deleted)
  businessName: text('business_name').notNull(),
  deletedBy: text('deleted_by').references(() => users.id).notNull(),
  archiveData: text('archive_data').notNull(), // JSON blob of all business data
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// APP CONFIG (Single row for setup state)
// ===========================================
export const appConfig = sqliteTable('app_config', {
  id: text('id').primaryKey(),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).default(false),
  ownerEmail: text('owner_email'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// ===========================================
// RELATIONS
// ===========================================

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  users: many(users),
  businessUsers: many(businessUsers),
  products: many(products),
  productCategories: many(productCategories),
  productSettings: one(productSettings),
  sales: many(sales),
  providers: many(providers),
  orders: many(orders),
  cashSessions: many(cashSessions),
  inviteCodes: many(inviteCodes),
  ownershipTransfers: many(ownershipTransfers),
}))

export const usersRelations = relations(users, ({ many }) => ({
  businessMemberships: many(businessUsers),
  sales: many(sales),
  cashSessionsOpened: many(cashSessions),
  cashMovementsCreated: many(cashMovements),
  inviteCodesCreated: many(inviteCodes),
}))

export const businessUsersRelations = relations(businessUsers, ({ one }) => ({
  user: one(users, {
    fields: [businessUsers.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
  inviter: one(users, {
    fields: [businessUsers.invitedBy],
    references: [users.id],
  }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
  productCategory: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  saleItems: many(saleItems),
  orderItems: many(orderItems),
}))

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [productCategories.businessId],
    references: [businesses.id],
  }),
  products: many(products),
  productSettingsDefault: many(productSettings),
}))

export const productSettingsRelations = relations(productSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [productSettings.businessId],
    references: [businesses.id],
  }),
  defaultCategory: one(productCategories, {
    fields: [productSettings.defaultCategoryId],
    references: [productCategories.id],
  }),
}))

export const salesRelations = relations(sales, ({ one, many }) => ({
  business: one(businesses, {
    fields: [sales.businessId],
    references: [businesses.id],
  }),
  employee: one(users, {
    fields: [sales.employeeId],
    references: [users.id],
  }),
  items: many(saleItems),
  cashMovements: many(cashMovements),
}))

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}))

export const providersRelations = relations(providers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [providers.businessId],
    references: [businesses.id],
  }),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  provider: one(providers, {
    fields: [orders.providerId],
    references: [providers.id],
  }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}))

export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  business: one(businesses, {
    fields: [cashSessions.businessId],
    references: [businesses.id],
  }),
  opener: one(users, {
    fields: [cashSessions.openedBy],
    references: [users.id],
  }),
  closer: one(users, {
    fields: [cashSessions.closedBy],
    references: [users.id],
  }),
  movements: many(cashMovements),
}))

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  session: one(cashSessions, {
    fields: [cashMovements.sessionId],
    references: [cashSessions.id],
  }),
  sale: one(sales, {
    fields: [cashMovements.saleId],
    references: [sales.id],
  }),
  creator: one(users, {
    fields: [cashMovements.createdBy],
    references: [users.id],
  }),
  editor: one(users, {
    fields: [cashMovements.editedBy],
    references: [users.id],
  }),
}))

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  business: one(businesses, {
    fields: [inviteCodes.businessId],
    references: [businesses.id],
  }),
  creator: one(users, {
    fields: [inviteCodes.createdBy],
    references: [users.id],
  }),
  usedByUser: one(users, {
    fields: [inviteCodes.usedBy],
    references: [users.id],
  }),
}))

export const ownershipTransfersRelations = relations(ownershipTransfers, ({ one }) => ({
  business: one(businesses, {
    fields: [ownershipTransfers.businessId],
    references: [businesses.id],
  }),
  fromUserRelation: one(users, {
    fields: [ownershipTransfers.fromUser],
    references: [users.id],
  }),
  toUserRelation: one(users, {
    fields: [ownershipTransfers.toUser],
    references: [users.id],
  }),
}))

export const businessArchivesRelations = relations(businessArchives, ({ one }) => ({
  deletedByUser: one(users, {
    fields: [businessArchives.deletedBy],
    references: [users.id],
  }),
}))
