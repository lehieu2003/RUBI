<!-- generated-by: gsd-doc-writer -->

# Architecture

## System Overview

IceFlow SaaS is a web-based order and inventory management system for ice factories. It replaces pen-and-paper and Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking. The system targets 10-15 person operations with 2-4 delivery trucks handling 50-100 orders per day.

Primary users are office staff (order entry power users), drivers (read-only web view), accountants (delivery confirmation and debt reconciliation), and factory owners (reports and debt overview). The core design principle is speed over everything.

The architecture follows a **layered full-stack pattern** with Next.js 15 App Router, Prisma ORM connecting to Supabase PostgreSQL, and JWT-based session authentication with role-based access control.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Office Staff │  │   Driver    │  │      Accountant/        │ │
│  │  (Chrome)   │  │ (Mobile)    │  │        Owner            │ │
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
2. `OrderStore` (Zustand) manages customer selection and line items
3. Customer search uses Fuse.js fuzzy matching against `/api/customers`
4. Product prices loaded via `loadCustomerPrices()` server action (global + override merge)
5. On submit, `saveOrder()` server action validates with Zod schema
6. Prisma `order.create()` wraps in `$transaction` to create order + orderItems
7. `revalidatePath('/orders')` triggers TanStack Query cache invalidation
8. Success returns to UI; drawer closes and order appears in list

### Driver Delivery View

1. Driver accesses `/d/[token]` with unique token from Driver.slug field
2. `DriverMap` component fetches assigned orders via `/api/driver/orders`
3. `DeliveryCard` displays order items, customer address, and status
4. Driver has no write access — read-only view optimized for mobile

### Order Status Workflow

```
PENDING → SHIPPING → DELIVERED → COMPLETED
   │                      │
   └────── CANCELLED ◄────┘
```

1. Office assigns driver via `PATCH /api/orders/bulk-assign` or individual assignment
2. Driver opens delivery view, sees SHIPPING orders
3. Accountant confirms delivery via `POST /api/orders/[id]/confirm`
4. Status transitions to DELIVERED; deliveredAt timestamp recorded
5. Settlement workflow moves orders to COMPLETED after payment confirmation

## Key Abstractions

### Prisma Models (`prisma/schema.prisma`)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Authenticated staff with roles | email, password (bcrypt), role (ADMIN/ACCOUNTANT/STAFF), name |
| `Customer` | Wholesale buyers | code (KH001), name, address, phone |
| `Product` | Ice types (Bi 5/10/20kg, Vien 5/10/20kg) | name, sizeKg, unit |
| `GlobalPrice` | Base price for all customers | productId (unique), pricePerUnit |
| `CustomerPriceOverride` | Per-customer negotiated prices | customerId, productId, pricePerUnit |
| `Driver` | Delivery personnel | name, phone, token (UUID), slug |
| `Order` | Customer orders with workflow | customerId, status, total, driverId, assignerId |
| `OrderItem` | Line items (product + qty + price) | orderId, productId, quantity, unitPrice, lineTotal |

### Zustand Store (`src/stores/order-store.ts`)

`useOrderStore` manages the order entry hot path:
- `isOpen`, `customer`, `lineItems: Map<productId, LineItemData>`
- `openDrawer()`, `closeDrawer()`, `setCustomer()`, `setLineItem()`
- `clearOrder()`, `addToRecent()` with localStorage persistence

### Server Actions (`src/lib/actions/orders.ts`)

- `loadCustomerPrices(customerId)` — merges global prices with customer overrides
- `saveOrder(input)` — Zod-validated order creation with transaction

### Pricing Library (`src/lib/pricing.ts`)

- `getCustomerPriceList(customerId)` — returns Map of all product prices
- `getPriceForCustomer(productId, customerId)` — single product price lookup
- `setGlobalPrice()`, `setCustomerPriceOverride()`, `removeCustomerPriceOverride()`

### Auth Module (`src/lib/auth.ts`)

- `signJWT(payload)` / `verifyJWT(token)` — JWT with 7-day expiration
- `getSession()` — reads auth_token cookie, returns JWTPayload
- `setSessionCookie()` / `clearSessionCookie()` — httpOnly, secure in production

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/            # Auth layout group: login, register
│   ├── api/               # API route handlers
│   │   ├── auth/          # Login, logout, register, me
│   │   ├── orders/        # Order CRUD, status, confirm, bulk-assign, map
│   │   ├── customers/     # Customer listing
│   │   ├── products/      # Product listing
│   │   ├── prices/        # Global and customer price overrides
│   │   ├── driver/        # Driver order fetching
│   │   └── staff/         # Staff management
│   ├── dashboard/         # Main dashboard page
│   ├── orders/            # Order list and detail pages
│   ├── customers/         # Customer management
│   ├── inventory/         # Inventory view
│   ├── settle/            # Debt settlement
│   ├── vehicles/          # Vehicle/driver management
│   ├── driver/            # Driver delivery view
│   ├── d/[token]/         # Token-based driver URL (e.g., /d/D-01)
│   ├── config/prices/     # Price configuration
│   └── settings/          # Admin settings
├── components/            # React components
│   ├── dashboard/         # Dashboard widgets (stat-card, hourly-chart, etc.)
│   ├── driver/            # Driver view (DeliveryCard, DriverMap, MapInner)
│   ├── order/             # Order entry (order-entry-drawer, print-slip)
│   ├── pricing/           # Price tables and forms
│   ├── ui/                # Shared UI (Drawer component)
│   └── landing/           # Landing page components
├── lib/                   # Server-side utilities
│   ├── auth.ts            # JWT sign/verify, session management
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