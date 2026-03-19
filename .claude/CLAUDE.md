# Feria POS

## Project Overview

A **mobile-first point-of-sale system** for small businesses selling at ferias (market fairs). Built for speed, simplicity, and offline capability.

**Target users**: Small vendors at Peruvian ferias - food sellers, artisans, resellers.

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
| **Backend** | PocketBase (SQLite + Auth + Realtime) |
| **Phone Auth** | Firebase SMS OTP |
| **Icons** | Lucide React |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | PocketHost |

---

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Login, registration, invite flows
│   ├── (dashboard)/      # Main app routes (protected)
│   │   ├── inicio/       # Dashboard home
│   │   ├── ventas/       # Sales register
│   │   ├── productos/    # Product catalog
│   │   ├── caja/         # Cash drawer
│   │   ├── reportes/     # Reports
│   │   └── ajustes/      # Settings
│   └── api/              # API routes
├── components/
│   ├── ui/               # Base UI components
│   ├── auth/             # Auth components (PIN pad, OTP)
│   ├── layout/           # Layout components
│   └── caja/             # Cash drawer components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utilities
└── types/                # TypeScript types
pb_migrations/            # PocketBase schema migrations
```

---

## Database Schema (PocketBase)

### users
Extended auth collection with phone auth and PIN login.

### products
```javascript
{
  name: "text",           // Required
  price: "number",        // Selling price
  costPrice: "number",    // Cost price (optional)
  category: "select",     // Product category
  stock: "number",        // Current stock
  active: "bool"          // Default: true
}
```

### sales
```javascript
{
  date: "date",
  total: "number",
  paymentMethod: "select",  // cash, yape, plin
  channel: "select",        // feria, whatsapp
  notes: "text"
}
```

### sale_items
```javascript
{
  sale: "relation",       // -> sales
  product: "relation",    // -> products (nullable)
  productName: "text",    // Snapshot at time of sale
  quantity: "number",
  unitPrice: "number",
  subtotal: "number"
}
```

### cash_sessions
Cash drawer sessions with opening/closing balances.

### cash_movements
Individual cash movements (ingresos/retiros) within a session.

### orders
Purchase orders from suppliers.

### order_items
Line items for orders.

### providers
Supplier/vendor information.

### invite_codes
Team member invite codes.

### ownership_transfers
Business ownership transfer records.

---

## Development Guidelines

### Localization
- **Language**: All UI text in Spanish (es-PE)
- **Currency**: Peruvian Sol (S/) with 2 decimal places
- **Date Format**: DD/MM/YYYY
- **Time Zone**: America/Lima (UTC-5)
- **Number Format**: Comma for thousands, period for decimals (1,234.56)

### Code Standards
- **No emojis** in code, comments, UI, or commits
- Use TypeScript strict mode
- Validate inputs with Zod
- Use React Server Components where possible
- Plans go in `.claude/plans/` directory

### Time Formatting (es-PE Locale)
The Spanish Peru locale adds spaces in AM/PM. Always clean it:
```typescript
const time = now.toLocaleTimeString('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
}).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
```

### Time-of-Day Greetings
```typescript
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Buenos dias'
  if (hour >= 12 && hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start Next.js + PocketBase concurrently |
| `npm run build` | Build for production |
| `npm run db:reset` | Reset database and run migrations |
| `npm run pb:download` | Download PocketBase binary |

### Starting/Restarting Dev Servers (IMPORTANT)

**ALWAYS use `npm run dev:all` to start development servers.** Run it as a background task.

To restart servers:
1. Kill processes on ports 3000 and 8090: `lsof -ti:3000,8090 | xargs kill -9`
2. Start fresh: `npm run dev:all` (as background task)

### Dev Server URLs (Tailscale)

Access via Tailscale IP for both local and remote development:

| Service | URL |
|---------|-----|
| Next.js | http://100.113.9.34:3000 |
| PocketBase API | http://100.113.9.34:8090/api/ |
| PocketBase Admin | http://127.0.0.1:8090/_/ |

### Database Reset Workflow
After modifying migrations in `pb_migrations/`:
1. Stop `dev:all` (kill the background task)
2. Run `npm run db:reset`
3. Restart `dev:all` (as background task)

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

See `src/components/ui/modal/Modal.tsx` header comments and `src/app/(dashboard)/ajustes/equipo/page.tsx` for examples.

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

---

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `POCKETBASE_URL` | PocketBase server URL |
| `PB_ADMIN_EMAIL` | Admin email for db:reset |
| `PB_ADMIN_PASSWORD` | Admin password for db:reset |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase config for phone auth |

---

## Payment Methods (Peru)

| Method | Notes |
|--------|-------|
| **Cash (Efectivo)** | Track in cash drawer |
| **Yape** | BCP's mobile payment (QR/phone) |
| **Plin** | Interoperable with Yape since 2023 |

