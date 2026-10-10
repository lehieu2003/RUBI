<!-- generated-by: gsd-doc-writer -->

# Architecture

## System Overview

IceFlow is a web-based order and inventory management system built for a single ice factory, Nhà máy đá tinh khiết Rubi. It is not a multi-tenant SaaS: there is no super admin, no public registration and no subscription billing; the `Factory` table holds one row and every entity keeps its `factoryId`. It replaces pen-and-paper and Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking. The system targets 10-15 person operations with 2-4 delivery trucks handling 50-100 orders per day.

Primary users are office staff (order entry power users), drivers (delivery list and delivery confirmation), and the manager, i.e. the factory owner (reconciliation, debt, inventory, reports, settings). There are three roles only: `ADMIN`, `STAFF`, `DRIVER`; accounts are created by the manager. The core design principle is speed over everything.

The architecture follows a **layered full-stack pattern** with Next.js 15 App Router, Prisma ORM connecting to Supabase PostgreSQL, and JWT-based session authentication with role-based access control via Next.js middleware.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Office Staff │  │   Driver    │  │        Manager          │ │
│  │  (Chrome)   │  │ (Mobile)    │  │        (Owner)          │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────────┼───────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Middleware (RBAC)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐  │
│  │ /dashboard │  │ /orders    │  │ /customers │  │ /driver │  │
│  │ /inventory │  │ /settle    │  │ /vehicles  │  │ /d/[t]  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └────┬────┘  │
│        │              │              │              │        │
│  ┌─────▼──────────────▼──────────────▼──────────────▼─────┐  │
│  │              Server Actions / API Routes                 │  │
│  │   orders.ts, customers route, prices route, auth route   │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                    Prisma ORM                              │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │  PostgreSQL │  │   Supabase │  │  (Supabase  │
       │ (DIRECT_URL)│  │ Auth Helpers│  │   Storage) │
       └────────────┘  └────────────┘  └────────────┘
```

## Data Flow

### Order Creation (Office Staff)

1. Staff opens order entry drawer via `OrderEntryDrawer` component
2. `useOrderStore` (Zustand) manages customer selection and line items
3. Customer search uses Fuse.js fuzzy matching against `/api/customers`
4. Product prices loaded via `loadCustomerPrices()` server action (global + override merge)
5. On submit, `saveOrder()` server action validates with Zod schema
6. Prisma `order.create()` wraps in `$transaction` to create order + orderItems
7. `revalidatePath('/orders')` triggers Next.js cache invalidation
8. Success returns to UI; drawer closes and order appears in list

### Driver Delivery View

1. Driver signs in (role `DRIVER`) on the web at `/driver` or in the Flutter app; there is no share link
2. The page fetches the driver's assigned orders for the day via `/api/driver/orders`
3. `DeliveryCard` displays order items, customer address, and status
4. Driver confirms a delivery with `PATCH /api/orders/[id]/confirm`; no other write access

### Order Status Workflow

```
PENDING → SHIPPING → DELIVERED → COMPLETED
   │                      │
   └────── CANCELLED ◄────┘
```

1. Office assigns driver via `PATCH /api/orders/bulk-assign` or individual assignment
2. Driver opens delivery view, sees SHIPPING orders
3. Driver confirms delivery via `PATCH /api/orders/[id]/confirm` (no GPS is captured)
4. Status transitions to DELIVERED; deliveredAt timestamp recorded
5. Settlement workflow moves orders to COMPLETED after payment confirmation

## Key Abstractions

### Prisma Models (`prisma/schema.prisma`)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Authenticated staff with roles | email, password (bcrypt), role (ADMIN/STAFF/DRIVER), name, isActive |
| `Customer` | Wholesale buyers | code (KH001), name, address, phone, isActive, debtLedger, shellDeposit |
| `Product` | Ice types (Bi 5/10/20kg, Vien 5/10/20kg) | name, sizeKg, unit, isActive |
| `GlobalPrice` | Base price for all customers | productId (unique), pricePerUnit |
| `CustomerPriceOverride` | Per-customer negotiated prices | customerId, productId, pricePerUnit |
| `Driver` | Delivery personnel | name, phone, token (UUID), slug, isActive |
| `Order` | Customer orders with workflow | customerId, status, total, driverId, assignerId, deliveredAt, factoryId |
| `OrderItem` | Line items (product + qty + price) | orderId, productId, quantity, unitPrice, lineTotal, actualQty |
| `CustomerDebtLedger` | Debt/payment tracking | customerId, type (DEBT/PAYMENT), amount, notes |
| `CustomerShellDeposit` | Shell deposit tracking | customerId, shellsOut, shellsIn, depositPerShell |
| `Inventory` | Daily inventory snapshots | productId, date, quantityOnHand |

### Zustand Store (`src/stores/order-store.ts`)

`useOrderStore` manages the order entry hot path:
- `isOpen`, `customer`, `lineItems: Map<productId, LineItemData>`, `total`, `recentCustomerIds`
- `openDrawer()`, `closeDrawer()`, `setCustomer()`, `setLineItem()`, `removeLineItem()`
- `clearOrder()`, `addToRecent()` with localStorage persistence

### Server Actions (`src/lib/actions/orders.ts`)

- `loadCustomerPrices(customerId)` — merges global prices with customer overrides
- `saveOrder(input)` — Zod-validated order creation with transaction

### Pricing Library (`src/lib/pricing.ts`)

- `getCustomerPriceList(customerId)` — returns Map of all product prices
- `getPriceForCustomer(productId, customerId)` — single product price lookup
- `setGlobalPrice()`, `setCustomerPriceOverride()`, `removeCustomerPriceOverride()`

### Auth Module (`src/lib/auth.ts`)

- `signJWT(payload)` / `verifyJWT(token)` — JWT with jose library, 7-day expiration
- `getSession()` — reads auth_token cookie, returns JWTPayload
- `setSessionCookie()` / `clearSessionCookie()` — httpOnly, secure in production

### Middleware (`src/middleware.ts`)

Role-based access control protecting app routes:
- `ADMIN` (Quản lý): every office route — `/settle`, `/inventory`, `/vehicles`, `/assets`, `/schedule`, `/reports/debt`, `/deposits/shells`, `/settings`, `/config/prices` are ADMIN-only
- `STAFF` (Nhân viên): `/dashboard`, `/orders`, `/customers`, `/my-schedule`
- `DRIVER` (Tài xế): `/driver`, `/my-schedule`

Shift scheduling: a `ScheduleAssignment` has a `status`. Staff and drivers create their own as `PENDING` at `/my-schedule`; the manager approves or rejects them on `/schedule` (shifts the manager assigns are `APPROVED` directly). Only `APPROVED` shifts are counted by the monthly shift report at `/reports/shifts`.

Shift rules: a slot of today that has already ended cannot be requested; the factory can cap self-registrations per shift for staff and for drivers (`maxStaffPerShift`, `maxDriversPerShift`, set in Settings > Hồ sơ xưởng; the manager can still assign beyond the cap). The manager closes a payroll month on the report (`PayrollLock`); every route that changes shifts calls `rejectIfMonthLocked` and answers `409 PAYROLL_LOCKED` until the month is reopened. A month with pending requests cannot be closed.
- Unauthenticated API requests return 401 JSON

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Auth layout group: login
│   │   └── login/         # Login page
│   ├── api/               # API route handlers
│   │   ├── auth/          # Login, logout, refresh, me
│   │   ├── orders/        # Order CRUD, status, confirm, bulk-assign, reconcile
│   │   ├── customers/     # Customer listing
│   │   ├── products/      # Product listing
│   │   ├── prices/        # Global prices and customer overrides
│   │   │   ├── global/    # Global price management
│   │   │   └── customer/  # Customer price overrides
│   │   ├── driver/        # Driver order fetching
│   │   ├── staff/         # Staff management
│   │   ├── reports/       # Report endpoints (debt)
│   │   └── deposits/      # Shell deposit endpoints
│   ├── dashboard/        # Main dashboard
│   ├── orders/            # Order list and detail pages
│   ├── customers/         # Customer management
│   ├── inventory/         # Inventory view
│   ├── settle/            # Debt settlement
│   ├── vehicles/          # Vehicle/driver management
│   ├── driver/            # Driver delivery view
│   ├── config/prices/     # Price configuration page
│   ├── reports/           # Report pages (debt)
│   ├── deposits/shells/   # Shell deposit management
│   └── settings/          # Admin settings
├── components/            # React components
│   ├── dashboard/         # Dashboard widgets (stat-card, hourly-chart, sidebar, etc.)
│   ├── driver/            # Driver view (DeliveryCard, EmptyState)
│   ├── order/             # Order entry (order-entry-drawer, print-slip, search-bar)
│   ├── pricing/           # Price tables and forms
│   └── ui/                # Shared UI (Drawer component)
├── lib/                   # Server-side utilities
│   ├── auth.ts            # JWT sign/verify (jose), session management
│   ├── db.ts             # Prisma client singleton
│   ├── pricing.ts        # Price lookup and update functions
│   ├── supabase.ts       # Supabase client (future use)
│   └── actions/orders.ts  # Server actions for order operations
├── stores/               # Client-side Zustand stores
│   └── order-store.ts    # Order entry state management
├── db/                   # Database utilities
│   └── seed.ts           # Database seeding script
└── middleware.ts        # Next.js middleware for RBAC

prisma/
└── schema.prisma         # Database schema with all models

docs/                     # Documentation
└── ARCHITECTURE.md       # This file
```
