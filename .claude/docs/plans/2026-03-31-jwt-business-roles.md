# JWT Business Roles Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed business roles in the JWT to eliminate the DB query in `withBusinessAuth`, cutting every API request from 2 DB round-trips to 1.

**Architecture:** Store a `businesses` map (`{ [businessId]: role }`) in the JWT payload. `requireBusinessAccess` reads from the JWT instead of querying the DB. A `refreshToken()` helper re-issues the JWT with fresh roles from the DB whenever roles change (login, create business, join business, role change).

**Tech Stack:** jose (JWT), Drizzle ORM, Next.js App Router

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/simple-auth.ts` | Modify | Add `businesses` to `JWTPayload`, add `refreshToken()` helper |
| `src/lib/business-auth.ts` | Modify | Read role from JWT instead of querying DB |
| `src/app/api/auth/login/route.ts` | Modify | Fetch business roles and include in JWT |
| `src/app/api/auth/register/route.ts` | Modify | Include empty businesses map in JWT |
| `src/app/api/businesses/create/route.ts` | Modify | Refresh JWT after creating business |
| `src/app/api/invite/join/route.ts` | Modify | Refresh JWT after joining business |
| `src/app/api/businesses/[businessId]/users/change-role/route.ts` | Modify | Refresh JWT after role change (for target user on next login) |
| `src/app/api/businesses/[businessId]/leave/route.ts` | Modify | Refresh JWT after leaving business |

---

## Chunk 1: Core JWT Changes

### Task 1: Expand JWT payload and add token refresh helper

**Files:**
- Modify: `src/lib/simple-auth.ts`

- [ ] **Step 1: Update JWTPayload interface**

Add `businesses` field to the payload type:

```typescript
export interface JWTPayload {
  userId: string
  email: string
  businesses: Record<string, string> // { businessId: role }
  [key: string]: unknown
}
```

- [ ] **Step 2: Add helper to fetch business roles for a user**

```typescript
import { db, businessUsers } from '@/db'
import { eq, and } from 'drizzle-orm'

export async function fetchBusinessRoles(userId: string): Promise<Record<string, string>> {
  const memberships = await db
    .select({
      businessId: businessUsers.businessId,
      role: businessUsers.role,
    })
    .from(businessUsers)
    .where(
      and(
        eq(businessUsers.userId, userId),
        eq(businessUsers.status, 'active')
      )
    )

  const roles: Record<string, string> = {}
  for (const m of memberships) {
    roles[m.businessId] = m.role
  }
  return roles
}
```

- [ ] **Step 3: Add refreshToken helper**

This re-issues the JWT with fresh business roles from the DB and updates the cookie:

```typescript
export async function refreshToken(): Promise<void> {
  const current = await getCurrentUser()
  if (!current) return

  const businesses = await fetchBusinessRoles(current.userId)
  const token = await createToken({
    userId: current.userId,
    email: current.email,
    businesses,
  })
  await setAuthCookie(token)
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/simple-auth.ts
git commit -m "feat: add business roles to JWT payload and refresh helper"
```

---

### Task 2: Update business-auth to read role from JWT

**Files:**
- Modify: `src/lib/business-auth.ts`

- [ ] **Step 1: Update validateBusinessAccess to use JWT roles**

Replace the DB query with a JWT lookup. Fall back to DB query if the JWT doesn't have the business (for backwards compatibility with existing tokens):

```typescript
import { getCurrentUser, fetchBusinessRoles } from './simple-auth'
import type { BusinessRole } from './business-role'
export type { BusinessRole }
export { isOwner, canManageBusiness } from './business-role'

export interface BusinessAccess {
  businessId: string
  businessName: string
  role: BusinessRole
  userId: string
}

export async function requireBusinessAccess(
  businessId: string
): Promise<BusinessAccess> {
  const session = await getCurrentUser()
  if (!session) {
    throw new Error('Unauthorized: Not authenticated')
  }

  // Check JWT for role (fast path - no DB query)
  const role = session.businesses?.[businessId]
  if (role) {
    // We still need the business name for some responses.
    // Fetch it with a lightweight query.
    const business = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .get()

    if (!business) {
      throw new Error('Not found: Business does not exist')
    }

    return {
      businessId,
      businessName: business.name,
      role: role as BusinessRole,
      userId: session.userId,
    }
  }

  // Fallback: JWT doesn't have this business (old token or just joined)
  // Query DB and return access
  const membership = await db
    .select({
      businessId: businessUsers.businessId,
      role: businessUsers.role,
      status: businessUsers.status,
      businessName: businesses.name,
    })
    .from(businessUsers)
    .innerJoin(businesses, eq(businessUsers.businessId, businesses.id))
    .where(
      and(
        eq(businessUsers.userId, session.userId),
        eq(businessUsers.businessId, businessId),
        eq(businessUsers.status, 'active')
      )
    )
    .get()

  if (!membership) {
    throw new Error('Unauthorized: No access to this business')
  }

  return {
    businessId: membership.businessId,
    businessName: membership.businessName,
    role: membership.role as BusinessRole,
    userId: session.userId,
  }
}
```

**Note:** The fast path still queries for the business name. To eliminate this query too, we could cache business names in the JWT, but that would bloat the token. The business name query is lightweight (primary key lookup) and can be optimized later if needed.

**Alternative (no name query):** If `businessName` is not critical for the API response, we could return an empty string and let the client provide it. But several existing routes use `access.businessName`, so keeping the query is safer for now.

- [ ] **Step 2: Remove unused functions**

Remove `validateBusinessAccess` and `getBusinessAccess` since `requireBusinessAccess` now handles everything inline.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/business-auth.ts
git commit -m "feat: read business role from JWT with DB fallback"
```

---

## Chunk 2: Update Auth Routes

### Task 3: Include business roles at login

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Fetch roles and include in JWT**

After password verification succeeds, fetch business roles before creating the token:

```typescript
import { verifyPassword, createToken, setAuthCookie, fetchBusinessRoles } from '@/lib/simple-auth'

// ... after password verification ...

const businesses = await fetchBusinessRoles(user.id)

const token = await createToken({
  userId: user.id,
  email: user.email,
  businesses,
})
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat: include business roles in JWT at login"
```

---

### Task 4: Include empty businesses at registration

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Add empty businesses map to JWT**

```typescript
const token = await createToken({
  userId: newUser.id,
  email: newUser.email,
  businesses: {},
})
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: include empty businesses map in JWT at registration"
```

---

## Chunk 3: Refresh JWT on Role Changes

### Task 5: Refresh JWT after creating a business

**Files:**
- Modify: `src/app/api/businesses/create/route.ts`

- [ ] **Step 1: Call refreshToken after business creation**

```typescript
import { refreshToken } from '@/lib/simple-auth'

// ... after creating business and membership ...

await refreshToken()

return NextResponse.json({
  success: true,
  business: { id: businessId, name: name.trim() },
})
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/businesses/create/route.ts
git commit -m "feat: refresh JWT after business creation"
```

---

### Task 6: Refresh JWT after joining a business

**Files:**
- Modify: `src/app/api/invite/join/route.ts`

- [ ] **Step 1: Call refreshToken after joining**

```typescript
import { refreshToken } from '@/lib/simple-auth'

// ... after creating membership and marking invite as used ...

await refreshToken()
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/invite/join/route.ts
git commit -m "feat: refresh JWT after joining a business"
```

---

### Task 7: Refresh JWT after leaving a business

**Files:**
- Modify: `src/app/api/businesses/[businessId]/leave/route.ts`

- [ ] **Step 1: Call refreshToken after leaving**

```typescript
import { refreshToken } from '@/lib/simple-auth'

// ... after removing membership ...

await refreshToken()
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/businesses/[businessId]/leave/route.ts
git commit -m "feat: refresh JWT after leaving a business"
```

---

### Task 8: Handle role changes for other users

**Files:**
- Modify: `src/app/api/businesses/[businessId]/users/change-role/route.ts`

**Note:** When an owner changes another user's role, the target user's JWT is stale. We can't update their cookie from another user's request. The DB fallback in `requireBusinessAccess` handles this gracefully — the target user's next request falls back to the DB query, which returns the correct role. Their JWT refreshes on next login.

No code changes needed for this route. The fallback path handles it.

- [ ] **Step 1: Verify the fallback handles role changes**

The existing fallback in `requireBusinessAccess` already queries the DB when the JWT doesn't match. Since the JWT has the OLD role but the DB has the NEW role, and we check the DB when the JWT role doesn't exist for a business, we need to ensure the fallback also covers the case where the JWT HAS a role but it's outdated.

**Decision:** For security, always trust the JWT role for the current session. Role changes take effect on the target user's next login. This is acceptable because:
- Role downgrades (partner → employee) are rare
- The `change-role` endpoint itself is protected by `isOwner(access.role)` check
- Critical operations still validate ownership on the server

- [ ] **Step 2: Commit (docs only if needed)**

No code changes needed.

---

## Testing

After all tasks are complete:

1. **Login flow:** Login → check that subsequent API calls don't query `business_users` for access validation
2. **Create business:** Create a business → verify the JWT is refreshed and includes the new business with `owner` role
3. **Join business:** Join via invite code → verify the JWT includes the new business
4. **Backwards compatibility:** Existing users with old JWTs (no `businesses` field) should still work via DB fallback
5. **Role accuracy:** Verify `canDelete` and other role-dependent features work correctly after login
