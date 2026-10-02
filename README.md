<!-- generated-by: gsd-doc-writer -->
# IceFlow SaaS

Web-based order and inventory management system for ice factories. Replaces pen-and-paper/Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking for small-to-medium ice factory operations.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project credentials

# Initialize database
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## Docker Development

Run the app and a local PostgreSQL database with Docker Compose:

```bash
docker compose up --build
```

The app runs at [http://localhost:3000](http://localhost:3000). The local database is available at:

```text
postgresql://iceflow:iceflow@localhost:5432/iceflow?schema=public
```

Run Prisma commands inside the app container when using Docker:

```bash
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (Supabase), Prisma ORM
- **State**: TanStack Query, Zustand
- **Auth**: Supabase Auth
- **Validation**: Zod, React Hook Form

## Key Features

- **Order Entry**: Fast order creation with customer search and automatic pricing
- **Driver Delivery View**: Mobile-friendly read-only view for drivers to confirm deliveries
- **Customer Management**: Track customer pricing and debt
- **Inventory Tracking**: Monitor stock levels
- **Settlement**: End-of-day reconciliation for accountants
- **Print Support**: Print delivery slips directly from the browser

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    api/            # REST API endpoints
    (auth)/         # Authentication pages (login, register)
    dashboard/      # Main dashboard
    orders/         # Order management
    customers/      # Customer management
    driver/         # Driver view
    inventory/      # Inventory management
    vehicles/       # Vehicle management
    settle/         # Settlement/reconciliation
    settings/       # Settings page
  components/       # React components
    ui/             # shadcn/ui components
    order/          # Order-related components
    dashboard/      # Dashboard components
    driver/         # Driver view components
    pricing/        # Pricing components
  lib/              # Utilities and database client
  stores/            # Zustand state stores
  db/               # Database seed script
prisma/
  schema.prisma      # Database schema
```

## Environment Variables

Configure your `.env` file with the following Supabase credentials:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `DATABASE_URL` | PostgreSQL pooled/application connection URL |
| `DIRECT_URL` | PostgreSQL direct connection URL (for Prisma) |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |

## User Roles

- **Admin**: Full access, view all reports
- **Accountant**: Confirm deliveries, track debt, reconciliation
- **Staff**: Order entry, print delivery slips

## Deployment

The app builds to a standalone Node server (`next.config.mjs` → `output: 'standalone'`) and ships as a Docker image (`Dockerfile`, multi-stage `node:20-alpine`). Configure at minimum `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` and — in production — `PAYMENT_WEBHOOK_SECRET` (the payment webhook fails closed without it).
