# Tech Stack

This document explains the technology choices for Feria POS and the reasoning behind each decision.

## Overview

Feria POS is a mobile-first point-of-sale system optimized for:
- **Zero monthly cost** - Free tier services only
- **Edge performance** - Fast globally via edge computing
- **Offline capability** - Works without internet (PWA)
- **Multi-tenant** - Supports multiple businesses in one database

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                 Next.js 15 (Vercel Free)                    │
│              React 18 + TypeScript + Tailwind               │
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

## Stack Components

| Layer | Technology | Cost |
|-------|------------|------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript | $0 |
| **Styling** | Tailwind CSS | $0 |
| **Database** | Turso (libSQL - edge SQLite) | $0/month |
| **ORM** | Drizzle ORM | $0 |
| **Auth** | Simple JWT (jose + bcryptjs) | $0 |
| **Icons** | Lucide React | $0 |
| **Hosting** | Vercel (free tier) | $0 |
| **File Storage** | Cloudflare R2 (when needed) | $0 (10GB free) |

**Total monthly cost: $0**

---

## Technology Decisions

### Database: Turso (libSQL)

**What it is:** Turso is a distributed SQLite database built on libSQL, an open-source fork of SQLite.

**Why we chose it:**

1. **Edge-native** - Replicas run at the edge for low-latency reads globally
2. **SQLite compatibility** - Familiar SQL, proven reliability, easy to reason about
3. **Generous free tier** - 9GB storage, 500M rows read, 25M rows written per month
4. **Embedded replicas** - Can sync to local SQLite for true offline support
5. **No cold starts** - Unlike serverless databases, always warm

**Alternatives considered:**

| Option | Rejected Because |
|--------|------------------|
| PlanetScale | MySQL-based, no free tier anymore |
| Supabase | PostgreSQL overhead, free tier limits |
| Firebase | Proprietary, vendor lock-in, complex pricing |
| PocketBase | Self-hosted, requires paid hosting ($5+/month) |

**Configuration:**
- Development: `pos-dev` database
- Production: `pos` database
- Schema managed via Drizzle Kit (`npm run db:push`)

---

### ORM: Drizzle

**What it is:** A TypeScript-first ORM with excellent type safety and SQL-like syntax.

**Why we chose it:**

1. **Type safety** - Full TypeScript inference from schema to queries
2. **Edge compatible** - Works in Vercel Edge Runtime and Cloudflare Workers
3. **SQL-like** - Familiar syntax, no magic, easy to debug
4. **Lightweight** - ~7KB bundle, minimal overhead
5. **Turso support** - First-class libSQL/Turso integration

**Alternatives considered:**

| Option | Rejected Because |
|--------|------------------|
| Prisma | Heavy bundle, complex migrations, edge limitations |
| Kysely | Less type inference, manual schema types |
| Raw SQL | No type safety, repetitive boilerplate |

**Schema location:** `src/db/schema.ts`

---

### Auth: Simple JWT (jose + bcryptjs)

**What it is:** Custom authentication using industry-standard libraries for password hashing and JWT tokens.

**Why we chose it:**

1. **Zero cost** - No per-user pricing, no SMS costs
2. **Full control** - Own the auth flow completely
3. **Edge compatible** - jose works in Edge Runtime (unlike jsonwebtoken)
4. **Simple** - Email/password is universally understood

**Components:**

| Library | Purpose |
|---------|---------|
| `jose` | JWT signing/verification (Edge-compatible) |
| `bcryptjs` | Password hashing (12 rounds) |
| HTTP-only cookies | Secure session storage |

**User flow:**
```
Register: Email + Password → JWT cookie → Dashboard
Login: Email + Password → JWT cookie → Dashboard
```

**Alternatives considered:**

| Option | Rejected Because |
|--------|------------------|
| Clerk | $0.02/MAU after 10k users, vendor lock-in |
| Auth0 | Complex, expensive at scale |
| NextAuth | Extra complexity for simple email/password |
| Firebase Auth | SMS costs ($0.06/SMS), vendor lock-in |

**Security:**
- Passwords hashed with bcrypt (12 rounds)
- JWTs signed with HS256, stored in HTTP-only cookies
- Tokens expire after 7 days
- Password verification required for sensitive operations (e.g., ownership transfer)

---

### Frontend: Next.js 15 + React 18

**What it is:** React framework with server-side rendering, API routes, and edge runtime support.

**Why we chose it:**

1. **App Router** - Modern React patterns (Server Components, Suspense)
2. **API Routes** - Backend logic alongside frontend
3. **Edge Runtime** - Run at the edge for fast global response
4. **Vercel integration** - Zero-config deployment on free tier
5. **PWA support** - Easy to add offline capability

**Key patterns:**
- Server Components for data fetching
- Client Components for interactivity
- API Routes for mutations
- Middleware for auth protection

---

### Styling: Tailwind CSS

**What it is:** Utility-first CSS framework.

**Why we chose it:**

1. **Rapid development** - Style directly in JSX
2. **Consistency** - Design system via CSS variables
3. **Small bundle** - Only ships used classes
4. **Mobile-first** - Responsive utilities built-in

**Design tokens:** All colors defined as CSS variables in `globals.css`

---

### Icons: Lucide React

**What it is:** Fork of Feather Icons with more icons and active development.

**Why we chose it:**

1. **Tree-shakeable** - Only bundle used icons
2. **Consistent style** - Clean, minimal aesthetic
3. **Large library** - 1000+ icons
4. **React-native** - First-class React components

---

### Hosting: Vercel

**What it is:** Serverless hosting platform optimized for Next.js.

**Why we chose it:**

1. **Free tier** - Generous for small projects
2. **Zero config** - Automatic deployments from git
3. **Edge network** - Global CDN included
4. **Preview deployments** - Every PR gets a URL

**Limits (free tier):**
- 100GB bandwidth/month
- 6000 minutes build time/month
- Serverless function timeout: 10s

---

## Multi-Tenant Architecture

The database supports multiple businesses (tenants) through a `businessId` column on all relevant tables.

```typescript
// Every query filters by businessId
const products = await db.query.products.findMany({
  where: eq(products.businessId, currentUser.businessId)
})
```

**Benefits:**
- Single database, lower cost
- Shared infrastructure
- Easy to add new businesses

**Data isolation:**
- All queries include businessId filter
- API routes validate user belongs to business
- No cross-tenant data access possible

---

## Migration from Previous Stack

The app previously used:
- **PocketBase** - Self-hosted backend ($5/month on PocketHost)
- **Firebase Auth** - Phone SMS OTP (~$0.06/SMS)

**Reasons for migration:**

1. **Cost reduction** - From $5+/month to $0/month
2. **Simplicity** - One less service to manage
3. **Control** - Own the auth and data completely
4. **Edge performance** - Turso faster than PocketBase

**Migration status:** Complete. All PocketBase and Firebase code removed.

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm
- Turso CLI (`brew install tursodatabase/tap/turso`)

### Environment Variables

```bash
# Required
AUTH_SECRET=your-secret-key-min-32-chars
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Optional (for AI features)
OPENAI_API_KEY=sk-...
FAL_KEY=...
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to dev database |
| `npm run db:push:prod` | Push schema to production |
| `npm run db:studio` | Open Drizzle Studio GUI |

---

## Future Considerations

### File Storage (Cloudflare R2)
When product images need to be stored (not just emoji icons), Cloudflare R2 provides:
- 10GB free storage
- S3-compatible API
- No egress fees

### Offline Sync (Turso Embedded Replicas)
For true offline capability:
- Turso supports embedded SQLite replicas
- Sync when online, work offline
- Automatic conflict resolution

### Real-time Updates
Options when needed:
- Vercel KV for pub/sub
- Pusher (free tier)
- Server-Sent Events

---

## References

- [Turso Documentation](https://docs.turso.tech)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [jose JWT Library](https://github.com/panva/jose)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
