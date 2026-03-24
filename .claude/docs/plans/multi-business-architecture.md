# Multi-Business Architecture Plan

## Overview

Refactor Feria POS from single-business to multi-business architecture, allowing users to own multiple businesses and/or work at multiple businesses with different roles.

**Core Principle:** Account and Business are separate entities. Users have *memberships* to businesses, not a single business identity.

**UI Approach:** Skeleton/functional UI only. No styling. Frontend design agent will handle all visual design after structure is complete.

---

## Finalized Decisions

| Decision | Answer |
|----------|--------|
| Multiple owners | No - single owner per business, partners (socios) have elevated perms |
| Owner leaving | Not possible - owners transfer ownership or delete business |
| Deletion | Hard delete DB + JSON archive stored for recovery |
| Login landing | Hub page showing all user's businesses |
| Navbar visibility | Hub = no bottom nav, Inside business = full bottom nav |
| Registration | Account only, no business creation during signup |

---

## User Stories

| Persona | Story | Flow |
|---------|-------|------|
| **Owner** | Creates business, sells, manages team | Register → Hub → Create Business → Inside |
| **Employee** | Joins existing business to work | Register → Hub → Join with code → Inside |
| **Multi-Employee** | Works at 3 different ferias, owns none | Register → Hub → Join A → Join B → Join C → Switch between |
| **Hybrid** | Owns one, employee at another | Register → Create own → Join another → Switch between |

---

## Navigation Zones

```
┌─────────────────────────────────────────────────────────────┐
│  ZONE 1: AUTH (not logged in)                               │
│  Pages: /login, /register, /invite                          │
│  Nav: None                                                  │
├─────────────────────────────────────────────────────────────┤
│  ZONE 2: HUB (logged in, choosing business)                 │
│  Pages: / (hub), /business/new, /account/*                  │
│  Nav: Header with avatar menu only, NO bottom nav           │
├─────────────────────────────────────────────────────────────┤
│  ZONE 3: INSIDE BUSINESS (working in a business)            │
│  Pages: /inicio, /ventas, /productos, /caja, /ajustes, etc  │
│  Nav: Header with switcher + avatar, FULL bottom nav        │
└─────────────────────────────────────────────────────────────┘
```

---

## Schema Changes

### New Tables

#### businesses
```sql
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### memberships
```sql
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  businessId TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'partner', 'employee')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invitedBy TEXT REFERENCES users(id),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, businessId)
);
```

#### business_archives
```sql
CREATE TABLE business_archives (
  id TEXT PRIMARY KEY,
  businessId TEXT NOT NULL,
  deletedBy TEXT NOT NULL,
  archiveData TEXT NOT NULL,  -- JSON blob
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Tables

#### users (remove business fields)
```sql
-- Remove these columns:
-- businessId TEXT
-- role TEXT
-- invitedBy TEXT

-- Keep:
id, email, name, password, avatar, status, createdAt, updatedAt
```

#### invite_codes (add businessId)
```sql
-- Add column:
businessId TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
```

#### providers (add businessId)
```sql
-- Add column:
businessId TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
```

#### ownership_transfers (add businessId)
```sql
-- Add column:
businessId TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
```

### Tables Already Have businessId (no change needed)
- products
- sales
- sale_items (via sale relation)
- cash_sessions
- cash_movements (via session relation)
- orders
- order_items (via order relation)

---

## Migration Steps

### Phase 1: Database Schema Migration

**Tasks:**
1. Create `businesses` table in Drizzle schema
2. Create `memberships` table in Drizzle schema
3. Create `business_archives` table in Drizzle schema
4. Add `businessId` to `invite_codes` schema
5. Add `businessId` to `providers` schema
6. Add `businessId` to `ownership_transfers` schema
7. Write migration script to:
   - For each unique businessId in users table:
     - Create a business record (name = "Mi Negocio" or derive from user)
   - For each user with a businessId:
     - Create membership record with their role
   - Update invite_codes, providers, ownership_transfers with businessId
8. Remove `businessId`, `role`, `invitedBy` from users schema
9. Run `npm run db:push` to apply changes

**Files to modify:**
- `src/db/schema.ts` - Add new tables, modify existing
- `scripts/migrate-to-multi-business.ts` - NEW migration script

---

### Phase 2: Context & Auth Layer

**Tasks:**
1. Update `AuthContext` - remove business/role info, account only
2. Create `BusinessContext` - active business, memberships, switching
3. Update `getCurrentUser()` in simple-auth.ts
4. Create `getActiveMembership()` helper
5. Create `requireBusinessContext()` middleware for API routes
6. Add `x-business-id` header handling to API calls
7. Store `activeBusinessId` in localStorage

**Files to create:**
- `src/contexts/business-context.tsx` - NEW

**Files to modify:**
- `src/contexts/auth-context.tsx`
- `src/lib/simple-auth.ts`
- `src/types/index.ts` - Add Business, Membership types

---

### Phase 3: API Routes

**New API routes:**
```
POST /api/business/create     - Create new business + owner membership
GET  /api/business/list       - List user's businesses with memberships
POST /api/business/[id]/enter - Set as active (optional, could be client-only)
POST /api/business/[id]/leave - Leave business (non-owner only)
DELETE /api/business/[id]     - Delete business + create archive (owner only)
```

**Updated API routes (add business context):**
- All `/api/products/*` routes
- All `/api/sales/*` routes
- All `/api/cash/*` routes
- All `/api/orders/*` routes
- All `/api/providers/*` routes
- All `/api/team` route
- All `/api/invite/*` routes
- All `/api/transfer/*` routes
- `/api/reports/*` routes

**Files to create:**
- `src/app/api/business/create/route.ts`
- `src/app/api/business/list/route.ts`
- `src/app/api/business/[id]/route.ts` (DELETE)
- `src/app/api/business/[id]/leave/route.ts`

**Files to modify:**
- All existing API routes (add business context check)

---

### Phase 4: Layout & Navigation Structure

**Tasks:**
1. Create Hub layout (header only, no bottom nav)
2. Create Inside Business layout (header + bottom nav)
3. Update Header component - add business switcher slot
4. Create BusinessSwitcher component (skeleton)
5. Create AvatarMenu component (skeleton)
6. Update Navbar to only render in business context
7. Create route guards for each zone

**New file structure:**
```
src/app/
├── (auth)/                    # Zone 1: Auth pages
│   ├── layout.tsx             # Minimal layout
│   ├── login/
│   ├── register/              # UPDATED: account only
│   └── invite/                # UPDATED: handles auth states
├── (hub)/                     # Zone 2: Hub pages (NEW)
│   ├── layout.tsx             # Header only, no bottom nav
│   ├── page.tsx               # Business picker / empty state
│   └── business/
│       └── new/
│           └── page.tsx       # Create business flow
├── (account)/                 # Zone 2: Account pages (NEW)
│   ├── layout.tsx             # Header only, no bottom nav
│   ├── profile/
│   │   └── page.tsx
│   └── security/
│       └── page.tsx
├── (dashboard)/               # Zone 3: Inside business (EXISTING)
│   ├── layout.tsx             # UPDATED: requires active business
│   ├── inicio/
│   ├── ventas/
│   ├── productos/
│   ├── caja/
│   ├── reportes/
│   └── ajustes/               # UPDATED: business settings only
```

**Files to create:**
- `src/app/(hub)/layout.tsx`
- `src/app/(hub)/page.tsx`
- `src/app/(hub)/business/new/page.tsx`
- `src/app/(account)/layout.tsx`
- `src/app/(account)/profile/page.tsx`
- `src/app/(account)/security/page.tsx`
- `src/components/business/BusinessSwitcher.tsx`
- `src/components/business/AvatarMenu.tsx`
- `src/components/business/EmptyState.tsx`
- `src/components/business/BusinessCard.tsx`

**Files to modify:**
- `src/app/(dashboard)/layout.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/invite/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Navbar.tsx`

---

### Phase 5: Onboarding Flow Updates

**Tasks:**
1. Update `/register` - remove business name field, account only
2. Update `/invite` - handle logged-in users joining additional business
3. Create hub page - show businesses or empty state
4. Create business creation flow
5. Redirect logic after login/register

**Registration flow (updated):**
```
/register
├── Input: Name, Email, Password (NO business name)
├── Creates: User account only
└── Redirects to: / (hub)
```

**Invite flow (updated):**
```
/invite?code=XXX
├── If not logged in:
│   ├── Show login/register options
│   ├── After auth → join business → redirect to /inicio
├── If logged in:
│   ├── Show "Join [Business] as [Role]?" confirmation
│   ├── On confirm → create membership → redirect to /inicio
└── If already member → show error
```

**Hub page logic:**
```
/ (hub)
├── If 0 businesses → Empty state (create/join options)
├── If 1+ businesses → Business list with "Entrar" buttons
└── Always show: Create new, Join with code options
```

---

### Phase 6: Settings Split

**Tasks:**
1. Move user settings to `/account/*` routes
2. Update `/ajustes` to be business-only settings
3. Update AvatarMenu to link to account pages
4. Remove user-level settings from ajustes

**Account pages (`/account/*`):**
- `/account/profile` - Name, email, avatar
- `/account/security` - Change password

**Business settings (`/ajustes`):**
- Negocio - Business name (owner/partner)
- Equipo - Team management (owner/partner)
- Zona de peligro - Transfer/Delete (owner only)

---

### Phase 7: Update All Pages for Business Context

**Tasks:**
1. Update all dashboard pages to use `activeBusiness` from context
2. Update all data fetching hooks to include businessId
3. Update all API calls to include `x-business-id` header
4. Test all CRUD operations with business scoping

**Pages to update:**
- `/inicio` - Dashboard stats for current business
- `/ventas` - Sales for current business
- `/productos` - Products for current business
- `/caja` - Cash sessions for current business
- `/caja/historial` - Movement history for current business
- `/reportes` - Reports for current business
- `/ajustes` - Settings for current business
- `/ajustes/equipo` - Team for current business

---

## File Change Summary

### New Files (22 files)

**Database:**
- `scripts/migrate-to-multi-business.ts`

**Contexts:**
- `src/contexts/business-context.tsx`

**API Routes:**
- `src/app/api/business/create/route.ts`
- `src/app/api/business/list/route.ts`
- `src/app/api/business/[id]/route.ts`
- `src/app/api/business/[id]/leave/route.ts`

**Pages:**
- `src/app/(hub)/layout.tsx`
- `src/app/(hub)/page.tsx`
- `src/app/(hub)/business/new/page.tsx`
- `src/app/(account)/layout.tsx`
- `src/app/(account)/profile/page.tsx`
- `src/app/(account)/security/page.tsx`

**Components:**
- `src/components/business/BusinessSwitcher.tsx`
- `src/components/business/AvatarMenu.tsx`
- `src/components/business/EmptyState.tsx`
- `src/components/business/BusinessCard.tsx`
- `src/components/business/CreateBusinessForm.tsx`
- `src/components/business/JoinBusinessForm.tsx`

**Hooks:**
- `src/hooks/useBusiness.ts`
- `src/hooks/useBusinessList.ts`

### Modified Files (30+ files)

**Schema:**
- `src/db/schema.ts`
- `src/db/index.ts`

**Types:**
- `src/types/index.ts`

**Contexts:**
- `src/contexts/auth-context.tsx`

**Auth:**
- `src/lib/simple-auth.ts`
- `src/middleware.ts`

**Layouts:**
- `src/app/(dashboard)/layout.tsx`
- `src/app/(auth)/layout.tsx`

**Pages:**
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/invite/page.tsx`
- `src/app/(dashboard)/ajustes/page.tsx`
- `src/app/(dashboard)/ajustes/equipo/page.tsx`
- (All other dashboard pages - context usage)

**Components:**
- `src/components/layout/Header.tsx`
- `src/components/layout/Navbar.tsx`

**API Routes:**
- All existing API routes (add business context)

**Hooks:**
- `src/hooks/useTeamManagement.ts`
- `src/hooks/useSettings.ts`
- (Other hooks that fetch business data)

---

## Implementation Order

```
Phase 1: Schema ────────────────────────────────────────────────┐
   │                                                            │
   ▼                                                            │
Phase 2: Contexts ──────────────────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Phase 3: API Routes ────────────────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Phase 4: Layouts & Navigation ──────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Phase 5: Onboarding Flow ───────────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Phase 6: Settings Split ────────────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Phase 7: Update All Pages ──────────────────────────────────────┤
   │                                                            │
   ▼                                                            │
Testing & Polish ───────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] User can register without creating a business
- [ ] User sees hub page after login (not auto-redirected)
- [ ] User can create a business from hub
- [ ] User can join a business with invite code from hub
- [ ] User can switch between businesses via switcher
- [ ] Bottom navbar only appears inside business context
- [ ] Account settings are separate from business settings
- [ ] All existing features work with business scoping
- [ ] Business deletion creates JSON archive
- [ ] Owner cannot leave, only transfer or delete
- [ ] Existing users migrated with their data intact

---

## Notes

- **UI is skeleton only** - No styling, just functional structure
- **Frontend design agent** will handle all visual design after structure complete
- **Test with existing data** - Migration must preserve all current data
- **Backwards compatible URLs** - Old bookmarks should redirect appropriately
