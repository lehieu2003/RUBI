# Multi-tenant Architecture Pitfalls - IceFlow SaaS

**Research Date:** 2026-04-17
**Context:** Adding multi-tenant factory architecture to IceFlow SaaS (Phases 7+)
**Confidence:** HIGH (based on schema analysis + known SaaS failure patterns)
**Downstream:** gsd-planner - warning signs, prevention strategies, phase assignments

---

## Overview

IceFlow currently operates as a **single-tenant system** - all data for all factories flows through the same database tables with no tenant isolation. Phase 6 introduced `Subscription.factoryId` as a tenant identifier, but enforcement is incomplete. Adding proper multi-tenancy means retrofitting isolation across all layers: database, API, middleware, and RLS.

This document covers **common pitfalls when retrofitting multi-tenancy onto a system that wasn't designed for it from day one**.

---

## Pitfall Categories

| Category | Severity | Phase |
|----------|----------|-------|
| Data isolation failures | CRITICAL | Phase 1 (Data Layer) |
| RLS policy misconfiguration | CRITICAL | Phase 1 (Data Layer) |
| factory_id not enforced in queries | CRITICAL | Phase 1 (API Layer) |
| Super Admin elevated privilege bypass | HIGH | Phase 1 (Auth Layer) |
| Subscription expiry not enforced | HIGH | Phase 2 (Subscription) |
| Onboarding flow edge cases | MEDIUM | Phase 2 (Onboarding) |

---

## PITFALL 1: Cross-Tenant Data Leakage via Prisma Queries

**What goes wrong:** A factory's orders, customers, drivers, or debt data is visible to another factory because query filters don't include `factoryId`.

**Why it happens:** IceFlow's current schema has `factoryId` on `Subscription` and `User`, but **no tenant identifier on core business objects** (`Order`, `Customer`, `Driver`, `Product`, `Inventory`). The schema uses foreign key relationships through the User/Admin, not a direct `factoryId` column on business entities.

**Current state in IceFlow:**

```prisma
model Order {
  id          String      @id @default(cuid())
  customerId  String      // No factoryId - tenant resolved via Customer -> Admin
  status      OrderStatus @default(PENDING)
  // ... tenant isolation via customer.customerId chain
}

model Customer {
  id       String @id @default(cuid())
  code     String @unique
  // No factoryId - belongs to factory via admin user relationship
}
```

**The problem:** Querying `prisma.order.findMany()` with no `factoryId` filter returns **all orders across all factories**. The current code relies on `customerId` filtering, but:

1. If a customer ID is guessable or enumerable, cross-tenant data is accessible
2. New entities created without customer relationship (e.g., direct Order create without customerId) have no tenant boundary
3. Future entities without customer FK (e.g., standalone `Inventory` records) have no tenant chain at all

**Warning signs to detect in code review:**
- `prisma.[entity].findMany({ where: {} })` with empty `where` clause
- `prisma.[entity].findUnique({ where: { id: id } })` without factoryId in where clause
- Any query that filters only by `id` or `status` without a tenant-scoped FK

**Prevention strategy:**

1. **Add `factoryId` to all business entities** (Order, Customer, Driver, Product, Inventory, etc.) even if it requires backfilling
2. **Create a tenant-scoped query helper:**

```typescript
// src/lib/tenant.ts
export function tenantWhere<T extends { factoryId?: string }>(
  model: T,
  factoryId: string
) {
  // Prisma doesn't support dynamic model references, so use raw where builder
  return { factoryId };
}

// Usage in API routes:
const orders = await prisma.order.findMany({
  where: { factoryId: session.factoryId }, // Always include
});
```

3. **Add ESLint rule or codemod** to detect unfiltered Prisma queries in API routes

**Phase assignment:** Phase 1 (Data Layer) - this is foundational and must be done before any multi-tenant feature work.

---

## PITFALL 2: RLS Policy Misconfiguration

**What goes wrong:** Supabase Row Level Security policies are too permissive or have incorrect `factoryId` references, allowing Factory A to read Factory B's data.

**Why it happens:** RLS policies are often written once and never tested against cross-tenant access attempts. Common mistakes:

1. **Using `auth.uid()` instead of `factoryId` context** - Supabase Auth user ID != factoryId in IceFlow's model
2. **Policy applies to SELECT but not UPDATE/INSERT** - read-only leak is still a leak
3. **`is_owner` or `belongs_to` checks using wrong column** - e.g., checking `customerId` instead of `factoryId` on orders
4. **Bypass via direct SQL** - RLS doesn't apply to server-side operations using service role key

**Current state:** IceFlow uses Prisma directly (not Supabase client), so RLS is **not currently enforced at the database level**. The `/api/*` routes rely entirely on session checks in middleware. This is a gap.

**Warning signs in existing code:**
- `prisma.$transaction` with no tenant context passed
- Service role key used in production (bypasses RLS)
- No RLS policies defined in Supabase dashboard for any table

**Prevention strategy:**

1. **Define RLS policies BEFORE enabling them** - never enable RLS on a table without first writing and testing policies
2. **Use `factoryId` consistently** - every policy references the same tenant column, never user ID
3. **Test cross-tenant access** - write integration test that attempts to read Factory B's orders using Factory A's session token
4. **Use Prisma middleware for tenant enforcement** as fallback:

```typescript
// src/lib/tenant-middleware.ts
prisma.$use(async (params, next) => {
  if (params.model && ['Order', 'Customer', 'Driver'].includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      // Inject factoryId filter - fail if not present in where clause
    }
  }
  return next(params);
});
```

5. **Never use service role key in API handlers** - it bypasses all RLS

**Phase assignment:** Phase 1 (Data Layer) - alongside schema changes.

---

## PITFALL 3: factoryId Not Enforced in All Queries

**What goes wrong:** Some API routes filter by `factoryId` but others don't, creating inconsistent tenant isolation. New routes added without tenant filter become attack vectors.

**Why it happens:** Phase 6 subscription enforcement was added to middleware but **not to all write operations**. The middleware check only runs on `PATCH/POST/DELETE` to `/api/` routes and uses an internal fetch for subscription status (edge runtime constraint). WRITE operations that bypass middleware (Server Actions in future, direct Prisma calls, cron jobs) have no tenant enforcement.

**Current middleware enforcement (partial coverage):**

```typescript
// src/middleware.ts - only blocks write operations on /api/* routes
if (request.method !== 'GET' && pathname.startsWith('/api/')) {
  const factoryId = (session as { factoryId?: string }).factoryId;
  if (factoryId) {
    const subRes = await fetch(new URL('/api/billing/subscription', request.url), ...);
    // blocks if subscription inactive
  }
}
```

**Gaps in current implementation:**

| Gap | File | Impact |
|-----|------|--------|
| `GET /api/drivers` | `src/app/api/drivers/route.ts` | No `factoryId` filter - returns ALL active drivers across all factories |
| `GET /api/customers` | `src/app/api/customers/route.ts` | No `factoryId` filter - returns ALL customers |
| `GET /api/orders` | `src/app/api/orders/route.ts` | No `factoryId` filter - returns ALL orders |
| `POST /api/drivers` | `src/app/api/drivers/route.ts` | Creates driver without `factoryId` - no tenant association |
| `POST /api/customers` | `src/app/api/customers/route.ts` | Creates customer without `factoryId` |

**Confirmed missing factoryId enforcement (code review):**

```typescript
// src/app/api/drivers/route.ts:23-31 - NO factoryId filter
const drivers = await prisma.driver.findMany({
  where: { isActive: true }, // <- Missing factoryId
  select: { id: true, name: true, phone: true },
});

// src/app/api/orders/route.ts:40 - NO factoryId on findMany
const orders = await prisma.order.findMany({
  where, // <- where has customerId/status/date but no factoryId chain
  include: { customer: true, orderItems: { include: { product: true } } },
});
```

**Prevention strategy:**

1. **Codify factoryId as required in all Prisma queries** - add `factoryId: string` parameter to every data access function
2. **Create Prisma extension or middleware** that errors if a query on tenant-scoped models doesn't include factoryId:

```typescript
// src/lib/require-tenant.ts
export function requireTenant<T extends { factoryId?: string }>(
  factoryId: string | undefined
): { factoryId: string } {
  if (!factoryId) throw new Error('MISSING_TENANT_CONTEXT: factoryId required');
  return { factoryId };
}

// Usage:
const factoryId = session.factoryId;
prisma.order.findMany({ where: { ...requireTenant(factoryId), customerId } });
```

3. **Add integration test suite** for cross-tenant isolation:
   - Login as Factory A -> query should only return Factory A data
   - Login as Factory B -> query should only return Factory B data
   - Direct DB query with Factory A's driver token -> should be rejected

4. **Document tenant model** - every new route must include factoryId filter; this is a code review gate

**Phase assignment:** Phase 1 (Data Layer) - foundational, must be done before Phase 2.

---

## PITFALL 4: Super Admin Elevated Privilege Bypass

**What goes wrong:** A user with SUPER_ADMIN or internal system role can access any factory's data, bypassing `factoryId` checks.

**Why it happens:** Super Admin roles are often implemented as a bypass flag in JWT or session:

```typescript
// Example of dangerous pattern:
if (session.role === 'SUPER_ADMIN') {
  // Bypass all tenant checks - no factoryId filter applied
  return await prisma.order.findMany();
}
```

In IceFlow, the current roles are `ADMIN | ACCOUNTANT | STAFF` - no super admin exists yet. But when adding multi-tenancy, the temptation is to add a system-level role for:
- Cross-factory reporting
- Platform-level debugging
- Migration scripts
- Support / demo access

**Warning signs:**
- `role === 'SUPER_ADMIN'` or `role === 'SYSTEM'` checks in API handlers
- Direct database access from admin panels without factoryId
- Service account tokens with no factoryId in JWT payload
- Env variable used to bypass auth in API routes (e.g., `if (process.env.BYPASS_AUTH)`)

**Prevention strategy:**

1. **Never add SUPER_ADMIN role that bypasses tenant checks** - if a cross-factory role is needed, it should use explicit `factoryId` parameter selection (e.g., "view factory X data" not "view all factories")
2. **Separate system operations from tenant operations:**
   - System operations (migrations, cross-factory reports) run as separate processes with explicit factoryId list, not as API routes with session
   - Support access uses `_impersonateFactory(factoryId)` that creates a time-limited session scoped to one factory
3. **Audit all bypass points quarterly** - search codebase for `role.*ADMIN` and `BYPASS` patterns

**Phase assignment:** Phase 1 (Auth Layer) - establish policy before any cross-factory feature is added.

---

## PITFALL 5: Subscription Expiry Not Enforced on Write Operations

**What goes wrong:** Expired/cancelled subscriptions still allow write operations because the middleware check only runs on routes that pass through `middleware.ts`.

**Why it happens:** Next.js middleware doesn't catch:
1. **Server Actions** (if added in future) - these execute on the server without going through Edge middleware
2. **Background jobs / cron** - direct Prisma calls with no HTTP request context
3. **Direct DB access from migration scripts** - bypasses all application-layer checks
4. **Third-party webhooks** calling internal APIs with service tokens

**Current enforcement gap:**

The Phase 6 implementation uses `fetch` from Edge middleware to an internal API route to check subscription (Prisma Client doesn't work in Edge runtime). This means:
- Only works for HTTP requests that pass through Edge middleware
- Internal API calls from Server Actions bypass this
- Background jobs have no session context to check

**Known incomplete enforcement in current code:**

```typescript
// src/app/api/orders/[id]/reconcile/route.ts - No subscription check
// Only role check (ACCOUNTANT or ADMIN), no subscription status check
if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
// Missing: isSubscriptionActive() check before reconciliation writes
```

**Prevention strategy:**

1. **Defense in depth: two-layer enforcement**

Layer 1 - Edge Middleware (blocks HTTP requests):
```typescript
// src/middleware.ts - existing, catches HTTP writes
if (request.method !== 'GET' && pathname.startsWith('/api/')) {
  const subRes = await fetch(new URL('/api/billing/subscription', ...));
  // blocks inactive subscription
}
```

Layer 2 - Per-route subscription guard (called inside each write handler):
```typescript
// src/lib/subscription-guard.ts
export async function requireWritableSubscription(session: JWTPayload) {
  const factoryId = session.factoryId || session.userId;
  const sub = await getFactorySubscription(factoryId);
  if (!isSubscriptionActive(sub)) {
    throw new Error('SUBSCRIPTION_INACTIVE');
  }
}

// Usage in every write route:
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  await requireWritableSubscription(session); // <- Throws if inactive
  // ... rest of handler
}
```

2. **Prisma middleware for subscription enforcement** - blocks all writes at ORM level:
```typescript
prisma.$use(async (params, next) => {
  const writeActions = ['create', 'update', 'upsert', 'delete'];
  if (writeActions.includes(params.action) && params.model) {
    const session = getSessionFromContext(); // How to get session in middleware?
    // Throw if subscription inactive
  }
  return next(params);
});
```

3. **Separate subscription check from auth** - the subscription guard should be independent of role checks, applied to every write operation

**Phase assignment:** Phase 2 (Subscription) - extends Phase 6 enforcement to cover all write paths.

---

## PITFALL 6: Onboarding Flow Edge Cases

**What goes wrong:** New factories with trial subscriptions encounter broken flows when importing data during onboarding, causing data inconsistency or trial expiry before setup completes.

**Why it happens:** Onboarding import runs as part of the trial period. If the import fails partially, the factory may have:
- Some customers imported, some failed (inconsistent state)
- Price list items created without proper product associations
- Trial expires mid-onboarding, blocking completion
- No rollback mechanism if CSV import fails at row 200 of 500

**Edge cases to handle:**

| Edge Case | Risk | Mitigation |
|-----------|------|------------|
| CSV import partial failure (row 200 of 500) | Factory has 300 customers but missing 200 | Transaction-wrapped import: all or nothing, or checkpoint restart |
| Duplicate customer codes in CSV | Block entire import or skip duplicates? | Detect and report duplicates before import, require user to resolve |
| Product not found during price list import | Orphan price override with no product | Validate all product IDs exist before importing prices |
| Trial expires during import | Write operations blocked mid-import | Pre-extend trial by 3 days when onboarding wizard starts |
| Large CSV (5000+ customers) | Timeout or memory issue | Stream-parse CSV, chunk inserts (500 rows per transaction) |
| Import re-run for same factory | Duplicate customers with different IDs | Check for existing code/name match, offer to update vs skip |

**Current Phase 6 implementation (D-16):** Customer/price list import via CSV or manual entry. The research mentions `papaparse` for CSV parsing but doesn't detail transaction handling.

**Prevention strategy:**

1. **Onboarding progress stored in Subscription model** - add `onboardingCompleted: boolean` flag so partially-completed onboarding can resume
2. **Trial extension trigger** - when admin enters onboarding wizard, auto-extend trial by 3 days (via `Subscription.update`)
3. **Chunked import with checkpointing:**
```typescript
// src/lib/csv-import.ts
export async function importCustomersChunked(
  factoryId: string,
  rows: CustomerRow[],
  chunkSize = 500
) {
  let processed = 0;
  const errors: ImportError[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    try {
      await prisma.$transaction(
        chunk.map(row => prisma.customer.create({ data: { ...row, factoryId } }))
      );
      processed += chunk.length;
    } catch (e) {
      errors.push({ row: i, error: e.message, data: chunk[i] });
    }
  }
  return { processed, errors, total: rows.length };
}
```
4. **Validation before import:**
   - Check all product IDs exist (return all bad IDs in one response)
   - Check for duplicate codes (list all duplicates before starting)
   - Check factoryId is set on all records before commit

**Phase assignment:** Phase 2 (Onboarding) - extends Phase 6 import work.

---

## Integration Pitfall: RLS + Prisma Combination

**What goes wrong:** RLS policies are defined in Supabase but Prisma bypasses them by using the service role connection string.

**Why it happens:** When using Prisma with Supabase, there are two connection modes:

1. **Client-level connection** (`postgresql://[user]:[pass]@host/db`) - respects RLS policies
2. **Service role / direct connection** (`postgresql://postgres:[pass]@host/db`) - bypasses RLS

If `DIRECT_URL` in `schema.prisma` uses the service role or admin credentials:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DIRECT_URL") // <- If this is service role, RLS is bypassed
}
```

**Current IceFlow state:**
- `prisma/schema.prisma` uses `DIRECT_URL`
- `.env.example` not reviewed - unknown if this is service role or user-level
- All API routes use `prisma` from `src/lib/db.ts` - no Supabase client

**Checklist for Phase 1:**
- [ ] Verify `DIRECT_URL` is a user-level credential, not service role
- [ ] If using Supabase, verify RLS policies exist on all tenant-scoped tables
- [ ] Add test: query DB with service role vs user role - ensure different results
- [ ] Never commit service role credentials to `.env`

---

## Phase Assignment Summary

| Pitfall | Phase | Priority | Deliverable |
|---------|-------|----------|-------------|
| PITFALL 1: Cross-tenant data leakage | Phase 1 (Data Layer) | CRITICAL | All entities have `factoryId`, tenant query helper created |
| PITFALL 2: RLS misconfiguration | Phase 1 (Data Layer) | CRITICAL | RLS policies defined and tested, Prisma tenant middleware |
| PITFALL 3: factoryId not enforced | Phase 1 (API Layer) | CRITICAL | All API routes filter by factoryId, integration tests added |
| PITFALL 4: Super Admin bypass | Phase 1 (Auth Layer) | HIGH | No bypass role pattern in codebase, policy documented |
| PITFALL 5: Subscription not enforced | Phase 2 (Subscription) | HIGH | Per-route subscription guard, Prisma write-block middleware |
| PITFALL 6: Onboarding edge cases | Phase 2 (Onboarding) | MEDIUM | Chunked CSV import, trial extension on onboarding start, checkpoint resume |
| Integration: RLS + Prisma | Phase 1 (Data Layer) | CRITICAL | DIRECT_URL verified as user-level, RLS policies exist |

---

## Verification Checklist for Multi-Tenant Phase

When the multi-tenant phase is complete, verify:

- [ ] `prisma.order.findMany()` always includes `factoryId` filter - search all API routes
- [ ] `prisma.driver.findMany()` always includes `factoryId` filter
- [ ] `prisma.customer.findMany()` always includes `factoryId` filter
- [ ] No raw SQL queries that could bypass factoryId filter
- [ ] RLS policies exist and are tested against cross-factory access
- [ ] Subscription check runs on ALL write operations (not just middleware-covered routes)
- [ ] Super Admin / bypass role patterns do not exist in codebase
- [ ] CSV import handles partial failures gracefully with checkpoint resume
- [ ] Trial extension triggers when admin starts onboarding wizard

---

## Sources

| Source | Verification |
|--------|--------------|
| `prisma/schema.prisma` | Verified - no `factoryId` on `Order`, `Customer`, `Driver`, `Product`, `Inventory` |
| `src/middleware.ts` | Verified - partial subscription enforcement only on write methods |
| `src/app/api/drivers/route.ts` | Verified - no `factoryId` filter on `GET /api/drivers` |
| `src/app/api/orders/route.ts` | Verified - no `factoryId` filter on `GET /api/orders` |
| `src/app/api/customers/route.ts` | Verified - no `factoryId` filter on `GET /api/customers` |
| `src/app/api/orders/[id]/reconcile/route.ts` | Verified - no subscription check before write |
| Phase 6 research (06-RESEARCH.md) | Verified - subscription enforcement described but implementation gaps remain |

---

*Research for multi-tenant architecture integration*
*Valid until: 2026-05-17 (30 days)*