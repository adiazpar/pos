# Feria POS

A mobile-first point-of-sale system for small businesses selling at ferias (market fairs).

## Features

- **Sales Register** - Record transactions with cash, card, or other payments
- **Product Catalog** - Manage products with prices and cost tracking
- **Cash Drawer** - Opening/closing balance and reconciliation
- **Inventory** - Track stock levels and supplier orders
- **Dashboard** - Daily summaries and business insights
- **Team Management** - Invite partners/employees with role-based access
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
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

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
├── app/           # Next.js App Router
├── components/    # React components
├── contexts/      # React contexts
├── db/            # Drizzle schema & client
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── types/         # TypeScript types
```

## Development Guidelines

- **Language**: All UI in English
- **Currency**: US Dollar ($)
- **Date**: MM/DD/YYYY
- **Timezone**: America/New_York

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for full documentation.

## License

Private - All rights reserved.
