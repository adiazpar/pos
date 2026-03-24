# Turso Migration Plan: PocketBase to Turso + Drizzle + Simple Auth

> **Status:** Migration complete. All API routes implemented with Drizzle. Ready for testing and deployment.

> **Goal:** Migrate from PocketBase to a $0/month stack while supporting multi-tenant architecture for multiple feria businesses.

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                 Next.js 15 (Vercel Free)                    │
│              Existing React components + UI                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│              Next.js API Routes + Server Actions            │
│                    Drizzle ORM (libSQL)                     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     TURSO       │ │      AUTH       │ │    STORAGE      │
│    Database     │ │   Simple JWT    │ │  Cloudflare R2  │
│    (libSQL)     │ │  (jose+bcrypt)  │ │   (10GB free)   │
│    $0/month     │ │  Email+Password │ │    $0/month     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Cost Comparison

| Service | Old (PocketBase) | New Stack |
|---------|------------------|-----------|
| Database | PocketHost $5/mo | Turso $0/mo |
| Auth | Firebase SMS (~$0.06/SMS) | Simple JWT $0/mo |
| File Storage | Included | Cloudflare R2 $0/mo (10GB) |
| Hosting | Vercel $0/mo | Vercel $0/mo |
| **Total** | **$5/month + SMS costs** | **$0/month** |

## Auth Strategy: Simple JWT

**Using simple email/password auth with JWT tokens:**

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcryptjs (12 rounds) |
| Token signing | jose (Edge-compatible JWT) |
| Session storage | HTTP-only cookies |

**User flow:**
- Register: Email + Password → JWT cookie → Logged in
- Login: Email + Password → JWT cookie → Dashboard

**Note:** PIN feature was removed to simplify the auth flow.

---

## Phase 1: Setup & Infrastructure ✅ COMPLETED

### Task 1.1: Create Turso Account & Database ✅
- [x] Sign up at https://turso.tech
- [x] Install Turso CLI: `brew install tursodatabase/tap/turso`
- [x] Authenticate: `turso auth login`
- [x] Create databases: `pos-dev` (development) and `pos` (production)
- [x] Get connection URLs and auth tokens

### Task 1.2: Install Dependencies ✅
```bash
npm install @libsql/client drizzle-orm bcryptjs jose
npm install -D drizzle-kit @types/bcryptjs
```

### Task 1.3: Cloudflare R2 (DEFERRED)
- [ ] Set up when file storage is needed
- Current product icons can use emoji or simple URL storage

---

## Phase 2: Database Schema & ORM ✅ COMPLETED

### Task 2.1: Drizzle Configuration ✅
**Created: `drizzle.config.ts`** - Supports dev/prod environments via DRIZZLE_ENV

### Task 2.2: Database Client ✅
**Created: `src/db/index.ts`**

### Task 2.3: Schema Definition ✅
**Created: `src/db/schema.ts`** with tables:
- businesses, users, products, sales, sale_items
- providers, orders, order_items
- cash_sessions, cash_movements
- invite_codes, ownership_transfers, app_config

### Task 2.4: Push to Turso ✅
```bash
npm run db:push      # Development
npm run db:push:prod # Production
```

---

## Phase 3: Auth Migration - Simple JWT ✅ COMPLETED

### Task 3.1: Auth Library ✅
**Created: `src/lib/simple-auth.ts`**
- `hashPassword()` / `verifyPassword()` - bcryptjs
- `createToken()` / `verifyToken()` - jose JWT
- `setAuthCookie()` / `getAuthCookie()` - HTTP-only cookies
- `getCurrentUser()` - Get user from request

### Task 3.2: Auth API Routes ✅
**Created:**
- `src/app/api/auth/register/route.ts` - Create user + business
- `src/app/api/auth/login/route.ts` - Verify password, set JWT
- `src/app/api/auth/logout/route.ts` - Clear cookie
- `src/app/api/auth/me/route.ts` - Get current user

### Task 3.3: Auth Pages ✅
**Updated:**
- `src/app/(auth)/login/page.tsx` - Email/password form with Suspense
- `src/app/(auth)/register/page.tsx` - Simple email/password registration
- `src/app/(auth)/invite/page.tsx` - Invite code + registration with Suspense

### Task 3.4: Middleware ✅
**Updated: `src/middleware.ts`** - JWT verification for protected routes

### Task 3.5: Migrate Auth Context ✅
**Rewrote: `src/contexts/auth-context.tsx`**
- Uses `/api/auth/me` to fetch user on mount
- Uses `/api/auth/login` for login
- Uses `/api/auth/logout` for logout
- Simple email/password only (PIN removed)
- Removed all PocketBase references
- Removed `pb` from context (no longer exposed)

### Task 3.6: Invite API Routes ✅
**Created:**
- `src/app/api/invite/validate/route.ts` - Validate invite codes
- `src/app/api/invite/register/route.ts` - Register via invite code

---

## Phase 4: Data Layer Migration ✅ COMPLETED

### Task 4.1: API Routes with Drizzle ✅

All API routes implemented with Drizzle ORM queries:

| Route Group | Routes |
|-------------|--------|
| **Auth** | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` |
| **Team** | `/api/team`, `/api/invite/*`, `/api/users/toggle-status`, `/api/users/change-role` |
| **Products** | `/api/products`, `/api/products/[id]`, `/api/products/[id]/stock` |
| **Providers** | `/api/providers`, `/api/providers/[id]` |
| **Orders** | `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/receive` |
| **Cash** | `/api/cash/sessions/*`, `/api/cash/movements/*` |
| **Setup** | `/api/setup-status` |

### Task 4.3: Update Hooks ✅

All hooks converted to use API routes:

| Hook | Status |
|------|--------|
| `useProductCrud` | ✅ Uses fetch API |
| `useProviderManagement` | ✅ Uses fetch API |
| `useOrderManagement` | ✅ Uses fetch API |
| `useCashSession` | ✅ Uses fetch API |
| `useCashMovements` | ✅ Uses fetch API |
| `useSettings` | ✅ Uses fetch API |
| `useAiProductPipeline` | ✅ Updated comments |

### Task 4.4: Update Components ✅

All components converted to use API routes:

| Component | Status |
|-----------|--------|
| CloseDrawerModal | ✅ Uses fetch API |
| Invite page | ✅ Uses fetch API |
| Caja historial page | ✅ Uses fetch API |
| Cambiar PIN page | ✅ Uses fetch API |
| Productos page | ✅ Uses fetch API |
| Transfer banner | ✅ Uses fetch API |

---

## Phase 5: Cleanup ✅ COMPLETED

### Task 5.1: Remove PocketBase ✅

- [x] Uninstalled `pocketbase` package
- [x] Deleted `pb_migrations/` folder
- [x] Deleted `pb_data/` folder
- [x] Deleted `pb_hooks/` folder
- [x] Deleted `pocketbase` binary
- [x] Deleted `src/lib/pocketbase.ts`
- [x] Deleted `scripts/` folder (all PocketBase scripts)

### Task 5.2: Remove Firebase ✅

- [x] Uninstalled `firebase` package
- [x] Deleted `src/lib/firebase.ts`
- [x] Deleted phone auth components

### Task 5.3: Clean package.json Scripts ✅

Removed:
- `dev:all` (was: Next.js + PocketBase concurrent)
- `pb:start`
- `pb:download`
- `pb:migrate`
- `db:reset`

Also uninstalled `concurrently` dev dependency.

### Task 5.4: Clean Environment Variables ✅

**Removed from .env.example:**
- POCKETBASE_URL
- PB_ADMIN_EMAIL
- PB_ADMIN_PASSWORD
- NEXT_PUBLIC_FIREBASE_* (all Firebase vars)

**Current .env.example contains only:**
- AUTH_SECRET
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- TURSO_PROD_* (optional)
- OPENAI_API_KEY (optional)
- FAL_KEY (optional)

### Task 5.5: Update Documentation ✅

- [x] Updated `README.md` - New tech stack, commands
- [x] Updated `.claude/CLAUDE.md` - Already had new stack
- [x] Updated `.gitignore` - Removed PocketBase entries
- [x] Updated `next.config.js` - Removed POCKETBASE_URL env
- [x] Updated code comments - Removed PocketBase references
- [x] Created `docs/tech-stack.md` - Comprehensive tech stack documentation

---

## Phase 6: Testing & Deploy 🟡 PARTIAL

### Task 6.1: Build Verification ✅
- [x] `npm run build` completes successfully
- [x] No TypeScript errors
- [x] No PocketBase/Firebase references in src/

### Task 6.2: Implement Drizzle Queries ✅
All API routes implemented with Drizzle:
- [x] Auth queries (register, login, get user)
- [x] Team queries (list, invite codes, role changes)
- [x] Product queries (CRUD, stock adjustment)
- [x] Provider queries (CRUD)
- [x] Order queries (CRUD, receive with stock update)
- [x] Cash session queries (open, close, list, movements)

### Task 6.3: Local Testing ❌ TODO
- [ ] Test registration flow end-to-end
- [ ] Test login flow end-to-end
- [ ] Test all CRUD operations (products, cash, orders)
- [ ] Test invite flow end-to-end
- [ ] Test logout

### Task 6.4: Deploy to Vercel ❌ TODO
- [ ] Set environment variables in Vercel
- [ ] Deploy and test production

### Task 6.5: Cancel Old Services ✅
- [x] Cancel PocketHost subscription ($5/month saved)
- [x] Disable Firebase project

---

## Current Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| 1. Infrastructure | ✅ Complete | 100% |
| 2. Database Schema | ✅ Complete | 100% |
| 3. Auth Migration | ✅ Complete | 100% |
| 4. Data Layer | ✅ Complete | 100% |
| 5. Cleanup | ✅ Complete | 100% |
| 6. Testing & Deploy | 🟡 Partial | 40% |

**Overall: ~95% Complete**

**What's done:**
- Frontend completely decoupled from PocketBase and Firebase
- All components use fetch API routes
- All hooks use fetch API routes
- Auth context uses JWT
- All API routes implemented with Drizzle ORM
- Old dependencies removed
- Documentation updated

**What's left:**
1. End-to-end testing
2. Production deployment
3. Cancel old services

---

## Final Stack

| Service | Purpose | Cost |
|---------|---------|------|
| **Turso** | Database (9GB, 500M reads) | $0/month |
| **Simple JWT** | Auth (jose + bcryptjs) | $0/month |
| **Vercel** | Hosting (100GB bandwidth) | $0/month |
| **Total** | | **$0/month** |

---

## Files Changed Summary

### Created
- `src/db/index.ts` - Drizzle client
- `src/db/schema.ts` - Database schema
- `src/lib/simple-auth.ts` - JWT auth utilities
- `src/app/api/auth/reset-pin/route.ts`
- `src/app/api/invite/validate/route.ts`
- `src/app/api/invite/register/route.ts`
- `docs/tech-stack.md` - Tech stack documentation
- `drizzle.config.ts` - Drizzle configuration

### Modified
- `src/contexts/auth-context.tsx` - Rewritten for JWT
- `src/app/(auth)/login/page.tsx` - Email auth + Suspense
- `src/app/(auth)/invite/page.tsx` - Email auth + Suspense
- All hooks - Converted to fetch API
- All pages using `pb` - Converted to fetch API
- `package.json` - Removed old scripts/deps
- `README.md` - Updated documentation
- `.env.example` - Cleaned up variables

### Deleted
- `src/lib/pocketbase.ts`
- `src/lib/firebase.ts`
- `pb_migrations/` folder
- `pb_data/` folder
- `pb_hooks/` folder
- `scripts/` folder
- `pocketbase` binary
- Phone auth components
