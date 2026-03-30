# Kasero

A multi-business management system for small businesses.

## Features

- **Multi-Business** - Manage multiple businesses from one account
- **Sales Register** - Record transactions with cash, card, or other payments
- **Product Catalog** - AI-powered product icons, categories, stock tracking
- **Cash Drawer** - Opening/closing balance and reconciliation
- **Inventory** - Track stock levels and supplier orders
- **Team Management** - Invite partners/employees with role-based access
- **Ownership Transfer** - Transfer business ownership to another user
- **Dashboard** - Daily summaries and business insights
- **Email Auth** - Simple email/password authentication
- **PWA** - Works offline, installable on mobile

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Turso (libSQL) + Drizzle ORM |
| **Auth** | Simple JWT (jose) + bcryptjs |
| **Icons** | Lucide React |
| **Hosting** | Vercel |

## Quick Start

```bash
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to dev database |
| `npm run db:push:prod` | Push schema to production database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:
- `TURSO_DATABASE_URL` - Turso database URL
- `TURSO_AUTH_TOKEN` - Turso auth token
- `AUTH_SECRET` - Secret for JWT signing (min 32 chars)

## Project Structure

```
src/
├── app/
│   ├── (auth)/        # Login, register
│   ├── (hub)/         # Business hub (select/create business)
│   ├── [businessId]/  # Business routes (dashboard, sales, products, etc.)
│   └── api/           # API routes
├── components/        # React components
├── contexts/          # React contexts (Auth, Business)
├── db/                # Drizzle schema & client
├── hooks/             # Custom hooks
├── lib/               # Utilities
└── types/             # TypeScript types
```

## Development Guidelines

- **Language**: English
- **Currency**: USD ($)
- **Date**: MM/DD/YYYY

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for full documentation.

## License

Private - All rights reserved.
