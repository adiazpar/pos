# Kasero

## Documentation

All project documentation and plans live in `.claude/docs/`:
- **Plans**: `.claude/docs/plans/` - Implementation plans and architecture docs
- **Guides** (read before building features that touch these areas):
  - `.claude/docs/backend-patterns.md` - API routes, auth, validation, rate limiting
  - `.claude/docs/performance-patterns.md` - Optimistic UI, access caching, session caches, icon uploads
  - `.claude/docs/ai-product-pipeline.md` - AI snap-to-add pipeline

## Project Overview

A **multi-business management system** for small businesses. Built for speed, simplicity, and offline capability.

**Target users**: Small business owners - food vendors, artisans, retailers.

### Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Non-blocking delight** | Success feedback happens alongside the next action, not before it |
| **Motion with purpose** | Every animation guides attention or confirms state |
| **Instant + beautiful** | 100-300ms transitions that feel snappy and polished |

### Animation Guidelines

**Use CSS transitions** for routine feedback (fast, zero bundle cost):
- Button press: scale(0.97) + color shift (100ms)
- Success: green pulse + icon morph (200ms)
- List item enter: translateY + fade (300ms staggered)

**Consider Lottie sparingly** for high-impact moments only:
- Empty states, onboarding, shift-end celebration

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15+ (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Turso (libSQL - edge SQLite) |
| **ORM** | Drizzle ORM |
| **Auth** | Simple JWT (jose + bcryptjs) |
| **Icons** | Lucide React |
| **Hosting** | Vercel |

---

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Public auth routes
│   │   ├── login/        # Login page
│   │   └── register/     # Registration page
│   ├── (hub)/            # Business hub (authenticated, no business context)
│   │   ├── page.tsx      # Hub home - list/select businesses
│   │   ├── account/      # User account settings
│   │   └── join/         # Join business with invite code
│   ├── [businessId]/     # Business context routes (protected)
│   │   ├── home/         # Dashboard home
│   │   ├── sales/        # Sales register
│   │   ├── products/     # Product catalog
│   │   ├── providers/    # Supplier management
│   │   ├── team/         # Team management
│   │   ├── cash/         # Cash drawer
│   │   │   └── history/  # Cash session history
│   │   └── reports/      # Reports
│   └── api/              # API routes
│       ├── auth/         # Authentication endpoints
│       ├── businesses/   # Multi-business API
│       │   ├── list/     # List user's businesses
│       │   ├── create/   # Create new business
│       │   └── [businessId]/  # Business-scoped endpoints
│       ├── invite/       # Invite code validation/joining
│       ├── transfer/     # Ownership transfer (incoming)
│       └── ai/           # AI features (icons, product ID)
├── components/
│   ├── ui/               # Base UI components (Modal, Input, etc.)
│   ├── auth/             # Auth components (AuthGuard, ContentGuard)
│   ├── layout/           # Layout components (PageHeader, MobileNav)
│   ├── cash/             # Cash drawer components
│   ├── products/         # Product components
│   ├── providers/        # Provider components
│   ├── team/             # Team management components
│   ├── invite/           # Invite code components
│   ├── account/          # Account settings components
│   ├── icons/            # Custom SVG icons
│   └── animations/       # Lottie animation components
├── contexts/             # React contexts (Auth, Business, Navbar)
├── db/                   # Database (Drizzle schema + client)
├── hooks/                # Custom hooks
├── lib/                  # Utilities
└── types/                # TypeScript types
```

---

## Business Features

### Business Types

| Type | Label |
|------|-------|
| `food` | Culinary |
| `retail` | Retail |
| `services` | Services |
| `wholesale` | Wholesale |
| `manufacturing` | Manufacturing |
| `other` | Other |

---

## Database Schema (Drizzle + Turso)

Schema defined in `src/db/schema.ts`. All tables use `businessId` for multi-tenant isolation.

### Core Tables

| Table | Description |
|-------|-------------|
| `businesses` | Business/store entities |
| `users` | User accounts with email/password auth |
| `business_users` | Join table - users to businesses (role, status) |
| `products` | Product catalog with pricing and stock |
| `product_categories` | Custom categories per business |
| `product_settings` | Sort preferences, default category |
| `sales` | Sale transactions |
| `sale_items` | Line items for each sale |
| `providers` | Supplier information |
| `orders` | Purchase orders from suppliers |
| `order_items` | Line items for orders |
| `cash_sessions` | Cash drawer sessions |
| `cash_movements` | Cash movements (deposits/withdrawals) |
| `invite_codes` | Team member invitations (6-char codes) |
| `ownership_transfers` | Business ownership transfer records |
| `business_archives` | Deleted business recovery data |
| `app_config` | Application configuration |

### Schema Changes

Edit `src/db/schema.ts`, then `npm run db:push` (dev) or `npm run db:push:prod` (production).

---

## Development Guidelines

### Formatting Defaults
- **Language**: English
- **Currency**: USD ($) with 2 decimal places
- **Date Format**: MM/DD/YYYY
- **Number Format**: Comma for thousands, period for decimals (1,234.56)

### Code Standards
- **No emojis** in code, comments, UI, or commits
- Use TypeScript strict mode
- Validate inputs with Zod
- Use React Server Components where possible

### Time Formatting
```typescript
const time = now.toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
})
```

### Time-of-Day Greetings
```typescript
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema changes to dev database |
| `npm run db:push:prod` | Push schema changes to production database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |

Access via Tailscale IP for mobile testing: http://100.113.9.34:3000

---

## UI/CSS Guidelines

### CSS Variables (MUST USE)
All styling must use CSS variables from `globals.css`. Never hardcode colors.

```css
/* CORRECT */
color: var(--color-text-primary);
background: var(--color-brand);

/* WRONG */
color: #1E293B;
```

### Hover State Patterns
| Element | Hover Effect |
|---------|--------------|
| `.btn-primary` | `filter: brightness(0.92)` |
| `.btn-secondary` | `border-color: var(--color-brand)`, `background: var(--color-brand-subtle)` |
| `.card-interactive` | `border-color: var(--brand-300)` |

### Icons
Use Lucide React or custom SVG icons from `src/components/icons/`:
```tsx
// Lucide React (general purpose icons)
import { Home, ShoppingCart, Package } from 'lucide-react'

<Home className="w-5 h-5" />
<ShoppingCart size={20} />

// Custom SVG icons (55+ optimized icons)
import { SearchIcon, BusinessIcon, CashIcon } from '@/components/icons'

<SearchIcon className="w-5 h-5" />
<BusinessIcon className="w-6 h-6" />
```

**Custom icons include:** Business type icons (FoodBeverageIcon, RetailIcon, ServicesIcon, WholesaleIcon), navigation icons (HomeIcon, SalesIcon, CashIcon, ProductsIcon, ReportsIcon), and many utility icons. Check `src/components/icons/` for the full list.

### Modal Component (IMPORTANT)
When creating multi-step modals, `Modal.Footer` **MUST be a direct child** of `Modal.Step`:

```tsx
// CORRECT - Footer extracted properly, no extra padding
<Modal.Step title="Example">
  <MyContentComponent />   {/* Returns only Modal.Item elements */}
  <Modal.Footer>           {/* Direct child - works! */}
    <button>Save</button>
  </Modal.Footer>
</Modal.Step>

// WRONG - Footer inside sub-component, gets double padding
<Modal.Step title="Example">
  <MyStepComponent />      {/* Returns Modal.Item + Modal.Footer - broken! */}
</Modal.Step>
```

**Why:** Modal scans direct children for `_isModalStep` and `_isModalFooter` markers. Wrapper components that return `Modal.Step` or `Modal.Footer` are invisible to this scan — they get filtered out, breaking step indices and footer detection.

**Rules:**
1. `Modal.Step` must be a **direct child** of `Modal` (no wrapper components like `DeleteConfirmationStep`)
2. `Modal.Footer` must be a **direct child** of `Modal.Step`
3. For reusable content, extract content-only components that return `Modal.Item` elements
4. For buttons needing `useMorphingModal()`, create separate button components

### Multi-Step Modal Navigation

- Use `goToStep(index)` from `useMorphingModal()` to jump between steps
- Use `backStep` prop on `Modal.Step` to override default back navigation
- Footer updates based on `targetStep` during transitions, animates height automatically

### Modal Lottie Animations

Use **optimistic UI** for success/error steps — navigate instantly, API runs in background:

```tsx
// Handler: instant feedback, API in background
const handleDelete = () => {
  setItemDeleted(true)
  goToStep(3)
  onDelete(itemId) // fire and forget
}

// Success step with Lottie:
<Modal.Step title="Item Deleted" hideBackButton>
  <Modal.Item>
    <div className="flex flex-col items-center text-center py-4">
      <div style={{ width: 160, height: 160 }}>
        {itemDeleted && (
          <LottiePlayer
            src="/animations/error.json"
            loop={false}
            autoplay={true}
            delay={300}  // Match modal transition duration
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
        style={{ opacity: itemDeleted ? 1 : 0 }}
      >Item Deleted</p>
    </div>
  </Modal.Item>
  <Modal.Footer>
    <button onClick={handleClose} className="btn btn-primary flex-1">Done</button>
  </Modal.Footer>
</Modal.Step>
```

**Key points:**
- `delay={300}` matches modal transition so Lottie plays when fade-in completes
- Set state and navigate BEFORE the API call (optimistic)
- See `.claude/docs/performance-patterns.md` for full optimistic UI guidelines

**Available animations:**
- `/animations/success.json` - Green checkmark (save, create, receive)
- `/animations/error.json` - Red X (deletions)

---

## API Routes

All API routes use Drizzle ORM with Turso. Authentication is via JWT in HTTP-only cookies.

### Authentication
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Register new user account |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/logout` | POST | Logout (clear cookie) |
| `/api/auth/me` | GET | Get current user |
| `/api/setup-status` | GET | Check if app is set up |

### Business Management
| Route | Method | Description |
|-------|--------|-------------|
| `/api/businesses/list` | GET | List user's businesses |
| `/api/businesses/create` | POST | Create new business |
| `/api/businesses/[businessId]/access` | GET | Validate user access to business |
| `/api/businesses/[businessId]/leave` | POST | Leave a business |

### Invite Codes (Global)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/invite/validate` | GET | Validate invite code |
| `/api/invite/join` | POST | Join business with invite code |

### Ownership Transfer (Incoming)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/transfer/incoming` | GET | Get pending incoming transfers |
| `/api/transfer/accept` | POST | Accept ownership transfer |

---

**All routes below are scoped to `/api/businesses/[businessId]/`**

### Team Management
| Route | Method | Description |
|-------|--------|-------------|
| `/team` | GET | List team members and invite codes |
| `/invite/create` | POST | Create invite code |
| `/invite/delete` | POST | Delete invite code |
| `/invite/regenerate` | POST | Regenerate invite code |
| `/users/toggle-status` | POST | Toggle user active/disabled |
| `/users/change-role` | POST | Change user role |

### Ownership Transfer (Outgoing)
| Route | Method | Description |
|-------|--------|-------------|
| `/transfer/initiate` | POST | Initiate ownership transfer |
| `/transfer/pending` | GET | Get pending outgoing transfer |
| `/transfer/cancel` | POST | Cancel pending transfer |
| `/transfer/confirm` | POST | Confirm transfer after acceptance |

### Products
| Route | Method | Description |
|-------|--------|-------------|
| `/products` | GET | List products |
| `/products` | POST | Create product (FormData) |
| `/products/[id]` | PATCH | Update product (FormData) |
| `/products/[id]` | DELETE | Delete product |
| `/products/[id]/stock` | PATCH | Adjust stock |
| `/product-settings` | GET | Get sort preferences |
| `/product-settings` | PATCH | Update settings |

### Categories
| Route | Method | Description |
|-------|--------|-------------|
| `/categories` | GET | List categories |
| `/categories` | POST | Create category |
| `/categories/[id]` | PATCH | Update category |
| `/categories/[id]` | DELETE | Delete category |
| `/categories/reorder` | POST | Reorder categories |

### Providers
| Route | Method | Description |
|-------|--------|-------------|
| `/providers` | GET | List providers |
| `/providers` | POST | Create provider |
| `/providers/[id]` | PATCH | Update provider |
| `/providers/[id]` | DELETE | Delete provider |

### Orders (Purchase Orders)
| Route | Method | Description |
|-------|--------|-------------|
| `/orders` | GET | List orders with items |
| `/orders` | POST | Create order (FormData) |
| `/orders/[id]` | PATCH | Update order (FormData) |
| `/orders/[id]` | DELETE | Delete order |
| `/orders/[id]/receive` | POST | Receive order, update stock |

### Cash Drawer
| Route | Method | Description |
|-------|--------|-------------|
| `/cash/sessions` | GET | List cash sessions |
| `/cash/sessions` | POST | Open cash drawer |
| `/cash/sessions/current` | GET | Get current open session |
| `/cash/sessions/[id]` | GET | Get specific session |
| `/cash/sessions/[id]/close` | POST | Close session |
| `/cash/movements` | GET | List movements (query: sessionId) |
| `/cash/movements` | POST | Create movement |
| `/cash/movements/[id]` | PATCH | Update movement |
| `/cash/movements/[id]` | DELETE | Delete movement |
| `/cash/movements/counts` | GET | Get movement counts per session |

### AI Features (Global)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/ai/identify-product` | POST | Identify product from image |
| `/api/ai/generate-icon` | POST | Generate emoji icon from image |
| `/api/ai/remove-background` | POST | Remove image background |
| `/api/convert-heic` | POST | Convert HEIC to JPEG |

---

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | JWT signing secret (min 32 chars) |
| `TURSO_DATABASE_URL` | Turso dev database URL |
| `TURSO_AUTH_TOKEN` | Turso dev auth token |
| `TURSO_PROD_DATABASE_URL` | Turso prod database URL (for db:push:prod) |
| `TURSO_PROD_AUTH_TOKEN` | Turso prod auth token (for db:push:prod) |
| `OPENAI_API_KEY` | OpenAI API key (optional, for AI features) |
| `FAL_KEY` | fal.ai API key (optional, for emoji generation) |

---

## Payment Methods

| Method | Notes |
|--------|-------|
| **Cash** | Track in cash drawer |
| **Card** | Credit/debit card payments |
| **Other** | Other digital payments |

