# Performance Patterns

Patterns for keeping the app fast despite remote database (Turso) latency.

---

## 1. Optimistic UI

**Principle:** Show success immediately, let the API run in the background. Users should never wait for a network round-trip to see feedback.

### When to Use

Any modal flow that ends with a success/confirmation step (Lottie animation, "Done" button). The user's action is complete from their perspective — the API can finish asynchronously.

### Pattern

```typescript
// WRONG - user waits for API
const handleClick = async () => {
  const success = await onSubmit(data)
  if (success) {
    setCompleted(true)
    goToStep(successStep)
  }
}

// CORRECT - instant feedback
const handleClick = () => {
  setCompleted(true)
  goToStep(successStep)
  onSubmit(data) // fire and forget
}
```

### Where It's Applied

| Flow | File | Status |
|------|------|--------|
| Add product (save) | `src/components/products/AddProductModal.tsx` | Done |
| Edit product (save) | `src/components/products/EditProductModal.tsx` | Done |
| Edit product (delete) | `src/components/products/EditProductModal.tsx` | Done |
| Provider (save) | `src/components/providers/ProviderModal.tsx` | Needs update |
| Provider (delete) | `src/components/providers/ProviderModal.tsx` | Needs update |
| Category (save/delete) | `src/components/products/ProductSettingsModal.tsx` | Needs update |
| Order (save) | `src/components/products/NewOrderModal.tsx` | Needs update |
| Order (edit/delete) | `src/components/products/OrderDetailModal.tsx` | Needs update |
| Invite code (delete) | `src/components/team/InviteModalButtons.tsx` | Needs update |
| Cash movement (add) | `src/components/cash/AddMovementModal.tsx` | Needs update |
| Cash movement (edit/delete) | `src/components/cash/EditMovementModal.tsx` | Needs update |

### When NOT to Use

- Login/registration (need to know if credentials are valid)
- Joining a business (need to validate invite code)
- Opening cash drawer (need session ID from server)
- Any flow where the next UI state depends on the API response data

---

## 2. Business Access Cache

**File:** `src/lib/business-auth.ts`

Every business-scoped API route calls `requireBusinessAccess()` via `withBusinessAuth`. This queries the DB to verify the user's role. With the in-memory cache, repeated requests to the same business skip the DB query.

### How It Works

- Module-level `Map<string, CachedAccess>` keyed by `userId:businessId`
- 60-second TTL per entry
- On Vercel, warm function instances reuse the cache across requests
- Cache is invalidated locally when roles change

### Invalidation

Call `invalidateAccessCache(userId, businessId)` after any operation that changes a user's access:

```typescript
import { invalidateAccessCache } from '@/lib/business-auth'

// After changing a user's role
invalidateAccessCache(targetUserId, businessId)

// After ownership transfer (invalidate both users)
invalidateAccessCache(oldOwnerId, businessId)
invalidateAccessCache(newOwnerId, businessId)
```

### Where Invalidation Is Applied

| Route | What changed |
|-------|-------------|
| `users/change-role` | Target user's role |
| `users/toggle-status` | Target user's status |
| `transfer/confirm` | Both old and new owner |

### Limitations

- In-memory only — not shared across Vercel function instances
- Worst case: 60 seconds of stale data on a different instance
- Best case (same instance): invalidation is immediate

---

## 3. Session Cache (Client-Side)

**Files:** `src/hooks/useSessionCache.ts`, individual hooks

Client-side `sessionStorage` caches reduce redundant API calls when navigating between pages.

### CRITICAL: Business-Scoped Keys

All caches storing business-specific data MUST include the `businessId` in the key. Unscoped keys cause cross-business data contamination.

```typescript
// WRONG - shared across all businesses
const cache = createSessionCache<Product[]>('products_cache')

// CORRECT - scoped to business
const cache = createSessionCache<Product[]>(`products_cache_${businessId}`)
```

### Existing Scoped Caches

| Hook | Key Pattern | Data |
|------|-------------|------|
| `useProductSettings` | `product_categories_cache_${bid}` | Categories |
| `useProductSettings` | `product_settings_cache_${bid}` | Settings |
| `useCashSession` | `cash_session_cache_${bid}` | Cash session |
| Products page | `products_cache_${bid}` | Products list |
| Products page | `providers_cache_${bid}` | Providers list |
| Products page | `orders_cache_${bid}` | Orders list |

### Global Caches (No Business Scope Needed)

| Location | Key | Data |
|----------|-----|------|
| `auth-context` | `auth_user_cache` | User profile |
| `layout` | `theme` | Theme preference |

---

## 4. Icon Upload Optimization

**File:** `src/lib/storage.ts`

When uploading product icons, the file is converted to base64 for validation. Pass the pre-computed base64 to `uploadProductIcon` to avoid reading the file twice:

```typescript
const base64 = await fileToBase64(iconFile)
const { valid } = validateIconSize(base64)
if (!valid) return HttpResponse.badRequest('Icon too large')
iconData = await uploadProductIcon(iconFile, productId, base64) // reuse base64
```

### Client-Side Compression

AI-generated icons are compressed client-side before upload. The target size must stay under the server's 100KB limit after base64 encoding (~33% overhead):

- Client compression target: **70KB** (`src/hooks/useAiProductPipeline.ts`)
- Server validation limit: **100KB** (`src/lib/storage.ts`, `MAX_ICON_SIZE`)
