# Codebase Optimization Plan

**Created:** 2026-03-29
**Updated:** 2026-03-29
**Status:** In Progress - Phase 3 Complete
**Scope:** Code cleanup, deduplication, and performance optimization

---

## Executive Summary

Comprehensive audit identified opportunities for **code consolidation** (estimated 2,000+ lines reduction) and **performance optimization** (100+ fewer DB queries per session, major query improvements).

The codebase has solid architecture with good security practices. This plan addresses duplication and performance bottlenecks.

---

## Table of Contents

1. [Critical Database Optimizations](#1-critical-database-optimizations)
2. [Code Deduplication](#2-code-deduplication)
3. [API Route Optimizations](#3-api-route-optimizations)
4. [Component Pattern Improvements](#4-component-pattern-improvements)
5. [Additional Optimizations](#5-additional-optimizations)
6. [Implementation Priority](#6-implementation-priority)

---

## 1. Critical Database Optimizations

### 1.1 Add Missing Indexes

**File:** `src/db/schema.ts`

**Problem:** No explicit indexes on foreign keys and filter columns. Every multi-tenant query scans without index support.

**Solution:** Add indexes for all businessId columns and common query patterns.

```sql
-- Core multi-tenant indexes
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_orders_business_id ON orders(business_id);
CREATE INDEX idx_sales_business_id ON sales(business_id);
CREATE INDEX idx_providers_business_id ON providers(business_id);
CREATE INDEX idx_cash_sessions_business_id ON cash_sessions(business_id);
CREATE INDEX idx_product_categories_business_id ON product_categories(business_id);

-- Foreign key indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_cash_movements_session_id ON cash_movements(session_id);
CREATE INDEX idx_business_users_user_id ON business_users(user_id);

-- Filter column indexes
CREATE INDEX idx_cash_sessions_closed_at ON cash_sessions(closed_at);
CREATE INDEX idx_invite_codes_used ON invite_codes(used, expires_at);
CREATE INDEX idx_business_users_status ON business_users(status);
```

**Impact:** Major query performance improvement across all business-scoped queries.

---

### 1.2 Fix N+1 Query in Orders API

**File:** `src/app/api/businesses/[businessId]/orders/route.ts` (lines 25-118)

**Problem:** GET endpoint performs 3 separate queries then maps in memory:
1. Fetch ALL orders
2. Fetch ALL products (including base64 icons)
3. Fetch ALL providers
4. Map items to products/providers in JavaScript

**Current Code:**
```typescript
const ordersList = await db.select().from(orders)...
const productsList = await db.select().from(products)...  // Full objects with icons
const providersList = await db.select().from(providers)...
// Then loops through to map
```

**Solution:** Use JOINs in single query, select only needed columns.

```typescript
// Fetch orders with provider info in one query
const ordersWithProvider = await db
  .select({
    id: orders.id,
    providerId: orders.providerId,
    providerName: providers.name,
    date: orders.date,
    status: orders.status,
    notes: orders.notes,
    totalAmount: orders.totalAmount,
    createdAt: orders.createdAt,
  })
  .from(orders)
  .leftJoin(providers, eq(orders.providerId, providers.id))
  .where(eq(orders.businessId, businessId))
  .orderBy(desc(orders.date))

// Fetch order items with minimal product info (NO icons)
const itemsWithProducts = await db
  .select({
    orderId: orderItems.orderId,
    productId: orderItems.productId,
    productName: products.name,
    quantity: orderItems.quantity,
    unitCost: orderItems.unitCost,
    totalCost: orderItems.totalCost,
  })
  .from(orderItems)
  .innerJoin(products, eq(orderItems.productId, products.id))
  .where(
    inArray(orderItems.orderId, ordersWithProvider.map(o => o.id))
  )
```

**Impact:** Reduces 3 full-table queries to 2 optimized queries. Eliminates loading base64 icons (major bandwidth savings).

---

### 1.3 Use .returning() Instead of Read-After-Write

**Files Affected:**
- `src/app/api/businesses/[businessId]/products/route.ts` (lines 117-140)
- `src/app/api/businesses/[businessId]/categories/route.ts` (lines 121-134)
- `src/app/api/businesses/[businessId]/providers/route.ts` (lines 100-121)
- `src/app/api/businesses/[businessId]/cash/sessions/route.ts` (lines 132-170)
- `src/app/api/businesses/[businessId]/cash/movements/route.ts` (lines 160-198)

**Problem:** After INSERT, code does unnecessary SELECT to get the created record.

**Current Pattern:**
```typescript
await db.insert(products).values({ id: productId, ... })

// Unnecessary query
const [newProduct] = await db
  .select()
  .from(products)
  .where(eq(products.id, productId))
  .limit(1)

return NextResponse.json({ product: newProduct })
```

**Solution:**
```typescript
const [newProduct] = await db
  .insert(products)
  .values({ id: productId, ... })
  .returning()

return NextResponse.json({ product: newProduct })
```

**Impact:** Eliminates 5-10% of database queries on create operations.

---

### 1.4 Batch Order Item Inserts

**File:** `src/app/api/businesses/[businessId]/orders/route.ts` (lines 186-195)

**Problem:** Sequential INSERT for each order item.

**Current Code:**
```typescript
for (const item of items) {
  await db.insert(orderItems).values({
    id: nanoid(),
    orderId,
    productId: item.productId,
    ...
  })
}
```

**Solution:**
```typescript
await db.insert(orderItems).values(
  items.map(item => ({
    id: nanoid(),
    orderId,
    productId: item.productId,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
  }))
)
```

**Impact:** Reduces N queries to 1 query for order creation.

---

## 2. Code Deduplication

### 2.1 Create scrollToTop Utility

**Files with duplication:**
- `src/components/products/ProductsTab.tsx` (lines 81-86)
- `src/components/products/OrdersTab.tsx` (lines 55-60)
- `src/components/cash/MovementsList.tsx` (lines 24-29)

**Current (repeated 3x):**
```typescript
const scrollToTop = () => {
  const scrollContainer = document.querySelector('.main-scroll-container')
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
```

**Solution:** Create `src/lib/scroll.ts`
```typescript
export function scrollToTop(selector = '.main-scroll-container') {
  const container = document.querySelector(selector)
  container?.scrollTo({ top: 0, behavior: 'smooth' })
}
```

**Lines saved:** ~20

---

### 2.2 Create QR Code Generation Utility

**File:** `src/hooks/useTeamManagement.ts` (lines 174-181, 266-273, 346-353)

**Current (repeated 3x):**
```typescript
const qr = await QRCode.toDataURL(registrationUrl, {
  width: 160,
  margin: 2,
  color: { dark: '#0F172A', light: '#FFFFFF' }
})
```

**Solution:** Create `src/lib/qr.ts`
```typescript
import QRCode from 'qrcode'

const QR_CONFIG = {
  width: 160,
  margin: 2,
  color: { dark: '#0F172A', light: '#FFFFFF' }
}

export async function generateInviteQRCode(inviteCode: string): Promise<string> {
  const registrationUrl = `${window.location.origin}/join?code=${inviteCode}`
  return QRCode.toDataURL(registrationUrl, QR_CONFIG)
}
```

**Lines saved:** ~30

---

### 2.3 Create useFormModal Hook

**Files with duplication:**
- `src/components/cash/AddMovementModal.tsx` (lines 27-37)
- `src/components/cash/EditMovementModal.tsx` (lines 31-45)
- `src/components/cash/OpenDrawerModal.tsx` (lines 21-44)
- `src/components/products/ProductModal.tsx` (lines 179-217)
- `src/components/providers/ProviderModal.tsx` (lines 113-136)

**Pattern repeated 5x:**
```typescript
const [isSaving, setIsSaving] = useState(false)
const resetForm = () => { /* reset all fields */ }
const handleClose = () => {
  if (!isSaving) { resetForm(); onClose() }
}
```

**Solution:** Create `src/hooks/useFormModal.ts`
```typescript
interface UseFormModalOptions<T> {
  initialValues: T
  onClose: () => void
}

export function useFormModal<T extends Record<string, unknown>>({
  initialValues,
  onClose,
}: UseFormModalOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setError('')
  }, [initialValues])

  const handleClose = useCallback(() => {
    if (!isSaving) {
      resetForm()
      onClose()
    }
  }, [isSaving, resetForm, onClose])

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    values,
    setValues,
    setValue,
    isSaving,
    setIsSaving,
    error,
    setError,
    resetForm,
    handleClose,
  }
}
```

**Lines saved:** ~200

---

### 2.4 Create Success/Error Animation Components

**Files with duplication:**
- `src/components/products/ProductModal.tsx` (lines 642-681, 683-722)
- `src/components/providers/ProviderModal.tsx` (lines 253-292, 294-333)
- `src/app/[businessId]/team/page.tsx` (lines 229-252)

**Pattern repeated 4x (~40 lines each):**
```tsx
<div style={{ width: 160, height: 160 }}>
  {triggered && (
    <LottiePlayer
      src="/animations/success.json"
      loop={false}
      autoplay={true}
      delay={500}
      style={{ width: 160, height: 160 }}
    />
  )}
</div>
<p className="..." style={{ opacity: triggered ? 1 : 0 }}>
  {title}
</p>
<p className="..." style={{ opacity: triggered ? 1 : 0 }}>
  {subtitle}
</p>
```

**Solution:** Create `src/components/ui/ConfirmationAnimation.tsx`
```tsx
interface ConfirmationAnimationProps {
  type: 'success' | 'error'
  triggered: boolean
  title: string
  subtitle?: string
}

export function ConfirmationAnimation({
  type,
  triggered,
  title,
  subtitle,
}: ConfirmationAnimationProps) {
  const animationSrc = type === 'success'
    ? '/animations/success.json'
    : '/animations/error.json'

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {triggered && (
          <LottiePlayer
            src={animationSrc}
            loop={false}
            autoplay={true}
            delay={500}
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: triggered ? 1 : 0 }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
          style={{ opacity: triggered ? 1 : 0 }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
```

**Lines saved:** ~160

---

### 2.5 Create Session Storage Cache Hook

**Files with duplication:**
- `src/hooks/useCashSession.ts` (lines 16-40)
- `src/hooks/useProductSettings.ts` (lines 16-52)

**Solution:** Create `src/hooks/useSessionCache.ts`
```typescript
export function useSessionCache<T>(key: string) {
  const get = useCallback((): T | null => {
    if (typeof window === 'undefined') return null
    const cached = sessionStorage.getItem(key)
    return cached ? JSON.parse(cached) : null
  }, [key])

  const set = useCallback((data: T) => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(key, JSON.stringify(data))
  }, [key])

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(key)
  }, [key])

  return { get, set, clear }
}
```

**Lines saved:** ~50

---

## 3. API Route Optimizations

### 3.1 Create withBusinessAuth Wrapper

**Problem:** 40+ API routes repeat identical auth boilerplate.

**Current (repeated in every route):**
```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // ... route logic

  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Solution:** Create `src/lib/api-middleware.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAccess, BusinessAccess } from './business-auth'

type RouteParams = { params: Promise<{ businessId: string; [key: string]: string }> }

type BusinessRouteHandler = (
  request: NextRequest,
  access: BusinessAccess,
  params: Record<string, string>
) => Promise<NextResponse>

export function withBusinessAuth(handler: BusinessRouteHandler) {
  return async (request: NextRequest, { params }: RouteParams) => {
    try {
      const resolvedParams = await params
      const { businessId, ...restParams } = resolvedParams
      const access = await requireBusinessAccess(businessId)
      return await handler(request, access, restParams)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      if (error instanceof Error && error.message.includes('Not found')) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      console.error('API Error:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }
}
```

**Usage:**
```typescript
// Before: 20+ lines
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)
    const products = await db.select()...
    return NextResponse.json({ products })
  } catch (error) { ... }
}

// After: 5 lines
export const GET = withBusinessAuth(async (request, access) => {
  const products = await db.select()
    .from(productsTable)
    .where(eq(productsTable.businessId, access.businessId))
  return NextResponse.json({ products })
})
```

**Lines saved:** ~800 across 40+ routes

---

### 3.2 Add Pagination to List Endpoints

**Files to update:**
- `src/app/api/businesses/[businessId]/products/route.ts`
- `src/app/api/businesses/[businessId]/orders/route.ts`
- `src/app/api/businesses/[businessId]/cash/movements/route.ts`
- `src/app/api/businesses/[businessId]/sales/route.ts`

**Solution:** Add pagination helper
```typescript
// src/lib/pagination.ts
export interface PaginationParams {
  limit: number
  offset: number
}

export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 50,
  maxLimit = 500
): PaginationParams {
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(defaultLimit)),
    maxLimit
  )
  const offset = parseInt(searchParams.get('offset') || '0')
  return { limit, offset }
}
```

**Usage in routes:**
```typescript
const { limit, offset } = getPaginationParams(request.nextUrl.searchParams)

const products = await db.select()
  .from(productsTable)
  .where(eq(productsTable.businessId, businessId))
  .limit(limit)
  .offset(offset)
```

---

### 3.3 Cache Business Access in JWT

**Problem:** `requireBusinessAccess()` queries DB on every API request (~100+ times per session).

**Current flow:**
1. Every API call extracts JWT
2. JWT contains only `{ userId, email }`
3. Query `business_users` table to validate access

**Solution:** Include business memberships in JWT payload.

**Updated JWT structure:**
```typescript
interface TokenPayload {
  userId: string
  email: string
  businesses: {
    id: string
    role: 'owner' | 'partner' | 'employee'
  }[]
}
```

**Updated validation:**
```typescript
export async function requireBusinessAccess(businessId: string): Promise<BusinessAccess> {
  const session = await getCurrentUser()

  // Check JWT first (no DB query)
  const membership = session.businesses?.find(b => b.id === businessId)
  if (membership) {
    return {
      userId: session.userId,
      businessId,
      role: membership.role,
    }
  }

  // Fallback to DB for tokens without businesses (backward compat)
  // Or for fresh membership validation
  const dbMembership = await db.select()...

  return { userId: session.userId, businessId, role: dbMembership.role }
}
```

**Impact:** Eliminates 100+ DB queries per session.

---

## 4. Component Pattern Improvements

### 4.1 Create Form Contexts to Eliminate Prop Drilling

**Problem:** ProductModal receives 19+ props, NewOrderModal receives 16+ props.

**Files affected:**
- `src/components/products/ProductModal.tsx`
- `src/components/products/NewOrderModal.tsx`
- `src/app/[businessId]/products/page.tsx`

**Solution:** Create `src/contexts/product-form-context.tsx`
```typescript
interface ProductFormState {
  // Values
  name: string
  price: string
  costPrice: string
  categoryId: string
  stock: string
  lowStockThreshold: string
  icon: string | null
  iconFile: File | null

  // Setters
  setName: (v: string) => void
  setPrice: (v: string) => void
  setCostPrice: (v: string) => void
  setCategoryId: (v: string) => void
  setStock: (v: string) => void
  setLowStockThreshold: (v: string) => void
  setIcon: (v: string | null) => void
  setIconFile: (v: File | null) => void

  // Actions
  resetForm: () => void
  populateFromProduct: (product: Product) => void
}

const ProductFormContext = createContext<ProductFormState | null>(null)

export function ProductFormProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  // ... other state

  const resetForm = useCallback(() => {
    setName('')
    setPrice('')
    // ... reset all
  }, [])

  const populateFromProduct = useCallback((product: Product) => {
    setName(product.name)
    setPrice(String(product.price))
    // ... populate all
  }, [])

  return (
    <ProductFormContext.Provider value={{
      name, setName,
      price, setPrice,
      // ... all values and setters
      resetForm,
      populateFromProduct,
    }}>
      {children}
    </ProductFormContext.Provider>
  )
}

export function useProductForm() {
  const context = useContext(ProductFormContext)
  if (!context) throw new Error('useProductForm must be within ProductFormProvider')
  return context
}
```

**Before (19 props):**
```tsx
<ProductModal
  name={name}
  onNameChange={setName}
  price={price}
  onPriceChange={setPrice}
  // ... 15 more props
/>
```

**After (3 props):**
```tsx
<ProductFormProvider>
  <ProductModal
    isOpen={isOpen}
    onClose={onClose}
    onSave={handleSave}
  />
</ProductFormProvider>
```

---

### 4.2 Add React.memo to Step Content Components

**Files to update:**
- `src/components/cash/CloseDrawerModal.tsx` - CloseDrawerFormContent
- `src/components/team/UserDetailsStep.tsx`
- List item components in ProductsTab, OrdersTab

**Example:**
```typescript
// Before
function CloseDrawerFormContent({ expectedBalance, closingBalance, ... }) {
  return <Modal.Item>...</Modal.Item>
}

// After
const CloseDrawerFormContent = memo(function CloseDrawerFormContent({
  expectedBalance,
  closingBalance,
  ...
}: Props) {
  return <Modal.Item>...</Modal.Item>
})
```

---

### 4.3 Create Delete Confirmation Step Component

**Files with duplication:**
- `src/components/products/ProductModal.tsx` (lines 626-640)
- `src/components/providers/ProviderModal.tsx` (lines 237-250)
- `src/components/cash/EditMovementModal.tsx` (lines 198-228)

**Solution:** Create `src/components/ui/DeleteConfirmationStep.tsx`
```tsx
interface DeleteConfirmationStepProps {
  title: string
  itemName: string
  warningText?: string
  cancelStep: number
  onConfirm: () => Promise<boolean>
  successStep: number
}

export function DeleteConfirmationStep({
  title,
  itemName,
  warningText,
  cancelStep,
  onConfirm,
  successStep,
}: DeleteConfirmationStepProps) {
  const { goToStep } = useMorphingModal()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const success = await onConfirm()
    if (success) {
      goToStep(successStep)
    }
    setIsDeleting(false)
  }

  return (
    <Modal.Step title={title} backStep={cancelStep}>
      <Modal.Item>
        <p className="text-text-secondary">
          Are you sure you want to delete <strong>{itemName}</strong>?
        </p>
        {warningText && (
          <p className="text-sm text-red-600 mt-2">{warningText}</p>
        )}
      </Modal.Item>
      <Modal.Footer>
        <Modal.GoToStepButton step={cancelStep} variant="secondary">
          Cancel
        </Modal.GoToStepButton>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="btn btn-danger flex-1"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </Modal.Footer>
    </Modal.Step>
  )
}
```

---

## 5. Additional Optimizations

*Identified during secondary audit - not covered in sections 1-4.*

### 5.1 Remove Duplicate isBase64DataUrl Function

**Files with duplication:**
- `src/lib/storage.ts` (line 38)
- `src/lib/utils.ts` (line 79)

**Current (identical in both files):**
```typescript
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith('data:image/')
}
```

**Solution:** Keep in `src/lib/utils.ts`, remove from `storage.ts`, update imports.

**Lines saved:** ~10

---

### 5.2 Create Centralized API Client

**Problem:** 11 hooks contain 37 fetch calls with repeated error handling patterns.

**Files affected:**
- `src/hooks/useProductCrud.ts`
- `src/hooks/useOrderManagement.ts`
- `src/hooks/useCashMovements.ts`
- `src/hooks/useTeamManagement.ts`
- `src/hooks/useProductSettings.ts`
- `src/hooks/useCashSession.ts`
- `src/hooks/useProviderManagement.ts`
- `src/hooks/useAccountSettings.ts`
- `src/hooks/useAiProductPipeline.ts`
- And 2 more hooks

**Current pattern (repeated 37x):**
```typescript
const response = await fetch(url, options)
const data = await response.json()
if (!response.ok || !data.success) {
  setError(data.error || 'Failed to fetch')
  return
}
```

**Solution:** Create `src/lib/api-client.ts`
```typescript
export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public data: ApiResponse,
    message?: string
  ) {
    super(message || data.error || 'API request failed')
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok || data.success === false) {
    throw new ApiError(response.status, data, data.error)
  }

  return data as T
}

// Usage in hooks:
// const data = await apiRequest<ProductsResponse>(url)
```

**Lines saved:** ~200-300

---

### 5.3 Create Validation Response Helper

**Problem:** 26 API routes have identical Zod validation error handling.

**Current pattern (repeated 26x):**
```typescript
if (!validation.success) {
  return NextResponse.json(
    { error: validation.error.errors[0].message },
    { status: 400 }
  )
}
```

**Solution:** Add to `src/lib/api-middleware.ts`
```typescript
import { z } from 'zod'

export function validationError(
  result: z.SafeParseReturnType<unknown, unknown>
): NextResponse {
  const errors = (result as z.SafeParseError<unknown>).error?.errors || []
  const message = errors[0]?.message || 'Validation failed'
  return NextResponse.json({ error: message }, { status: 400 })
}

// Usage:
if (!validation.success) {
  return validationError(validation)
}
```

**Lines saved:** ~100

---

### 5.4 Create Shared Zod Schema Builders

**Problem:** 28 API routes define overlapping field validators.

**Common patterns repeated:**
- Email: `z.string().email('Invalid email')` - 5+ routes
- Name: `z.string().min(1, 'Name is required')` - 8+ routes
- ID: `z.string().min(1)` - 15+ routes
- Boolean with preprocess: `z.preprocess(...)` - 10+ routes

**Solution:** Create `src/lib/schemas.ts`
```typescript
import { z } from 'zod'

export const Schemas = {
  email: () => z.string().email('Invalid email').toLowerCase(),

  name: (minLength = 1) => z.string().min(
    minLength,
    `Name must be at least ${minLength} character(s)`
  ),

  id: () => z.string().min(1, 'ID is required'),

  nanoid: () => z.string().length(21, 'Invalid ID format'),

  activeFlag: () => z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ).default(true),

  phone: () => z.string().nullable().optional(),

  notes: () => z.string().nullable().optional(),

  password: (minLength = 8) => z.string().min(
    minLength,
    `Password must be at least ${minLength} characters`
  ),

  amount: () => z.coerce.number().min(0, 'Amount must be 0 or greater'),

  positiveAmount: () => z.coerce.number().positive('Amount must be greater than 0'),
}

// Usage:
const productSchema = z.object({
  name: Schemas.name(),
  price: Schemas.amount(),
  active: Schemas.activeFlag(),
})
```

**Lines saved:** ~150-200

---

### 5.5 Extract Shared RouteParams Type

**Problem:** 30+ API routes redefine identical RouteParams interface.

**Current (repeated 30x):**
```typescript
interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}
```

**Solution:** Add to `src/types/index.ts`
```typescript
// API Route Parameter Types
export interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

export interface RouteParamsWithId {
  params: Promise<{
    businessId: string
    id: string
  }>
}
```

**Lines saved:** ~90

---

### 5.6 Standardize HTTP Status Codes

**Problem:** Inconsistent use of 401 vs 403 status codes.

**Current state:**
- 50 instances of `status: 403` (some should be 401)
- 9 instances of `status: 401`
- Mixed semantics for "not authenticated" vs "not authorized"

**Correct usage:**
- `401 Unauthorized` - User not authenticated (no valid JWT)
- `403 Forbidden` - User authenticated but lacks permission

**Solution:** Create `src/lib/http-responses.ts`
```typescript
import { NextResponse } from 'next/server'

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,      // Not authenticated
  FORBIDDEN: 403,         // Authenticated but no permission
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const

export function unauthorized(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: HttpStatus.UNAUTHORIZED })
}

export function forbidden(message = 'Permission denied') {
  return NextResponse.json({ error: message }, { status: HttpStatus.FORBIDDEN })
}

export function notFound(message = 'Resource not found') {
  return NextResponse.json({ error: message }, { status: HttpStatus.NOT_FOUND })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: HttpStatus.BAD_REQUEST })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: HttpStatus.SERVER_ERROR })
}
```

**Impact:** Better client-side error handling, correct HTTP semantics.

---

### 5.7 Add ARIA Labels to Interactive Elements

**Problem:** Some clickable div elements lack accessibility attributes.

**Files to update:**
- `src/components/products/ProductsTab.tsx` - Product list items
- `src/components/products/OrdersTab.tsx` - Order list items
- `src/components/team/TeamMemberListItem.tsx` - Team member items

**Pattern to implement:**
```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${itemName} - click to view details`}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  {/* content */}
</div>
```

**Note:** `MovementsList.tsx` already implements this correctly - use as reference.

---

### 5.8 Additional Modals Need useFormModal

**Files identified beyond Section 2.3:**
- `src/components/cash/OpenDrawerModal.tsx` (lines 21-44)
- `src/components/products/ProductSettingsModal.tsx`

These have the same `isSaving`, `resetForm`, `handleClose` pattern.

**Lines saved:** +50 (additional to Section 2.3)

---

### 5.9 Summary of Additional Optimizations

| Item | Files | Lines Saved | Priority |
|------|-------|-------------|----------|
| Remove duplicate `isBase64DataUrl` | 2 | ~10 | High |
| Centralized API client | 11 hooks | 200-300 | High |
| Validation response helper | 26 routes | ~100 | Medium |
| Shared Zod schema builders | 28 routes | 150-200 | Medium |
| Shared RouteParams type | 30 routes | ~90 | Low |
| HTTP status standardization | 28 routes | N/A | Medium |
| ARIA labels | 3 components | N/A | Medium |
| Additional useFormModal | 2 modals | ~50 | Low |

**Total additional lines saved:** ~550-800

---

## 6. Implementation Priority

### Phase 1: Critical Performance - COMPLETE

| Task | File(s) | Impact | Status |
|------|---------|--------|--------|
| Add database indexes | `src/db/schema.ts` | High | Done (21 indexes) |
| Fix N+1 in orders GET | `orders/route.ts` | High | Done |
| Use .returning() in INSERTs | 5 route files | Medium | Done (-47 lines) |
| Batch order item inserts | `orders/route.ts` | Medium | Done |

**Commits:**
- `cf67da2` - perf: add database indexes for multi-tenant queries
- `addd9e4` - perf: use .returning() instead of SELECT after INSERT
- `684ca0c` - perf: batch order item inserts
- `a380848` - perf: fix N+1 query in orders GET endpoint

### Phase 2: Code Consolidation - COMPLETE

| Task | File(s) | Lines Saved | Status |
|------|---------|-------------|--------|
| Create scrollToTop utility | New + 3 files | ~20 | Done |
| Create QR code utility | New + 1 file | ~30 | Done |
| Create useFormModal hook | New + 2 modals | ~15 | Done |
| Create ConfirmationAnimation | New + 1 modal | ~40 | Done |

**Commits:**
- `1a9a5a6` - refactor: extract shared utilities and components (Phase 2)

### Phase 3: API Improvements - COMPLETE

| Task | File(s) | Impact | Status |
|------|---------|--------|--------|
| Create withBusinessAuth | `src/lib/api-middleware.ts` | Pattern established | Done |
| Add pagination helpers | `src/lib/api-middleware.ts` | Included in middleware | Done |
| Update 4 API routes | providers, categories, cash routes | ~190 lines | Done |

**Commits:**
- `d39281a` - refactor: add API middleware with withBusinessAuth wrapper (Phase 3)

**Note:** Pattern is established. Remaining 36+ routes can be updated incrementally as they are touched.

### Phase 4: Component Patterns (Week 4)

| Task | File(s) | Impact | Effort |
|------|---------|--------|--------|
| Create ProductFormContext | New + 3 files | Clean code | Medium |
| Add React.memo | 3-5 files | Minor perf | Low |
| Create DeleteConfirmationStep | New + 3 files | ~60 lines | Low |
| Create useSessionCache hook | New + 2 files | ~50 lines | Low |

### Phase 5: Additional Consolidation (Week 5)

| Task | File(s) | Impact | Effort |
|------|---------|--------|--------|
| Remove duplicate `isBase64DataUrl` | 2 files | ~10 lines | Very Low |
| Create centralized API client | 11 hooks | 200-300 lines | Medium |
| Create validation response helper | 26 routes | ~100 lines | Low |
| Create shared Zod schemas | 28 routes | 150-200 lines | Medium |
| Extract shared RouteParams type | 30 routes | ~90 lines | Very Low |
| Standardize HTTP status codes | 28 routes | Semantic fix | Medium |
| Add ARIA labels | 3 components | Accessibility | Low |
| Additional useFormModal adoption | 2 modals | ~50 lines | Low |

---

## Summary

### Estimated Impact

| Category | Metric |
|----------|--------|
| Lines of code reduced | ~2,000+ |
| DB queries eliminated per session | ~100+ |
| Major query optimizations | 3 (N+1, indexes, over-fetch) |
| Components consolidated | 10+ |
| Hooks created | 5 |
| Utilities created | 7 |
| Files affected | 90+ |

### Files Most Affected

1. `src/app/api/businesses/[businessId]/orders/route.ts` - Major refactor
2. `src/db/schema.ts` - Add indexes
3. `src/lib/` - New utilities and middleware (api-client, schemas, http-responses)
4. `src/hooks/` - New shared hooks + API client adoption
5. `src/components/ui/` - New shared components
6. All 40+ API route files - withBusinessAuth, validation helpers, RouteParams
7. `src/types/index.ts` - Shared route parameter types

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/scroll.ts` | scrollToTop utility |
| `src/lib/qr.ts` | QR code generation |
| `src/lib/api-middleware.ts` | withBusinessAuth wrapper, validation helpers |
| `src/lib/api-client.ts` | Centralized fetch with error handling |
| `src/lib/schemas.ts` | Shared Zod schema builders |
| `src/lib/http-responses.ts` | HTTP status code helpers |
| `src/lib/pagination.ts` | Pagination params helper |
| `src/hooks/useFormModal.ts` | Form modal state management |
| `src/hooks/useSessionCache.ts` | Session storage cache hook |
| `src/contexts/product-form-context.tsx` | Product form state context |
| `src/components/ui/ConfirmationAnimation.tsx` | Success/error animations |
| `src/components/ui/DeleteConfirmationStep.tsx` | Reusable delete confirmation |

---

## Next Steps

1. Review and approve this plan
2. Implement Phase 1 (critical performance)
3. Run tests and verify no regressions
4. Continue with subsequent phases
