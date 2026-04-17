# Stack Research: Multi-tenant Factory Architecture

## Context

IceFlow SaaS currently serves single-factory deployments. The next milestone adds multi-tenancy where each ice factory is an independent tenant. This document specifies the stack additions and changes required.

**Existing stack (validated, do not alter):**
- Next.js 15.1 / React 19 / TypeScript 5
- Prisma 6.0 + PostgreSQL (via Supabase)
- Zustand 5, TanStack Query 5, React Hook Form + Zod 4
- jose 6.2 (JWT signing/verification)
- Middleware-based RBAC (route protection via `src/middleware.ts`)

**Existing Prisma schema already contains:**
- `User.factoryId` — links staff to owning factory (ADMIN = factory owner)
- `Subscription.factoryId` — per-factory subscription tracking
- `Driver`, `Customer`, `Order`, etc. — no factoryId today (global scope)

---

## 1. Supabase Row-Level Security (RLS) vs Schema Separation

### Decision: RLS + Prisma Tenant Middleware (Hybrid Approach)

**Rationale:**
- Schema-per-tenant (PostgreSQL schemas) adds operational complexity unacceptable for solo dev. Database per tenant means `prisma db push` must run per tenant — scales poorly past ~20 tenants.
- RLS alone is insufficient because: (a) IceFlow uses Prisma, not Supabase client directly, and (b) RLS policies must be written in SQL and maintained manually for each new table.
- Hybrid: RLS enforces tenant isolation at the Supabase/PostgreSQL layer for direct connections (future admin dashboard, Supabase connectors). Prisma middleware injects `factoryId` automatically for application-level queries.

### Library Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | `^2.103.0` | Already installed — RLS policies tested via Supabase client |
| `@supabase/ssr` | `^0.10.2` | Already installed — server-side Supabase client |

No new Supabase libraries needed. RLS policies are raw SQL, applied via `psql` or Supabase dashboard, not npm packages.

### RLS Policy Pattern (for Super Admin queries)

For the Super Admin dashboard that must跨 tenant queries:

```sql
-- Enable RLS on tenant-scoped tables
alter table orders enable row level security;
alter table customers enable row level security;
alter table drivers enable row level security;

-- Super admin bypass (role = 'SUPER_ADMIN' stored in app_metadata)
create policy "super_admin_bypass" on orders
  for all to authenticated
  using (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN')
  with check (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN');

-- Tenant isolation: users only see their factory's data
create policy "tenant_isolation_orders" on orders
  for all to authenticated
  using (
    factory_id = (select claims -> 'factory_id' from auth.jwt() limit 1)
  )
  with check (
    factory_id = (select claims -> 'factory_id' from auth.jwt() limit 1)
  );
```

**Index for RLS performance:**
```sql
create index orders_factory_id_idx on orders (factory_id);
create index customers_factory_id_idx on customers (factory_id);
create index drivers_factory_id_idx on drivers (factory_id);
create index users_factory_id_idx on users (factory_id);
```

### Implementation: Add factoryId to Existing Models

Before RLS is meaningful, all tenant-scoped tables need `factoryId`:

```prisma
// prisma/schema.prisma — required changes

model Order {
  factoryId   String @map("factory_id")   // NEW — required for RLS
  // ... existing fields ...
  @@index([factoryId])
}

model Customer {
  factoryId   String @map("factory_id")   // NEW
  // ... existing fields ...
  @@index([factoryId])
}

model Driver {
  factoryId   String @map("factory_id")   // NEW
  // ... existing fields ...
  @@index([factoryId])
}
```

### Why Not Pure Supabase RLS?

IceFlow uses **Prisma Client** (not Supabase JS client) for all application queries. Supabase RLS policies apply to queries made via the Supabase JS client only. Prisma queries bypass RLS unless:
1. Using Supabase Connect (extra infrastructure), OR
2. Using a Supabase proxy that enforces RLS, OR
3. Enforcing tenant isolation at the Prisma layer (chosen approach)

**Super Admin dashboard** (跨 tenant reads) should use **Supabase service role client** with RLS bypass for admin operations, or query Prisma directly in a Node.js context (RLS is edge-only concern).

---

## 2. Prisma Tenant Filtering Middleware

### Decision: Prisma Extension with `use factory` Global Pattern

**Rationale:**
- `beforeRequest` hook on Prisma Client instance injects `factoryId` into all queries.
- Must use Prisma `$extends` API (available in Prisma 5+, installed is 6.0) to avoid breaking Prisma's type safety.
- Edge runtime (middleware) uses different Prisma instance — tenant context must flow differently there.

### Implementation Pattern

```typescript
// src/lib/db-tenant.ts
import { PrismaClient, Prisma } from '@prisma/client';

type TenantPrisma = Omit<PrismaClient, '$use' | '$transaction' | '$connect' | '$disconnect'>;

export function createTenantPrisma(factoryId: string, base: PrismaClient): TenantPrisma {
  return base.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          // Inject factoryId filter where applicable
          if (tenantScoped(args.model)) {
            args.where = { ...args.where, factoryId };
          }
          return query(args);
        },
        async findFirst({ args, query }) {
          if (tenantScoped(args.model)) {
            args.where = { ...args.where, factoryId };
          }
          return query(args);
        },
        async create({ args, query }) {
          if (tenantScoped(args.model)) {
            (args.data as Record<string, unknown>).factoryId = factoryId;
          }
          return query(args);
        },
        async updateMany({ args, query }) {
          if (tenantScoped(args.model)) {
            args.where = { ...args.where, factoryId };
          }
          return query(args);
        },
      },
    },
  });
}

const TENANT_SCOPED_MODELS = ['Order', 'Customer', 'Driver', 'Inventory',
  'CustomerDebtLedger', 'CustomerShellDeposit', 'CustomerPriceOverride', 'User'];

function tenantScoped(model?: string): boolean {
  return model ? TENANT_SCOPED_MODELS.includes(model) : false;
}
```

### Usage in Route Handlers

```typescript
// src/app/api/orders/route.ts — modified
import { createTenantPrisma } from '@/lib/db-tenant';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const factoryId = session.factoryId || session.userId;
  const db = createTenantPrisma(factoryId, prisma);

  // All queries automatically scoped to factoryId
  const orders = await db.order.findMany({ where: { status: 'PENDING' }, ... });
}
```

### Alternative: Request-Level Thread Variable

For cleaner API without passing `db` instance:

```typescript
// src/lib/db-context.ts
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  factoryId: string;
}

export const tenantStore = new AsyncLocalStorage<TenantContext>();

// In route handlers:
export async function GET(request: NextRequest) {
  const session = await getSession();
  const factoryId = session.factoryId || session.userId;

  return tenantStore.run({ factoryId }, async () => {
    // All Prisma calls within this belt use tenant-scoped client
    const orders = await prisma.order.findMany({ where: { status: 'PENDING' } });
    // factoryId injected by middleware
  });
}
```

### Library Requirements

| Library | Version | Purpose |
|---------|---------|---------|
| `async_hooks` | Built-in Node.js | `AsyncLocalStorage` for tenant context propagation |

No new npm packages — `async_hooks` is a built-in Node.js module.

---

## 3. Next.js Middleware for Factory Context

### Decision: Extend Existing Middleware (Minimal Changes)

Existing `src/middleware.ts` already extracts `factoryId` from JWT and checks subscription status. Add factory context injection via response headers.

**Changes to `src/middleware.ts`:**

```typescript
// Add to existing middleware — inject factoryId via headers
export async function middleware(request: NextRequest) {
  // ... existing auth + subscription checks ...

  if (session) {
    const factoryId = (session as { factoryId?: string }).factoryId;
    if (factoryId) {
      // Inject factory context for downstream use
      const response = NextResponse.next();
      response.headers.set('x-factory-id', factoryId);
      return response;
    }
  }

  return NextResponse.next();
}
```

### Server Components: Read FactoryId from Headers

```typescript
// src/lib/server-context.ts
import { headers } from 'next/headers';

export async function getFactoryId(): Promise<string | null> {
  const h = await headers();
  return h.get('x-factory-id');
}

// In Server Components / Server Actions:
async function getOrders() {
  const factoryId = await getFactoryId();
  if (!factoryId) throw new Error('No factory context');
  return prisma.order.findMany({ where: { factoryId } });
}
```

### Server Actions: Propagate via Module-Level Variable

Server Actions run in the same Node.js process as the route handler. Use a request-scoped context:

```typescript
// src/lib/server-context.ts
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  factoryId: string;
  userId: string;
  role: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
```

Then in route handler (not middleware, which is edge):
```typescript
// In a route handler that calls a Server Action:
requestContext.run({ factoryId, userId, role }, async () => {
  // Server Actions invoked here inherit the context
});
```

### Note: Edge vs Node.js Runtime

Middleware runs on **Edge Runtime** — `AsyncLocalStorage` is not available there. Factory context injection via response headers is the correct pattern for Edge. The headers-based approach is already aligned with the existing middleware architecture.

---

## 4. Subscription Tracking

### Decision: Extend Existing Subscription Model

Existing `Subscription` model in Prisma schema already captures:
- `factoryId`, `planType`, `status`, `startDate`, `endDate`, `driverCount`, `pricePerDriver`

**Changes needed:**

1. **Add trial expiration tracking** (schema change):
```prisma
model Subscription {
  // ... existing fields ...
  trialEndedAt      DateTime? @map("trial_ended_at")  // NEW — when trial actually ended
  cancelledAt       DateTime? @map("cancelled_at")    // NEW — when cancelled
  gracePeriodDays   Int       @default(3) @map("grace_period_days") // NEW
}
```

2. **Subscription status helper** (already exists in `src/lib/subscription-status.ts`):
- `isSubscriptionActive()` — covers TRIAL (check endDate), ACTIVE, CANCELLED + grace period
- `isGracePeriodExpired()` — check if cancelled subscription past grace period

3. **Super Admin subscription management** (new endpoints):
```typescript
// GET /api/admin/subscriptions — list all factory subscriptions
// PATCH /api/admin/subscriptions/[id] — update plan/status
// POST /api/admin/subscriptions — create subscription for factory
```

4. **Webhook endpoint** for payment provider callbacks:
```typescript
// POST /api/webhooks/subscription — handle payment events
```

### Factory Subscription Flow

```
Factory Admin (ADMIN user) → signs up → Trial Subscription created
  → Trial expires → ACCOUNT_LOCKED → Admin upgrades plan → ACTIVE

Super Admin (new role) → /admin/subscriptions → view all factories → manage plans
```

---

## 5. Super Admin Dashboard

### Route Structure

```
src/app/superadmin/
├── layout.tsx          # Super Admin shell (SUPER_ADMIN role only)
├── page.tsx            # Overview: all factories, subscription counts
├── subscriptions/
│   ├── page.tsx        # List all factory subscriptions
│   └── [factoryId]/
│       └── page.tsx    # Per-factory subscription detail
└── factories/
    ├── page.tsx        # List all factories
    └── [id]/
        └── page.tsx    # Factory detail + user management
```

### Super Admin Authentication

New JWT role `SUPER_ADMIN` stored in `app_metadata`:
```typescript
// Super admin JWT payload
interface JWTPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN';  // Not ADMIN — different role
}
```

Supabase Auth custom claims approach:
```json
{
  "uid": "user-uuid",
  "email": "admin@iceflow.io",
  "role": "SUPER_ADMIN",
  "app_metadata": {
    "role": "SUPER_ADMIN"
  }
}
```

### Library Requirements

No new libraries required. All existing infrastructure (JWT, Prisma, Next.js) extends to Super Admin.

---

## 6. Migration: Adding factoryId to Existing Tables

This is the critical path — must be done carefully to avoid downtime.

### Migration Sequence

1. **Add nullable factoryId column** (backwards compatible):
```sql
ALTER TABLE orders ADD COLUMN factory_id text;
ALTER TABLE customers ADD COLUMN factory_id text;
ALTER TABLE drivers ADD COLUMN factory_id text;
ALTER TABLE inventory ADD COLUMN factory_id text;
ALTER TABLE customer_debt_ledger ADD COLUMN factory_id text;
```

2. **Backfill factoryId** for existing records:
```sql
-- Assuming single factory with known admin user
UPDATE orders SET factory_id = (SELECT id FROM users WHERE is_factory_owner = true LIMIT 1);
UPDATE customers SET factory_id = (SELECT id FROM users WHERE is_factory_owner = true LIMIT 1);
-- etc.
```

3. **Add NOT NULL constraint**:
```sql
ALTER TABLE orders ALTER COLUMN factory_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN factory_id SET NOT NULL;
-- etc.
```

4. **Deploy Prisma schema update** with `prisma db push` or migration.

5. **Activate Prisma tenant middleware** — all new queries auto-scoped.

### Prisma Schema Delta

```prisma
model Order {
  factoryId   String   @map("factory_id")
  // ... existing ...
  @@index([factoryId])
}

model Customer {
  factoryId   String   @map("factory_id")
  // ... existing ...
  @@index([factoryId])
}

model Driver {
  factoryId   String   @map("factory_id")
  // ... existing ...
  @@index([factoryId])
}

model Inventory {
  factoryId   String   @map("factory_id")
  // ... existing ...
  @@index([factoryId])
}

model CustomerDebtLedger {
  factoryId   String   @map("factory_id")
  // ... existing ...
  @@index([factoryId])
}
```

---

## 7. Summary: New Dependencies

| Category | Library/Change | Version | Justification |
|----------|---------------|---------|---------------|
| RLS | Raw SQL | — | Supabase/PostgreSQL native — no npm |
| Tenant Prisma | `async_hooks` | Built-in | Request-level tenant context propagation |
| No new npm packages | — | — | All requirements met with existing + built-in |

**Existing packages verified sufficient:**
- `@prisma/client`: `^6.0.0` — supports `$extends` for tenant filtering
- `@supabase/ssr`: `^0.10.2` — for future admin dashboard Supabase queries
- `jose`: `^6.2.2` — JWT handling already in place

---

## 8. Open Questions / Next Steps

1. **How to distinguish SUPER_ADMIN from factory ADMIN in JWT?** — currently both use role `ADMIN`. Need to add separate role enum value or use separate claim.
2. **Payment provider** for subscription billing — Stripe integration not yet researched. Required before PAID plan can work.
3. **Perfactory pricing** — existing `CustomerPriceOverride` model allows per-customer pricing. For future: per-factory global price lists (separate from global prices).
4. **Driver token auth** — existing `Driver.token` uses UUID token for driver web-view. Must be scoped to factory in new architecture.

---

*Generated: 2026-04-17*
*Downstream: gsd-planner — requires library versions, RLS policy patterns, tenant isolation middleware approach*
