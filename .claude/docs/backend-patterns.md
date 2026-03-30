# Backend Patterns Guide

This document outlines the established patterns and utilities for backend development. **All new features must use these patterns** to maintain consistency and security.

---

## Table of Contents

1. [API Routes](#api-routes)
2. [Frontend API Calls](#frontend-api-calls)
3. [Validation with Zod](#validation-with-zod)
4. [Authorization](#authorization)
5. [Rate Limiting](#rate-limiting)
6. [Security Checklist](#security-checklist)

---

## API Routes

### Business-Scoped Routes

All routes under `/api/businesses/[businessId]/` must use the `withBusinessAuth` wrapper.

```typescript
// src/app/api/businesses/[businessId]/products/route.ts
import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq } from 'drizzle-orm'
import { withBusinessAuth, HttpResponse, validationError } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { Schemas } from '@/lib/schemas'
import { z } from 'zod'

const createProductSchema = z.object({
  name: Schemas.name(),
  price: Schemas.amount(),
})

// GET - List products (any team member)
export const GET = withBusinessAuth(async (request, access) => {
  const productsList = await db
    .select()
    .from(products)
    .where(eq(products.businessId, access.businessId))

  return NextResponse.json({ success: true, products: productsList })
})

// POST - Create product (partners/owners only)
export const POST = withBusinessAuth(async (request, access) => {
  // Role check for write operations
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can create products')
  }

  const body = await request.json()
  const validation = createProductSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  // ... create product
  return NextResponse.json({ success: true, product: newProduct })
})
```

### What `withBusinessAuth` Provides

The `access` object contains:

```typescript
interface BusinessAccess {
  businessId: string    // The business ID from the URL
  businessName: string  // Business name for display
  role: BusinessRole    // 'owner' | 'partner' | 'employee'
  userId: string        // Current user's ID
}
```

### Routes with Additional ID Parameter

For routes like `/api/businesses/[businessId]/products/[id]`:

```typescript
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  const id = routeParams?.id  // Access the [id] parameter
  if (!id) {
    return HttpResponse.badRequest('Product ID is required')
  }

  // Verify resource belongs to business
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.businessId, access.businessId)  // Always include this!
      )
    )
    .limit(1)

  if (!existingProduct) {
    return HttpResponse.notFound('Product not found')
  }

  // ... update logic
})
```

### Global Routes (No Business Context)

For routes like `/api/auth/login` or `/api/invite/validate`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (for sensitive endpoints)
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(`login:${clientIp}`, RateLimits.login)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(...) } }
      )
    }

    // Authentication check (if required)
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validation
    const body = await request.json()
    const validation = schema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    // ... business logic

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### HTTP Response Helpers

Use `HttpResponse` for consistent error responses:

```typescript
import { HttpResponse } from '@/lib/api-middleware'

// 400 Bad Request
return HttpResponse.badRequest('Invalid input')

// 401 Unauthorized
return HttpResponse.unauthorized('Authentication required')

// 403 Forbidden
return HttpResponse.forbidden('Only owners can delete businesses')

// 404 Not Found
return HttpResponse.notFound('Product not found')

// 500 Internal Server Error
return HttpResponse.serverError('Database error')
```

---

## Frontend API Calls

### Using the API Client

All hooks must use the centralized API client from `@/lib/api-client`.

```typescript
// src/hooks/useProductCrud.ts
import {
  apiRequest,
  apiPost,
  apiPatch,
  apiDelete,
  apiPostForm,
  ApiError
} from '@/lib/api-client'

// GET request
const fetchProducts = async () => {
  try {
    const data = await apiRequest<{ products: Product[] }>(
      `/api/businesses/${businessId}/products`
    )
    setProducts(data.products)
  } catch (error) {
    if (error instanceof ApiError) {
      setError(error.message)
    }
  }
}

// POST with JSON
const createProduct = async (name: string, price: number) => {
  const data = await apiPost<{ product: Product }>(
    `/api/businesses/${businessId}/products`,
    { name, price }
  )
  return data.product
}

// POST with FormData (file upload)
const createProductWithIcon = async (formData: FormData) => {
  const data = await apiPostForm<{ product: Product }>(
    `/api/businesses/${businessId}/products`,
    formData
  )
  return data.product
}

// PATCH with JSON
const updateProduct = async (id: string, updates: Partial<Product>) => {
  await apiPatch(`/api/businesses/${businessId}/products/${id}`, updates)
}

// DELETE
const deleteProduct = async (id: string) => {
  await apiDelete(`/api/businesses/${businessId}/products/${id}`)
}
```

### Error Handling Pattern

```typescript
import { ApiError } from '@/lib/api-client'

try {
  await apiPost('/api/endpoint', data)
  // Success handling
} catch (error) {
  if (error instanceof ApiError) {
    // Access error details
    console.log(error.message)      // Error message
    console.log(error.statusCode)   // HTTP status code
    console.log(error.data)         // Full response body

    // Show user-friendly error
    setError(error.message)
  } else {
    setError('An unexpected error occurred')
  }
}
```

---

## Validation with Zod

### Using Shared Schemas

Always use `Schemas` from `@/lib/schemas` for common field types:

```typescript
import { z } from 'zod'
import { Schemas } from '@/lib/schemas'

const mySchema = z.object({
  // User fields
  email: Schemas.email(),           // Validates + lowercases
  password: Schemas.password(),     // Min 8 chars + uppercase + number
  name: Schemas.name(),             // Min 1 char (customizable)
  name: Schemas.name(2),            // Min 2 chars

  // IDs and codes
  id: Schemas.id(),                 // Required string
  code: Schemas.code(),             // Required + uppercases

  // Amounts
  price: Schemas.amount(),          // >= 0 (coerces strings)
  quantity: Schemas.positiveAmount(), // > 0 (coerces strings)

  // Optional fields
  phone: Schemas.phone(),           // Nullable optional string
  notes: Schemas.notes(),           // Nullable optional string

  // Booleans from FormData
  active: Schemas.activeFlag(),     // Handles 'true'/'false' strings

  // Roles
  role: Schemas.role(),             // 'owner' | 'partner' | 'employee'
})
```

### Available Schemas

| Schema | Description | Example Valid Input |
|--------|-------------|---------------------|
| `Schemas.email()` | Email + lowercase | `"User@Email.com"` -> `"user@email.com"` |
| `Schemas.password()` | 8+ chars, uppercase, number | `"MyPass123"` |
| `Schemas.name(min?)` | Required string, min length | `"John"` |
| `Schemas.id()` | Required non-empty string | `"abc123"` |
| `Schemas.code()` | Required + uppercase | `"abc123"` -> `"ABC123"` |
| `Schemas.amount()` | Number >= 0 (coerces) | `"10.50"` -> `10.5` |
| `Schemas.positiveAmount()` | Number > 0 (coerces) | `"5"` -> `5` |
| `Schemas.phone()` | Optional nullable string | `"+1234567890"` or `null` |
| `Schemas.notes()` | Optional nullable string | `"Some notes"` or `null` |
| `Schemas.activeFlag()` | Boolean from string | `"true"` -> `true` |
| `Schemas.role()` | Business role enum | `"partner"` |

### Validation in Routes

```typescript
const validation = schema.safeParse(body)

if (!validation.success) {
  return validationError(validation)  // Returns 400 with first error message
}

const { email, name, price } = validation.data  // Type-safe access
```

---

## Authorization

### Role Hierarchy

```
owner > partner > employee
```

| Role | Can Manage Team | Can Modify Data | Can View Data | Can Transfer Business |
|------|-----------------|-----------------|---------------|----------------------|
| owner | Yes | Yes | Yes | Yes |
| partner | Yes | Yes | Yes | No |
| employee | No | No | Yes | No |

### Role Check Functions

```typescript
import { canManageBusiness, isOwner } from '@/lib/business-auth'

// Check if user can modify products, orders, team, etc.
if (!canManageBusiness(access.role)) {
  return HttpResponse.forbidden('Only partners and owners can do this')
}

// Check if user is the owner (for transfers, deletion, etc.)
if (!isOwner(access.role)) {
  return HttpResponse.forbidden('Only the owner can do this')
}
```

### Required Role Checks

| Operation | Required Check |
|-----------|----------------|
| List/View data | None (any team member) |
| Create/Update/Delete data | `canManageBusiness(access.role)` |
| Manage team members | `canManageBusiness(access.role)` |
| Transfer ownership | `isOwner(access.role)` |
| Delete business | `isOwner(access.role)` |

---

## Rate Limiting

### When to Add Rate Limiting

Add rate limiting to:
- Authentication endpoints (login, register)
- Code validation endpoints (invite codes, transfer codes)
- Any endpoint vulnerable to brute force

### Using Rate Limits

```typescript
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Get client IP
  const clientIp = getClientIp(request)

  // Check rate limit (use unique key per endpoint)
  const result = checkRateLimit(`login:${clientIp}`, RateLimits.login)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  // ... rest of handler
}
```

### Available Rate Limit Presets

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| `RateLimits.login` | 5 | 15 min | Login attempts |
| `RateLimits.register` | 3 | 1 hour | Registration |
| `RateLimits.codeValidation` | 10 | 15 min | Invite/transfer codes |

### Custom Rate Limits

```typescript
const result = checkRateLimit(`custom:${clientIp}`, {
  limit: 20,
  windowSeconds: 60 * 5,  // 5 minutes
})
```

---

## Security Checklist

Before merging any API route, verify:

### Authentication
- [ ] Route requires authentication via `withBusinessAuth` or `getCurrentUser()`
- [ ] Unauthenticated requests return 401

### Authorization
- [ ] Write operations check `canManageBusiness(access.role)`
- [ ] Owner-only operations check `isOwner(access.role)`
- [ ] Resources are filtered by `businessId` (multi-tenant isolation)

### Input Validation
- [ ] All inputs validated with Zod schemas
- [ ] Uses `Schemas.*` for common fields (email, password, etc.)
- [ ] Uses `validationError()` for consistent error responses

### Rate Limiting
- [ ] Sensitive endpoints have rate limiting (login, register, code validation)

### Response Security
- [ ] Passwords are never returned in responses
- [ ] Sensitive data is excluded from responses
- [ ] Error messages don't leak internal details

### Database
- [ ] All queries include `businessId` filter for business-scoped data
- [ ] Resource existence checked before modification
- [ ] Uses parameterized queries (Drizzle handles this)

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/api-middleware.ts` | `withBusinessAuth`, `HttpResponse`, `validationError` |
| `src/lib/api-client.ts` | `apiRequest`, `apiPost`, `apiPatch`, `apiDelete`, `ApiError` |
| `src/lib/schemas.ts` | `Schemas.*` shared Zod validators |
| `src/lib/business-auth.ts` | `requireBusinessAccess`, `canManageBusiness`, `isOwner` |
| `src/lib/rate-limit.ts` | `checkRateLimit`, `getClientIp`, `RateLimits` |
| `src/lib/simple-auth.ts` | `getCurrentUser`, `hashPassword`, `verifyPassword` |
