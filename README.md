<!-- generated-by: gsd-doc-writer -->
# IceFlow — Nhà máy đá tinh khiết Rubi

Web-based order and inventory management system for a single ice factory (Nhà máy đá tinh khiết Rubi). Replaces pen-and-paper/Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking for small-to-medium ice factory operations.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project credentials

# Initialize database (applies prisma/migrations)
npm run db:deploy
npm run admin:create   # create the manager account (asks for email and password)
# npm run db:seed      # demo data instead, local databases only

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
docker compose exec app npm run db:deploy
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
- **Customer payments**: The manager records money received on the debt report (`/reports/debt`), which lowers the customer's debt; each customer's debt and payment history is listed there
- **Inventory Tracking**: Monitor stock levels
- **Settlement**: End-of-day reconciliation by the manager
- **Shift scheduling**: Staff and drivers register their own shifts (3-hour slots) at `/my-schedule`; the manager approves or rejects each request and can still assign shifts directly
- **Shift report**: Monthly count of approved shifts, hours and days per person at `/reports/shifts`, exportable to CSV as the basis for payroll
- **Payroll lock**: The manager closes a month on the shift report so its shifts can no longer change; optional caps on how many staff and drivers self-register per shift
- **Print Support**: Print delivery slips directly from the browser

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    api/            # REST API endpoints
    (auth)/         # Authentication pages (login)
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
| `npm run db:migrate` | Create a migration from schema changes and apply it (development) |
| `npm run db:deploy` | Apply pending migrations (shared/production database) |
| `npm run db:seed` | Seed a local database with demo data (refuses remote databases) |
| `npm run admin:create` | Create the single manager account interactively |
| `npm run contract:docs` | Regenerate the OpenAPI files in `api/openapi/` from the API contracts |
| `npm run contract:verify` | Check a running local server against the API contracts |

## User Roles

- **Quản lý** (`ADMIN`, the factory owner): Full access — reconciliation, debt, inventory, vehicles, assets, scheduling, prices, settings, and all accounts
- **Nhân viên** (`STAFF`): Dashboard, order entry, customers, print delivery slips, registering their own shifts
- **Tài xế** (`DRIVER`): Daily delivery list and delivery confirmation (web `/driver` or the Flutter app in `mobile/`)

There is no public registration and no super admin: the app serves a single factory, and only the Quản lý creates accounts (Settings); nobody can create their own. The Quản lý account itself is created once with `npm run admin:create`. Accounts handed out by the Quản lý must set their own password at first login.

## Deployment

The app builds to a standalone Node server (`next.config.mjs` → `output: 'standalone'`) and ships as a Docker image (`Dockerfile`, multi-stage `node:20-alpine`). Configure at minimum `DATABASE_URL`, `DIRECT_URL` and `JWT_SECRET`.
