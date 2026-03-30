# Kasero

## Documentation

All project documentation and plans live in `.claude/docs/`:
- **Plans**: `.claude/docs/plans/` - Implementation plans and architecture docs
- **Specs**: `.claude/docs/` - Technical documentation and guides

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

### Hub Page Search

The hub page includes a search bar to filter businesses:
- Case-insensitive filtering by business name
- Search icon (custom SVG) on the left
- Clear button (X) appears when text is entered
- Shows "No businesses found" message when no matches

**Note:** The search input uses inline styles for padding to override the `.input` class:
```tsx
style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
```

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

### Schema Changes Workflow

1. Edit `src/db/schema.ts`
2. Push to development: `npm run db:push`
3. Test changes locally
4. Push to production: `npm run db:push:prod`

**Note:** `db:push` uses `--force` flag for development speed. For production, review changes carefully.

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

### Starting Dev Server

```bash
npm run dev
```

Access via Tailscale IP for mobile testing: http://100.113.9.34:3000

### Database Commands

**Push schema to development:**
```bash
npm run db:push
```

**Push schema to production (requires TURSO_PROD_* env vars):**
```bash
npm run db:push:prod
```

**Open Drizzle Studio to browse data:**
```bash
npm run db:studio
```

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
Use Lucide React for all icons:
```tsx
import { Home, ShoppingCart, Package } from 'lucide-react'

<Home className="w-5 h-5" />
<ShoppingCart size={20} />
```

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

**Why:** The `separateFooter()` function scans `step.props.children` for `Modal.Footer`. It cannot detect footers returned from sub-components because React hasn't rendered them yet.

**Pattern for reusable step content:**
1. Create content-only components that return ONLY `Modal.Item` elements
2. If footer buttons need `useMorphingModal()`, create separate button components
3. Place `Modal.Footer` as direct child of `Modal.Step`

See `src/components/ui/modal/Modal.tsx` header comments and `src/app/[businessId]/team/page.tsx` for examples.

### Multi-Step Modals with Variable Footers

When building multi-step modals where some steps have footers and others don't, the modal handles this automatically with smooth height animations.

**How it works:**
- Footer updates based on `targetStep` during transitions (not `currentStep`)
- AnimatedFooter uses CSS Grid to animate height changes
- The footer element stays in the DOM and animates between expanded/collapsed states

**Example - Steps with and without footers:**
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  {/* Step 0: No footer - just content */}
  <Modal.Step title="User Details" hideBackButton>
    <UserDetailsContent />
    {/* No Modal.Footer here - footer will animate to collapsed */}
  </Modal.Step>

  {/* Step 1: Has footer */}
  <Modal.Step title="Edit Phone" backStep={0}>
    <PhoneEditContent />
    <Modal.Footer>
      <CancelButton />
      <SaveButton />
    </Modal.Footer>
  </Modal.Step>
</Modal>
```

**Navigation between non-adjacent steps:**
Use `goToStep(index)` from `useMorphingModal()` to jump between steps:
```tsx
function UserDetailsContent() {
  const { goToStep } = useMorphingModal()
  return (
    <Modal.Item>
      <button onClick={() => goToStep(1)}>Edit Phone</button>
      <button onClick={() => goToStep(2)}>Change Role</button>
    </Modal.Item>
  )
}
```

**The `backStep` prop:**
Override the default back navigation to return to a specific step:
```tsx
<Modal.Step title="Edit Phone" backStep={0}>
  {/* Back button goes to step 0 instead of previous step */}
</Modal.Step>
```

### Modal Lottie Animations

When adding Lottie animations to modal success/error confirmation steps, use this pattern to prevent the animation from getting cut off during the modal transition:

```tsx
// State to trigger animation AFTER action completes
const [itemDeleted, setItemDeleted] = useState(false)

// In your delete handler:
const handleDelete = async () => {
  await fetch(`/api/items/${id}`, { method: 'DELETE' })
  setItemDeleted(true)  // Triggers animation
  goToStep(3)           // Navigate to success step
}

// Success/Error step with Lottie:
<Modal.Step title="Item Deleted" hideBackButton>
  <Modal.Item>
    <div className="flex flex-col items-center text-center py-4">
      {/* Fixed-size container prevents layout shift */}
      <div style={{ width: 160, height: 160 }}>
        {itemDeleted && (
          <LottiePlayer
            src="/animations/error.json"  // or success.json
            loop={false}
            autoplay={true}
            delay={500}  // CRITICAL: Wait for modal transition to complete
            style={{ width: 160, height: 160 }}
          />
        )}
      </div>
      {/* Text fades in with animation */}
      <p
        className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
        style={{ opacity: itemDeleted ? 1 : 0 }}
      >
        Item Deleted
      </p>
      <p
        className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
        style={{ opacity: itemDeleted ? 1 : 0 }}
      >
        The item has been deleted successfully
      </p>
    </div>
  </Modal.Item>

  <Modal.Footer>
    <button onClick={handleClose} className="btn btn-primary flex-1">
      Done
    </button>
  </Modal.Footer>
</Modal.Step>
```

**Key points:**
- `delay={500}` on LottiePlayer waits for modal step transition (~300ms) to complete before starting
- Conditional render `{itemDeleted && <LottiePlayer />}` ensures animation only plays when state is set
- Fixed container size (`width: 160, height: 160`) prevents layout shift while animation loads
- Text uses `transition-opacity` with inline `opacity` style to fade in sync with animation

**Available animations:**
- `/animations/success.json` - Green checkmark for successful actions (save, create, receive)
- `/animations/error.json` - Red X for deletions

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

### Setting Up Turso

```bash
# Install CLI
brew install tursodatabase/tap/turso

# Login
turso auth login

# Create dev database
turso db create pos-dev

# Get URL and token
turso db show pos-dev --url
turso db tokens create pos-dev
```

---

## Payment Methods

| Method | Notes |
|--------|-------|
| **Cash** | Track in cash drawer |
| **Card** | Credit/debit card payments |
| **Other** | Other digital payments |

