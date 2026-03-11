# Irvin POS

## Project Overview

A **multi-tenant point-of-sale platform** designed to bring life and creativity to business management. Originally built for a Chifles (traditional Peruvian plantain chip snack) business in Peru, now architected to serve any business at any scale.

### Vision: A POS With Soul

Most POS systems are gray, utilitarian, forgettable. Irvin is different:

- **Speed AND delight** - Efficient workflows that still feel good to use
- **Non-blocking joy** - Animations that celebrate without interrupting
- **Personality** - Design choices that make cashiers smile, not sigh
- **Crafted details** - Micro-interactions that reward attention

We reject the false choice between "fast and boring" or "pretty and slow."

### Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Non-blocking delight** | Success feedback happens *alongside* the next action, not *before* it |
| **Earned celebration** | Big moments (drawer close, shift end) get richer feedback than routine actions |
| **Motion with purpose** | Every animation guides attention or confirms state - no decoration |
| **Instant + beautiful** | 100-300ms transitions that feel both snappy and polished |
| **Sound as option** | Haptic/audio feedback for those who want it, visual-only for others |

### Animation Guidelines

**Use CSS transitions** for routine feedback (fast, zero bundle cost):
- Button press: scale(0.97) + color shift (100ms)
- Success: green pulse + icon morph (200ms)
- List item enter: translateY + fade (300ms staggered)

**Consider Lottie sparingly** for high-impact, low-frequency moments:
- Empty states (user is waiting anyway)
- Onboarding flows
- Shift-end summary / celebration
- First-time achievements

**Never block the workflow** - if an animation prevents the next tap, it's wrong.

### Origin Story

- **Original client**: Chifles vendor at Lima feria (market fair)
- **Original scope**: Single location, 3 users, cash + Yape payments
- **Current scope**: Multi-tenant platform for any retail business

---

## Tech Stack

| Layer | Technology | Status | Notes |
|-------|------------|--------|-------|
| **Frontend Hosting** | Vercel (Free) | USING | Hosts Next.js app, global CDN, auto HTTPS |
| **Backend Hosting** | PocketHost ($5/mo) | USING | Managed PocketBase hosting |
| **Frontend** | Next.js 15+ (App Router) | USING | React, SSR, great mobile support |
| **Backend** | PocketBase | USING | SQLite + Auth + Files + Realtime |
| **Language** | TypeScript | USING | Type safety for financial data |
| **Styling** | Tailwind CSS | USING | Rapid UI development, responsive design |
| **Database** | SQLite (via PocketBase) | USING | Simple, fast, reliable for this scale |
| **Domain** | Namecheap | USING | ~$10-13/year for .com domain |

### What We're NOT Using

| Technology | Why Not |
|------------|---------|
| ~~Vultr VPS~~ | Free tier is sufficient for 3 users |
| ~~Caddy~~ | Vercel/PocketHost handle HTTPS automatically |
| ~~Cloudflare~~ | Vercel has built-in CDN |
| ~~PM2~~ | No server to manage |
| ~~setup-server.sh~~ | No server to set up |

### Why This Stack?

1. **Low Cost**: ~$5/month for hosting + domain
2. **Zero Server Management**: No VPS to maintain, update, or secure
3. **Simple Deployment**: `git push` deploys automatically
4. **Good Enough Latency**: ~66ms from Lima to Vercel (Washington DC)
5. **Reliable**: Managed services handle uptime
6. **Easy Migration**: Can upgrade to self-hosted later if needed

### Latency Reality Check

Based on [Zenlayer's measured data](https://www.zenlayer.com/public-latency-table-dmd/):

| Route | Latency | Stack |
|-------|---------|-------|
| Lima → Santiago | 30ms | Self-hosted (Vultr) |
| Lima → Washington DC | 66ms | **Free tier (Vercel)** |
| Lima → São Paulo | 71ms | Vercel (if configured) |

The 36ms difference is minimal for a POS app. Free tier is fine for 3 users.

### Trade-offs: Managed vs Self-Hosted

| Aspect | Managed (Current) | Self-Hosted |
|--------|-------------------|-------------|
| **Cost** | ~$6/month | ~$7/month |
| **Latency** | ~66ms | ~30ms |
| **Cold starts** | Possible after inactivity | None |
| **Control** | Limited | Full |
| **Maintenance** | Zero | Some |

**Upgrade path:** If latency or cold starts become annoying, migrate to Vultr Santiago for ~$1/month more.

### Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "pocketbase": "^0.21.0",
  "firebase": "^10.14.0",
  "date-fns": "^3.0.0",
  "zod": "^3.22.0"
}
```

### PocketBase Benefits

- **Single Binary**: Download, run, done
- **Built-in Auth**: Email/password, OAuth providers
- **Admin Dashboard**: Visual database management at `/_/`
- **Realtime**: WebSocket subscriptions out of the box
- **File Storage**: Upload handling included
- **REST API**: Auto-generated for all collections
- **SDK**: Official JavaScript SDK for Next.js

### Firebase Phone Auth

Firebase is used ONLY for phone number verification via SMS OTP. PocketBase remains the primary auth system.

**Firebase Console:** https://console.firebase.google.com
**Project:** mrchifles-135b2

#### Authorized Domains (IMPORTANT)

When changing the app's domain, you MUST update Firebase authorized domains:

1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add/update domains as needed

**Current authorized domains:**

| Domain | Purpose |
|--------|---------|
| `localhost` | Default (keep it) |
| `100.113.9.34` | Local dev via Tailscale |
| `mrchifles.com` | Production |

**Note:** If you change the production domain, update Firebase authorized domains accordingly.

#### Environment Variables

```bash
# Get these from Firebase Console > Project Settings > Your apps > Web app
NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
```

#### SMS Region Policy (Optional)

To prevent SMS abuse, limit to Peru only:
1. Firebase Console > Authentication > Settings > SMS Region Policy
2. Set to "Allow" and select Peru (+51)

#### Test Phone Numbers (Development)

To avoid SMS costs during development:
1. Firebase Console > Authentication > Sign-in method > Phone numbers for testing
2. Add fake numbers like `+51999888777` with code `123456`
3. Up to 10 test numbers allowed

#### How It Works

```
User enters phone → Firebase sends SMS (client-side via reCAPTCHA)
→ User enters code → Firebase verifies (client-side)
→ App gets Firebase ID token → Server validates token
→ PocketBase creates/updates user account
```

#### Key Files

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase init, reCAPTCHA, OTP send/verify |
| `src/components/auth/firebase-phone-verify.tsx` | OTP verification UI component |
| `src/app/api/otp/verify/route.ts` | Server-side Firebase token validation |

#### Pricing

- **Free tier:** 10 test SMS/day, 50k MAU for basic auth
- **Real SMS:** ~$0.05-0.10 per SMS to Peru
- **For 3 users:** Essentially free

---

## Mobile Strategy

### Phase 1: Progressive Web App (PWA)

The web app will be built as a PWA from the start:

- Same codebase as web
- Installable on home screen
- Works offline (critical for unreliable connectivity)
- No app store approval needed
- Instant updates
- Push notifications

**PWA Implementation:**
- Service Worker for offline caching
- Web App Manifest for installation
- IndexedDB for offline data sync
- Background sync for queued sales

### Phase 2: React Native (Future)

If native app store presence is needed later:

| Consideration | Notes |
|---------------|-------|
| **Framework** | React Native with Expo |
| **Code Sharing** | React skills transfer, some component logic reusable |
| **When to Consider** | If PWA limitations become blocking (iOS restrictions, native features) |
| **Shared Backend** | Same PocketBase API, same data models |

**React Native would enable:**
- Native performance
- App store presence
- Better iOS integration
- Native camera/barcode scanning

**Recommendation**: Start with PWA. It covers 95% of use cases for a POS-style app. Only invest in React Native if specific native features are required.

---

## Peruvian Commerce Context

### Payment Methods

#### Yape (Primary Digital Payment)
- **Provider**: Banco de Crédito del Perú (BCP)
- **Users**: 17+ million users, 2+ million businesses
- **Transaction Limit**: S/ 2,000 accumulated per day
- **Business Commission**: 2.95% of total daily sales
- **Features**: QR code payments, phone number transfers, instant deposits
- **Integration**: For this MVP, manual entry of Yape payments (no API integration needed)

#### Plin (Secondary Digital Payment - Future)
- **Providers**: BBVA, Interbank, Scotiabank
- **Users**: ~14 million users
- **Interoperability**: Since July 2023, Yape and Plin are interoperable

#### Cash
- **Status**: Still represents 35% of POS payments in Peru (2023)
- **Currency**: Peruvian Sol (PEN/S/)
- **Consideration**: Must track cash drawer for reconciliation

### Tax Regime Options (SUNAT)

The client should consult with an accountant, but here are the likely applicable regimes:

#### NRUS (Nuevo Régimen Único Simplificado)
- **Best for**: Very small businesses, market stalls
- **Limits**: Monthly income ≤ S/ 8,000, Annual ≤ S/ 96,000
- **Documents**: Only boletas (no facturas)
- **Tax**: Fixed monthly fee based on income bracket
- **Books**: No accounting books required

#### RER (Régimen Especial de Renta)
- **Best for**: Small businesses needing facturas
- **Limits**: Annual income ≤ S/ 525,000, ≤ 10 employees
- **Tax**: 1.5% of monthly net income + 18% IGV
- **Books**: Purchase registry + Sales registry only

#### RMT (Régimen MYPE Tributario)
- **Best for**: Growing small businesses
- **Limits**: Annual income ≤ 1,700 UIT (≈ S/ 9,095,000)
- **Tax**: 10% on profits up to 15 UIT, 29.5% above

### Electronic Invoicing (Comprobantes Electrónicos)

Since 2022, electronic invoicing is mandatory for all taxpayers in Peru.

#### Boleta de Venta Electrónica
- **Use**: Sales to final consumers (B2C)
- **Buyer ID**: DNI (national ID)
- **SUNAT Submission**: Grouped in daily summary, sent next day
- **Note**: Does not allow IGV deduction for buyer

#### Factura Electrónica
- **Use**: Sales to businesses (B2B)
- **Buyer ID**: RUC (tax ID)
- **SUNAT Submission**: Must be sent within 3 calendar days
- **Note**: Allows IGV credit for buyer

#### Emission Systems
- **SEE-SOL**: Free SUNAT web portal (recommended for small business)
- **SUNAT Mobile App**: For small entrepreneurs
- **Third-party**: Paid services with API integration

### Employee Requirements (Planilla)

If employees are formally registered:

#### Mandatory Employer Contributions
- **EsSalud**: 9% of gross salary (health insurance)
- **Gratificaciones**: 13th and 14th month bonuses (July 15, December 15)
- **CTS**: ~9.72% annual (severance fund, deposited May/November)
- **Family Allowance**: 10% of minimum wage for employees with children
- **Life Insurance**: Mandatory from day 1 of employment

#### Minimum Wage (2025)
- **Monthly**: S/ 1,130
- **Hourly**: S/ 7.06

#### Planilla Electrónica
- Employers must register workers in electronic payroll system
- SUNAFIL conducts inspections
- Fines for misclassification or non-compliance

### Food Business Regulations (DIGESA)

For processed food products like Chifles:

- **Authority**: DIGESA (Dirección General de Salud Ambiental)
- **Requirement**: Sanitary registration for production/sale
- **Labeling**: Must comply with Peru's Healthy Eating Law (high sugar/sodium/fat warnings)
- **Quality**: Must meet microbiological and chemical safety standards

---

## Feature Requirements

### MVP Features (Phase 1)

#### 1. Sales Register (Registro de Ventas)
```
- Record individual sales transactions
- Select products/quantities from catalog
- Calculate totals automatically
- Record payment method (Cash/Yape)
- Associate with employee who made the sale
- Generate simple receipt (optional: share via WhatsApp)
- Daily sales summary view
```

#### 2. Product Catalog (Catálogo de Productos)
```
- Product name, description, flavor/variant
- Sale price (fixed)
- Cost price (for profit calculation)
- Active/inactive status
- Optional: product image
```

#### 3. Cash Drawer (Caja)
```
- Opening balance (apertura de caja)
- Track cash in/out throughout day
- Closing balance (cierre de caja)
- Reconciliation: expected vs actual cash
- Record discrepancies with notes
```

#### 4. Daily Summary (Resumen Diario)
```
- Total sales by payment method
- Number of transactions
- Top-selling products
- Profit margin (if cost prices entered)
- Cash drawer status
```

#### 5. User Management
```
- Simple PIN or password authentication
- User roles: Owner, Partner, Employee
- Track which user made each sale
```

### Phase 2 Features

#### 6. Inventory Management (Inventario)
```
- Track stock levels
- Record inventory purchases (entries)
- Automatic deduction on sales
- Low stock alerts
- Inventory value calculation
```

#### 7. Expense Tracking (Gastos)
```
- Record business expenses
- Categories: ingredients, packaging, transport, rent, utilities, etc.
- Payment method tracking
- Monthly expense summaries
```

#### 8. Financial Reports (Reportes)
```
- Daily/weekly/monthly sales reports
- Profit & loss statements
- Sales by product analysis
- Sales by employee
- Export to Excel/PDF
```

### Phase 3 Features (Future)

#### 9. Electronic Invoicing Integration
```
- Generate boletas electrónicas
- Integration with SUNAT SEE-SOL
- Daily summary submission
```

#### 10. Employee Payroll Tracking
```
- Record employee hours/shifts
- Calculate payroll obligations
- Track gratificaciones and CTS
```

#### 11. React Native Mobile App
```
- Native iOS/Android apps (if PWA insufficient)
- Offline-first with sync
- Barcode/QR scanning
- Push notifications
```

---

## Data Models (PocketBase Collections)

PocketBase uses collections instead of traditional ORM models. The schema is intentionally simple: 5 tables total.

### products
```javascript
{
  name: "text",           // Required - e.g., "Chifles Grande Tocino"
  price: "number",        // Required - selling price per unit
  costPrice: "number",    // Optional - estimated cost per unit
  active: "bool"          // Default: true
}
```

### sales
```javascript
{
  date: "date",               // Required
  total: "number",            // Required
  paymentMethod: "select",    // Options: cash, yape, plin
  channel: "select",          // Options: feria, whatsapp
  notes: "text"               // Optional
}
```

### sale_items
```javascript
{
  sale: "relation",       // -> sales, required
  product: "relation",    // -> products, optional (can be null if product deleted)
  productName: "text",    // Snapshot of product name at time of sale
  quantity: "number",     // Required, min: 1
  unitPrice: "number",    // Price at time of sale (after promos)
  subtotal: "number"      // quantity * unitPrice
}
```

### orders (purchases from DaSol)
```javascript
{
  date: "date",               // Required - when ordered
  receivedDate: "date",       // Optional - when arrived
  total: "number",            // Required - what we paid
  status: "select",           // Options: pending, received
  notes: "text"               // Optional
}
```

### order_items
```javascript
{
  order: "relation",      // -> orders, required
  product: "relation",    // -> products, required
  quantity: "number"      // Required - units ordered
}
```

### How It Works

**Sales flow:**
- One `sale` = one customer transaction
- Multiple `sale_items` = line items on that receipt
- App calculates promo pricing, stores final price in `unitPrice`

**Orders flow:**
- One `order` = one purchase from DaSol
- Multiple `order_items` = products in that shipment
- Total cost tracked at order level (universal approach)

**Profit calculation:**
- Revenue = sum of all sales totals
- Cost = sum of all order totals
- Profit = Revenue - Cost

---

## UI/UX Guidelines

### Design Principles
1. **Alive, Not Static**: Motion and feedback make the app feel responsive and crafted
2. **Spanish Language**: All UI text in Spanish (Peru locale: es-PE)
3. **Accessible**: Large fonts, high contrast, `prefers-reduced-motion` support
4. **Mobile-First**: Works well on smartphones (primary use case during sales)
5. **Offline-Capable**: PWA with service worker for unreliable connectivity
6. **Premium Feel**: Typography hierarchy, dual-layer shadows, subtle gradients

### Color Palette
- **Brand**: Sky blue (#0EA5E9) - professional, trustworthy
- **Success**: Forest green (#2E7D4A) - money in, positive actions
- **Warning**: Amber (#C17F24) - attention needed
- **Error**: Deep red (#B91C1C) - problems, money out
- **Neutrals**: Cool slate scale for text hierarchy

### Animation Hierarchy
| Action Type | Animation Budget | Example |
|-------------|------------------|---------|
| **Routine** (button tap, input) | 100-150ms | Scale + color |
| **Confirmation** (save, submit) | 200-300ms | Checkmark morph + pulse |
| **Transition** (page, modal) | 300-400ms | Slide + fade |
| **Celebration** (shift end, goal hit) | 500-800ms | Confetti, Lottie OK |

### Key UI Patterns
- Large buttons for common actions (min 48px touch targets)
- Numeric keypad for quick quantity entry
- Swipe gestures for mobile navigation
- Non-blocking toast notifications for success/error
- Staggered list animations for visual rhythm
- Bottom navigation for mobile (max 5 items)

---

## Project Structure

```
/
├── pb_data/                   # PocketBase data (SQLite + uploads)
│   ├── data.db               # SQLite database
│   └── storage/              # Uploaded files
├── pb_migrations/             # PocketBase schema migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Login, PIN entry
│   │   │   ├── login/
│   │   │   └── pin/
│   │   ├── (dashboard)/      # Main app routes (protected)
│   │   │   ├── ventas/       # Sales register
│   │   │   ├── productos/    # Product catalog
│   │   │   ├── caja/         # Cash drawer
│   │   │   ├── reportes/     # Reports
│   │   │   └── ajustes/      # Settings
│   │   ├── layout.tsx
│   │   ├── manifest.ts       # PWA manifest
│   │   └── sw.ts             # Service worker
│   ├── components/
│   │   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   │   ├── sales/            # Sales-specific components
│   │   ├── products/         # Product components
│   │   ├── cash-drawer/      # Cash drawer components
│   │   └── reports/          # Report components
│   ├── lib/
│   │   ├── pocketbase.ts     # PocketBase client singleton
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── offline.ts        # Offline sync utilities
│   │   └── utils.ts          # Helper functions (currency, dates)
│   ├── hooks/
│   │   ├── useAuth.ts        # Auth state hook
│   │   ├── useSales.ts       # Sales data hook
│   │   └── useOffline.ts     # Offline status hook
│   └── types/
│       └── index.ts          # TypeScript types
├── public/
│   ├── icons/                # PWA icons
│   └── ...
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           YOUR BROWSER                              │
│                     (Phone/Desktop in Lima)                         │
└─────────────────────────────────────────────────────────────────────┘
                          │                    │
                          │ ~66ms              │ ~66ms
                          ▼                    ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│         VERCEL (Free)           │  │      POCKETHOST ($5/mo)         │
│        mrchifles.com            │  │    mrchifles.pockethost.io      │
│                                 │  │                                 │
│  ┌───────────────────────────┐  │  │  ┌───────────────────────────┐  │
│  │      Next.js App          │  │  │  │      PocketBase           │  │
│  │   (React, TypeScript)     │  │  │  │   (Auth, API, Realtime)   │  │
│  └───────────────────────────┘  │  │  └───────────────────────────┘  │
│                                 │  │                                 │
│  - Global CDN                   │  │  ┌───────────────────────────┐  │
│  - Auto HTTPS                   │  │  │      SQLite Database      │  │
│  - Auto deployments from Git    │  │  │      (managed backups)    │  │
│                                 │  │  └───────────────────────────┘  │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

### How It Works

1. **Frontend (Vercel)**: Hosts your Next.js app. Auto-deploys when you push to GitHub.
2. **Backend (PocketHost)**: Hosts PocketBase with your database. Accessed directly from browser.
3. **No server to manage**: Both services handle scaling, HTTPS, and uptime.

### Deployment Workflow

```
┌──────────────┐     git push     ┌──────────────┐     auto-deploy    ┌──────────────┐
│  Your Mac    │ ───────────────► │    GitHub    │ ─────────────────► │    Vercel    │
│ (write code) │                  │ (repository) │                    │  (live app)  │
└──────────────┘                  └──────────────┘                    └──────────────┘
```

**To deploy changes:**
```bash
git add .
git commit -m "Your changes"
git push
```

That's it. Vercel auto-deploys in ~30 seconds.

### Environment Variables

**In Vercel Dashboard** (Settings → Environment Variables):
```
NEXT_PUBLIC_POCKETBASE_URL=https://mrchifles.pockethost.io
```

**In PocketHost Dashboard**:
- Create your instance at pockethost.io
- Note your instance URL (e.g., `mrchifles.pockethost.io`)

### Custom Domain

The app uses `mrchifles.com` (registered via Namecheap, pointed to Vercel).

**DNS Configuration (in Namecheap):**
| Type | Host | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

Vercel handles HTTPS automatically.

### Backup Strategy

PocketHost includes automatic backups. You can also:
1. Export data from PocketHost dashboard
2. Download your SQLite database periodically

### Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Vercel Hosting | Free | - |
| PocketHost Hosting | $5.00 | Monthly |
| Domain (.com via Namecheap) | ~$10-13 | Yearly |
| SSL Certificates | Free | Automatic |
| **Total Year 1** | **~$70-73** | (~$6/month) |
| **Total Year 2+** | **~$75-78** | (~$6.50/month, higher renewal) |

### Upgrade Path (If Needed Later)

If free tier limitations become a problem:

| Issue | Solution | Cost |
|-------|----------|------|
| Cold starts annoying | Upgrade to Vercel Pro | $20/mo |
| Need more PocketHost resources | Upgrade PocketHost plan | $5/mo |
| Want full control | Self-host on Vultr Santiago | $7/mo |

---

## Self-Hosted Alternative (Future Option)

<details>
<summary>Click to expand self-hosted setup info</summary>

If you later decide to self-host for lower latency (~30ms vs ~66ms) or to combine frontend + backend hosting:

### Architecture
```
VPS (Santiago, Chile) - ~$6/mo
├── Caddy (reverse proxy, auto HTTPS)
├── Next.js (port 3000)
└── PocketBase (port 8090)
```

### Why Consider Self-Hosting?
- Lower latency (~30ms from Lima to Santiago vs ~66ms to Washington DC)
- Combined hosting could be cheaper than Vercel + PocketHost separately
- Full control over the server

### Getting Started
The self-hosted deployment files (Caddyfile, setup scripts) were removed to keep the repo clean. If you decide to self-host, you would need to:
1. Set up a VPS (Vultr Santiago recommended)
2. Create a Caddyfile for reverse proxy
3. Set up PM2 or systemd for process management
4. Configure auto-deployment

</details>

---

## Development Guidelines

### For AI Agents Working on This Project

1. **Language**: All user-facing text must be in **Spanish** (Peru locale: es-PE)
2. **Currency**: Always use Peruvian Sol (S/) with 2 decimal places
3. **Date Format**: DD/MM/YYYY (Peruvian standard)
4. **Time Zone**: America/Lima (UTC-5)
5. **Number Format**: Use comma for thousands, period for decimals (1,234.56)
6. **No Emojis**: Never use emojis in code, documentation, UI text, comments, or commit messages. Keep all output professional and text-only.
7. **Plans Directory**: All implementation plans for this project must be written to `.claude/plans/` directory. Use descriptive filenames like `feature-name.md` or `bugfix-description.md`.

### PocketBase SDK Usage

```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Auth
await pb.collection('users').authWithPassword(email, password);

// CRUD
const products = await pb.collection('products').getFullList();
const sale = await pb.collection('sales').create({ ... });

// Realtime
pb.collection('sales').subscribe('*', (e) => {
  console.log(e.action, e.record);
});
```

### Code Standards
- Use TypeScript strict mode
- Validate all inputs with Zod
- Use React Server Components where possible
- Keep components small and focused
- Use Spanish for variable names in business logic where clarity helps

### UI/CSS Guidelines

**IMPORTANT**: Read this section before creating or modifying any UI components.

#### CSS Variables (MUST USE)
All styling must use CSS variables from `globals.css`. Never use hardcoded colors, spacing, or font values.

```css
/* CORRECT */
color: var(--color-text-primary);
background: var(--color-brand);
padding: var(--space-4);
border-radius: var(--radius-lg);

/* WRONG */
color: #1E293B;
background: #0EA5E9;
padding: 16px;
border-radius: 10px;
```

#### Buttons Styled as Links (CRITICAL)
When using Next.js `<Link>` with button classes, the base anchor styles in `globals.css` will interfere. The `.btn` class has overrides, but be aware:

```tsx
/* CORRECT - Link with btn classes */
<Link href="/ventas" className="btn btn-primary btn-lg">
  Nueva Venta
</Link>

/* The CSS already handles: */
/* - text-decoration: none on hover */
/* - color stays consistent (not brand-hover) */
```

If adding new button variants, ALWAYS include hover state with:
- `text-decoration: none;`
- Explicit `color` value
- Consistent `background` change (use `var(--color-brand-subtle)` for light buttons)

#### Hover State Consistency
All interactive elements must have consistent hover behavior:

| Element Type | Hover Effect |
|--------------|--------------|
| `.btn-primary` | `filter: brightness(0.92)`, keeps white text |
| `.btn-secondary` | `border-color: var(--color-brand)`, `background: var(--color-brand-subtle)` |
| `.quick-action` | `border-color: var(--color-brand)`, `background: var(--color-brand-subtle)` |
| `.card-interactive` | `border-color: var(--brand-300)` |

**Never** add hover effects that:
- Add underlines to buttons
- Change text color unexpectedly
- Use box-shadow for lift effects (we use border-color changes instead)

#### Time Formatting (es-PE Locale)
The Spanish Peru locale adds spaces in AM/PM: "1:30 a. m." - this looks wrong. Always clean it:

```typescript
const time = now.toLocaleTimeString('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
}).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
```

#### Time-of-Day Greetings
Use these hour ranges for Spanish greetings:

```typescript
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'Buenos dias'    // 6am - 11:59am
  if (hour >= 12 && hour < 18) return 'Buenas tardes' // 12pm - 5:59pm
  return 'Buenas noches'                               // 6pm - 5:59am
}
```

**Note**: 12am-6am is "Buenas noches" (night), NOT "Buenos dias" (morning).

#### Component Patterns
- Use native `<button>` elements with CSS classes instead of creating Button components that need icon imports
- Only create component wrappers when they add significant logic (loading states, validation, etc.)
- For simple styling, CSS classes are preferred over component abstractions

### Offline-First Patterns
```typescript
// Queue sales when offline
if (!navigator.onLine) {
  await saveToIndexedDB('pendingSales', sale);
} else {
  await pb.collection('sales').create(sale);
}

// Sync when back online
window.addEventListener('online', syncPendingSales);
```

### Testing Considerations
- Test with realistic Peruvian product names
- Test currency calculations with common Peruvian amounts
- Verify mobile responsiveness thoroughly
- Test offline functionality
- Test PWA installation on Android and iOS

### Security
- Hash PINs before storage (PocketBase handles password hashing)
- Validate all API inputs
- Use HTTPS only (Caddy handles this automatically)
- No sensitive data in client-side storage
- Use PocketBase API rules for authorization

---

## Glossary (Spanish-English)

| Spanish | English | Context |
|---------|---------|---------|
| Venta | Sale | A sales transaction |
| Producto | Product | Item being sold |
| Caja | Cash drawer | Cash management |
| Boleta | Receipt/Invoice | For consumers (B2C) |
| Factura | Invoice | For businesses (B2B) |
| Efectivo | Cash | Payment method |
| IGV | Sales tax | 18% in Peru |
| Chifles | Plantain chips | The product being sold |
| Apertura | Opening | Start of cash drawer |
| Cierre | Closing | End of cash drawer |
| Gastos | Expenses | Business costs |
| Ingresos | Income | Revenue |
| Ganancia | Profit | Revenue minus costs |

---

## Local Development Setup

### Prerequisites

- **Node.js 18+** (recommended: use nvm with `.nvmrc`)
- **Git**
- **Tailscale** (for unified local + remote development)

### Development Modes

This project supports two development modes with a **unified configuration**:

| Mode | How you access | URL to use |
|------|----------------|------------|
| **Local (Mac)** | Browser on your Mac | http://100.113.9.34:3000 |
| **Remote (Phone/SSH)** | Phone via Tailscale + Terminus | http://100.113.9.34:3000 |

**Key insight:** Using the Tailscale IP (100.113.9.34) works for BOTH modes because:
- Locally, Tailscale routes the IP to your own machine
- Remotely, Tailscale makes your machine accessible from anywhere

**Requirement:** Keep Tailscale running on your Mac during development.

### Service URLs

| Service | URL |
|---------|-----|
| Next.js App | http://100.113.9.34:3000 |
| PocketBase API | http://100.113.9.34:8090/api/ |
| PocketBase Admin | http://100.113.9.34:8090/_/ (or http://127.0.0.1:8090/_/) |

### Development Server Management (Claude Agents)

**CRITICAL:** Only use `npm run dev:all` to run development servers. This command uses `concurrently` to manage both Next.js and PocketBase in a single process tree.

**Starting Development:**
```bash
npm run dev:all
```
Run this as a single background task. Do NOT start Next.js and PocketBase separately.

**Stopping Development:**
Kill the single `dev:all` background task. Do NOT use `pkill` to kill individual processes - this corrupts the `.next` cache.

**Resetting Database (when migrations change):**
```bash
# 1. Stop the dev:all background task first
# 2. Reset database and restart:
npm run db:reset && npm run dev:all
```

**If `.next` cache becomes corrupted (404 errors, MIME type errors):**
```bash
rm -rf .next && npm run dev:all
```

**Why this matters:**
- Using `pkill` to kill Next.js abruptly corrupts `.next` cache
- Running multiple background tasks creates orphan processes
- `concurrently` properly manages child process cleanup

### Database Migration Workflow

When working on database migrations (files in `pb_migrations/`), agents MUST run `npm run db:reset` after completing the migration work. This command:

1. Deletes the existing database (`pb_data/`)
2. Runs all migrations to create fresh schema
3. Creates the admin account using credentials from `.env.local`

**After modifying migrations, always run:**
```bash
npm run db:reset
```

**Migration files location:** `pb_migrations/`
**TypeScript types location:** `src/types/index.ts`

When modifying the database schema:
1. Update the migration file(s) in `pb_migrations/`
2. Update TypeScript types in `src/types/index.ts` to match
3. Stop `dev:all`, run `npm run db:reset`, then restart `dev:all`

### Quick Start

```bash
# Clone the repo
git clone https://github.com/adiazpar/mrchifles.git
cd mrchifles

# Install dependencies
npm install

# Download PocketBase binary (auto-detects your OS)
npm run pb:download

# Start both Next.js and PocketBase
npm run dev:all
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run pb:start` | Start PocketBase server (port 8090) |
| `npm run dev:all` | Start both Next.js and PocketBase concurrently |
| `npm run pb:download` | Download PocketBase binary for your platform |
| `npm run pb:migrate` | Run pending database migrations |
| `npm run db:reset` | Reset database, run migrations, create admin account |
| `npm run build` | Build Next.js for production |
| `npm run lint` | Run ESLint |

### First Time Setup

1. **Start PocketBase**: `npm run pb:start`
2. **Open Admin UI**: http://127.0.0.1:8090/_/
3. **Create admin account** (first time only)
4. **Create collections** (see Data Models section)
5. **Start Next.js**: `npm run dev`
6. **Open app**: http://localhost:3000

### Project URLs (Development)

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| PocketBase API | http://127.0.0.1:8090/api/ |
| PocketBase Admin | http://127.0.0.1:8090/_/ |

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Default values work for local development. Update `POCKETBASE_URL` for production.

### No Docker Required

This setup is intentionally lightweight:
- **PocketBase**: Single binary, no container needed
- **Next.js**: Runs with Node.js directly
- **SQLite**: File-based, no database server

For production, see the Deployment Architecture section.

---

## References & Resources

### Core Tech Stack Documentation

| Technology | Documentation | API Reference |
|------------|---------------|---------------|
| **Next.js 15** | [nextjs.org/docs](https://nextjs.org/docs) | [App Router](https://nextjs.org/docs/app) |
| **React 18** | [react.dev](https://react.dev/) | [Reference](https://react.dev/reference/react) |
| **TypeScript** | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) | [Handbook](https://www.typescriptlang.org/docs/handbook/) |
| **Tailwind CSS** | [tailwindcss.com/docs](https://tailwindcss.com/docs) | [Utilities](https://tailwindcss.com/docs/utility-first) |
| **PocketBase** | [pocketbase.io/docs](https://pocketbase.io/docs/) | [API](https://pocketbase.io/docs/api-records/) |
| **PocketBase JS SDK** | [github.com/pocketbase/js-sdk](https://github.com/pocketbase/js-sdk) | [README](https://github.com/pocketbase/js-sdk#readme) |
| **Zod** | [zod.dev](https://zod.dev/) | [API](https://zod.dev/?id=basic-usage) |
| **date-fns** | [date-fns.org/docs](https://date-fns.org/docs/Getting-Started) | [Functions](https://date-fns.org/docs/Getting-Started) |

### Deployment & Infrastructure (Free Tier)

| Service | Documentation |
|---------|---------------|
| **Vercel** | [vercel.com/docs](https://vercel.com/docs) |
| **PocketHost** | [pockethost.io/docs](https://pockethost.io/docs) |
| **Namecheap (Domains)** | [namecheap.com](https://www.namecheap.com/) |

### Self-Hosted Alternative (Optional)

| Service | Documentation |
|---------|---------------|
| **Vultr** | [vultr.com/docs](https://docs.vultr.com/) |
| **Caddy Server** | [caddyserver.com/docs](https://caddyserver.com/docs/) |

### PWA Resources
- [web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [Workbox (Service Worker Toolkit)](https://developer.chrome.com/docs/workbox/)
- [PWA Builder](https://www.pwabuilder.com/)

### Peruvian Commerce
- [SUNAT - Tax Authority](https://www.sunat.gob.pe/)
- [SUNAT Emprender Portal](https://emprender.sunat.gob.pe/)
- [Yape Business](https://www.yape.com.pe/)
- [DIGESA - Food Safety](http://www.digesa.minsa.gob.pe/)

### Future: React Native
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [React Native Paper (UI)](https://reactnativepaper.com/)

---

## Claude Code Plugins

Install plugins via the `/plugin` command in Claude Code.

### Recommended Plugins for This Project

| Plugin | Purpose | Install |
|--------|---------|---------|
| **typescript-lsp** | Real-time TypeScript type checking and error detection | `/plugin install typescript-lsp` |
| **frontend-design** | UI/UX specialist for interface development | `/plugin install frontend-design` |
| **Context7** | Fetches current API docs (Next.js, React, etc.) | `/plugin install context7` |
| **Playwright** | Browser automation and E2E testing | `/plugin install playwright` |
| **GitHub** | PR reviews, branch management, code search | `/plugin install github` |
| **code-review** | Multi-agent code review (security, performance) | `/plugin install code-review` |
| **pr-review-toolkit** | Specialized PR review agents | `/plugin install pr-review-toolkit` |

### All Available Plugin Categories

**LSP Plugins** (Language Servers):
- typescript-lsp, pyright-lsp, rust-analyzer-lsp, gopls-lsp, jdtls-lsp, csharp-lsp, swift-lsp, php-lsp, lua-lsp, clangd-lsp

**Workflow Plugins**:
- security-guidance, code-review, pr-review-toolkit, feature-dev, frontend-design

**External Integrations**:
- GitHub, Supabase, Context7, Playwright, Firebase, Stripe, Greptile, Linear, Slack, GitLab, Asana, Laravel Boost, Serena


## Mobile Screenshots
When I say "check mobile screenshot" or "check icloud screenshot", check ~/ss/ for the most recent file using: ls -t ~/ss/ | head -1

### Plugin Resources
- [Official Plugin Directory](https://github.com/anthropics/claude-plugins-official)
- [Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Plugin Marketplace Guide](https://code.claude.com/docs/en/discover-plugins)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-10 | Initial CLAUDE.md created |
| 0.2.0 | 2026-02-10 | Revised tech stack: Hetzner VPS + PocketBase. Added mobile strategy (PWA first, React Native future). Updated data models for PocketBase collections. Added deployment architecture. |
| 0.3.0 | 2026-02-10 | Added Local Development Setup section. Project scaffolded with Next.js, PocketBase download script, TypeScript types, and utility functions. |
| 0.4.0 | 2026-02-10 | Fixed cross-platform portability (Windows support). Added comprehensive documentation links. Added MCP servers section. Added no-emoji policy. |
| 0.5.0 | 2026-02-10 | Simplified database schema to 5 tables (products, sales, sale_items, orders, order_items). Added db:reset script for automated database reset. Added Database Migration Workflow for agents. Environment variables for admin credentials. |
| 0.6.0 | 2026-02-10 | Added one-command deployment (npm run deploy). Added server setup script. Simplified production workflow. |
| 0.7.0 | 2026-02-15 | Changed hosting from Hetzner (Germany) to Vultr (Santiago, Chile) for lower latency to Peru (~30-50ms vs ~250ms). Added Cloudflare for DNS/CDN. Updated deployment guide with Vultr-specific instructions. Added Caddyfile template. Domain registrar: Namecheap. Added Vultr auto-backups to cost summary. |
| 0.8.0 | 2026-02-15 | Switched to managed deployment: Vercel (frontend, free) + PocketHost (backend, $5/mo). Removed Vultr, Caddy, Cloudflare, PM2 from active stack. Measured actual latency: Lima→Washington DC is 66ms (vs 30ms to Santiago), acceptable for 3-user POS app. Total cost ~$6/mo. Self-hosted remains as optional upgrade path for lower latency. |
