# Architecture: Security Hardening + SaaS Readiness

**Domain:** Multi-tenant ice factory SaaS — v3.0 hardening milestone
**Researched:** 2026-04-22
**Confidence:** MEDIUM-HIGH

## Executive Summary

The existing architecture uses AsyncLocalStorage + Prisma `$extends` to auto-inject `factoryId` filters. This works silently — queries succeed even when `factoryId` is null, which is the root cause of tenant data leaks. For v3.0 hardening, the recommended approach is:

1. **Fail-closed explicit queries**: Add shared auth helpers that enforce `factoryId` presence, use explicit `where: { factoryId }` on all tenant-scoped operations, and let `$extends` be a safety net (not the primary filter).
2. **Auth helpers in `src/lib/auth-helpers.ts`**: `requireSession()`, `requireFactoryId()`, `requireRole()`, `requireActiveSubscription()` as thin wrappers returning typed payloads (not throwing for legitimate 401/403 cases).
3. **Onboarding state on `Factory` model**: Add `onboardingCompleted: boolean` and `setupStep: string?` fields — more appropriate than a separate table for this single-per-factory, non-temporal state.

---

## 1. Explicit factoryId-Filtered Queries + AsyncLocalStorage + $extends

### Current State

`src/lib/db.ts` exports a `$extends`-augmented Prisma client. The extension intercepts `findMany`/`findFirst`/`findUnique` and injects `factoryId` filter if `ctx.role !== 'SUPER_ADMIN'`. This is invisible to callers — `prisma.customer.findMany()` automatically gets `factoryId` filter.

**Problem**: When `ctx.factoryId` is `null` (no session, expired token), `$extends` still runs but injects no filter. A `findMany` with `where: {}` returns all customers across all factories — tenant data leak.

### Integration Strategy: Two-Layer Defense

| Layer | Purpose | Behavior |
|-------|---------|----------|
| **Auth helpers (primary)** | Enforce session + factoryId presence before any operation | Callers MUST invoke `requireSession()` etc. — these return the session payload or throw 401/403 |
| **Prisma $extends (safety net)** | Catch accidental queries missing explicit filter | SUPER_ADMIN bypasses; regular users get factoryId injection |
| **Explicit `where: { factoryId }` (defense-in-depth)** | Make factory scoping visible in query code | All `prisma.X.findMany({ where: { factoryId } })` calls are self-documenting |

### How They Work Together

```typescript
// src/app/api/customers/route.ts — AFTER (hardened)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession, requireFactoryId, requireRole } from '@/lib/auth-helpers';

// POST — create customer
export async function POST(request: NextRequest) {
  // Layer 1: Auth helpers enforce session + role + factoryId presence
  const session = await requireSession();        // throws 401 if no session
  requireRole(session, ['ADMIN']);                // throws 403 if wrong role
  const factoryId = await requireFactoryId(session); // throws 400 if no factoryId

  const body = await request.json();
  const { code, name, address, phone, isActive = true } = body;

  if (!code || !name) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
  }

  // Layer 2: Explicit factoryId in query (self-documenting, defense-in-depth)
  // $extends will inject factoryId again, but explicit is the primary contract
  const customer = await prisma.customer.create({
    data: { code, name, address: address || '', phone: phone || '', isActive, factoryId },
  });

  return NextResponse.json(customer, { status: 201 });
}
```

```typescript
// src/lib/auth-helpers.ts — NEW FILE (hardening milestone)
import { NextResponse } from 'next/server';
import { getSession } from './auth';
import type { JWTPayload } from './auth';
import { isSubscriptionActive, isGracePeriodExpired } from './subscription-status';
import { prisma } from './db';

export type AuthorizedPayload = JWTPayload & { factoryId: string };

/**
 * requireSession — enforces authenticated user.
 * Throws 401 JSON response if unauthenticated.
 * Returns the session payload on success.
 */
export async function requireSession(): Promise<AuthorizedPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError('Unauthorized', 401);
  }
  return session as AuthorizedPayload;
}

/**
 * requireFactoryId — enforces factoryId presence on session.
 * Call this AFTER requireSession in write-path functions.
 * Throws 400 JSON response if factoryId is missing (indicates programming error).
 */
export async function requireFactoryId(session: JWTPayload): Promise<string> {
  if (!session.factoryId) {
    throw new AuthError('Missing factory context', 400);
  }
  return session.factoryId;
}

/**
 * requireRole — enforces role membership.
 * Throws 403 JSON response if user role is not in allowedRoles.
 */
export function requireRole(session: JWTPayload, allowedRoles: string[]): void {
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new AuthError('Forbidden', 403);
  }
}

/**
 * AuthError — carries HTTP response data for route-level catch.
 * Using NextResponse here would tie helpers to Next.js, so we throw and catch in routes.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * requireActiveSubscription — checks subscription status for write operations.
 * Call in POST/PUT/PATCH/DELETE handlers after auth checks.
 * Throws 403 JSON response if subscription is cancelled/expired beyond grace.
 */
export async function requireActiveSubscription(factoryId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { factoryId },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    throw new AuthError('No subscription found', 403, 'NO_SUBSCRIPTION');
  }
  if (!isSubscriptionActive(subscription)) {
    throw new AuthError('Subscription inactive. System is read-only.', 403, 'SUBSCRIPTION_INACTIVE');
  }
  if (subscription.status === 'CANCELLED' && isGracePeriodExpired(subscription)) {
    throw new AuthError('Subscription cancelled and grace period expired.', 403, 'ACCOUNT_LOCKED');
  }
}
```

### Catching Auth Errors in Route Handlers

Route handlers wrap auth helper calls in try/catch:

```typescript
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    requireRole(session, ['ADMIN']);
    const factoryId = await requireFactoryId(session);
    // ... business logic
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('[POST /api/customers]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### SUPER_ADMIN Bypass Behavior

SUPER_ADMIN routes like `/api/admin/*` intentionally bypass the `$extends` factoryId filter and should use `basePrisma` (unscoped client). The new `basePrisma` is already used in `src/app/api/admin/factories/route.ts`:

```typescript
// src/lib/db.ts already exports basePrisma for internal operations
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({...});
const extendedPrisma = basePrisma.$extends({...});
// extendedPrisma used for normal app operations
// basePrisma available for SUPER_ADMIN/internal work
```

For SUPER_ADMIN routes that need cross-factory visibility, create a `prismaAsAdmin()` helper:

```typescript
// In src/lib/db.ts or a new src/lib/db-admin.ts
export const basePrisma = globalForPrisma.prisma ?? new PrismaClient({...});
```

---

## 2. Onboarding State: Factory Model Field vs Separate Table

### Decision: Factory Model Field

Add `onboardingCompleted: boolean` and `setupStep: string?` to the `Factory` model.

**Rationale:**

- Onboarding is a **single-per-tenant, non-temporal state** — one factory, one onboarding status. A separate table introduces unnecessary join complexity.
- The `Factory` model already has `isSystem`, `createdAt`, `updatedAt` — adding two more fields is consistent.
- Subscription already links to Factory, and onboarding state logically belongs to the factory entity (the tenant).
- The onboarding wizard updates state via `Factory.update` — no new model needed.

### Schema Changes

```prisma
// prisma/schema.prisma — Factory model additions
model Factory {
  id                   String   @id @default(cuid())
  name                 String
  phone                String?
  address              String?
  isSystem             Boolean  @default(false) @map("is_system")
  onboardingCompleted  Boolean  @default(false) @map("onboarding_completed")
  setupStep            String?  @map("setup_step")  // e.g., 'uploaded-customers', 'added-products'
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  // ... existing relations
}
```

### Setup Step Values

| Value | Meaning | Triggers |
|-------|---------|----------|
| `null` | Not started | Fresh registration |
| `'customers-imported'` | Customer CSV imported | `/onboarding` step 4 success |
| `'products-added'` | At least one product exists | Product creation |
| `'completed'` | All critical setup done | Dashboard banner dismissed |

### Onboarding Flow with State

1. Registration creates Factory with `onboardingCompleted: false`, `setupStep: null`.
2. `POST /api/auth/register` returns `nextUrl: '/onboarding'` (see update.md requirement).
3. Admin completes `/onboarding` wizard (customer CSV import).
4. On import success, server action updates Factory: `onboardingCompleted: true` OR `setupStep: 'customers-imported'`.
5. Dashboard reads `onboardingCompleted` from Factory to show/dismiss the "setup prompt" banner.
6. When `session.role === 'ADMIN' && factory.onboardingCompleted === false`, show onboarding nudge.

### Alternative: Separate OnboardingState Table

Consider only if:
- Onboarding has **multiple sessions** (not the case — one ADMIN per factory).
- Onboarding state is **temporal/auditable** (not the case — just a flag).
- Onboarding involves **multiple steps tracked independently** (possible future: import history).

For v3.0, separate table is over-engineered.

---

## 3. Integration Points: New vs Modified

### New Files

| File | Purpose |
|------|---------|
| `src/lib/auth-helpers.ts` | `requireSession`, `requireFactoryId`, `requireRole`, `requireActiveSubscription`, `AuthError` |
| `src/lib/db-admin.ts` (or export `basePrisma`) | SUPER_ADMIN-only Prisma client without $extends tenant filter |
| Database migration | Add `onboardingCompleted`/`setupStep` to Factory model |

### Modified Files

| File | Change | Priority |
|------|--------|----------|
| `src/lib/auth.ts` | No changes | — |
| `src/lib/tenant.ts` | No changes (works as-is) | — |
| `src/lib/db.ts` | Export `basePrisma` for SUPER_ADMIN use | P0 |
| `src/lib/subscription-status.ts` | Already correct | — |
| `src/app/api/auth/register/route.ts` | Add `nextUrl` to response, use Zod, normalize email | P1 |
| `src/app/api/customers/route.ts` | Apply auth helpers, explicit factoryId | P1 |
| `src/app/api/orders/route.ts` | Apply auth helpers, explicit factoryId | P1 |
| `src/app/api/prices/global/route.ts` | Add auth/role checks | P1 |
| `src/app/api/prices/customer/override/route.ts` | Add auth/role checks | P1 |
| `src/app/api/orders/bulk-assign/route.ts` | Add auth/role/factory checks | P1 |
| `src/app/api/customers/import/route.ts` | Update onboarding state on success | P2 |
| `src/app/dashboard/page.tsx` | Read `onboardingCompleted` from Factory to show prompt | P2 |
| `src/app/onboarding/page.tsx` | Update Factory state on import success | P2 |
| `src/middleware.ts` | Read `data.subscription` (not top-level `sub`) for subscription response parsing | P1 |
| `prisma/schema.prisma` | Add `onboardingCompleted`/`setupStep` to Factory | P0 |
| `prisma/seed-*.ts` | Add factoryId where missing | P1 |

### Build Order

```
1. prisma/schema.prisma       — Add onboarding fields to Factory (migration)
2. src/lib/db.ts              — Export basePrisma for SUPER_ADMIN
3. src/lib/auth-helpers.ts    — NEW: auth helpers (no deps)
4. src/lib/db-admin.ts        — (optional if basePrisma export is enough)
5. src/middleware.ts         — Fix subscription response parsing
6. API routes (auth helpers)  — Apply to all write endpoints
7. Registration route         — Add nextUrl, Zod, email normalization
8. Onboarding state update    — Factory.update on import success
9. Dashboard prompt           — Use onboardingCompleted flag
10. Seed scripts              — Fix factoryId references
```

### Depency Order for Auth Helpers

`auth-helpers.ts` has these dependencies (forward only):
- `getSession` from `auth.ts` — no DB call, safe
- `prisma` from `db.ts` — uses extended Prisma (safe)
- `subscription-status.ts` — pure functions, safe

Auth helpers are safe to build before DB migration. API routes using auth helpers depend on the helpers existing first.

---

## 4. Component Boundaries

### Auth Helper Scope

```
src/lib/auth-helpers.ts
  getSession() from auth.ts
  prisma from db.ts
  isSubscriptionActive(), isGracePeriodExpired() from subscription-status.ts
  NextResponse (used via AuthError catching in routes)
```

Auth helpers are **server-only** (no client import). Export `AuthorizedPayload` type for use in route handlers.

### SUPER_ADMIN vs Tenant Route Separation

| Route Prefix | Client | Factory Filter |
|--------------|--------|----------------|
| `/api/admin/*` | `basePrisma` (unscoped) | None — SUPER_ADMIN has system-wide access |
| `/api/*` | `prisma` (extended, auto-filtered) | `$extends` auto-injects `factoryId` |

### Onboarding State Flow

```
Registration → Factory created (onboardingCompleted=false, setupStep=null)
     ↓
NextUrl: '/onboarding' in register response
     ↓
/admin or /onboarding wizard → CSV import
     ↓
POST /api/customers/import → updates Factory (setupStep='customers-imported')
     ↓
Dashboard reads Factory → shows/dismisses onboarding prompt
     ↓
Onboarding complete → setupStep='completed' OR onboardingCompleted=true
```

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Developer skips `requireSession()` and relies on silent `$extends` filter | Lint rule or code review checklist; make explicit `factoryId` part of code review |
| Onboarding state left in inconsistent state if import partially fails | Transaction wrapping in import handler; Factory.update only on full success |
| SUPER_ADMIN routes accidentally get `$extends` filter | Use explicit `basePrisma` in `/api/admin/*` routes |
| Middleware subscription check fails (network) causing 503 | Fail-closed for writes; reads can proceed |
| Hardcoded `JWT_SECRET` fallback in production | Fail startup if env var missing; remove fallback |
| Seed scripts still using unscoped Prisma | Audit all seed files, update to create/use a factory |

---

## 6. Out of Scope

- Row-level security (RLS) at PostgreSQL level — application-level scoping is sufficient for ice factory scale
- Multi-subdomain routing — all factory access via same domain, distinguished by auth
- Onboarding history/audit log — not needed for v3.0
- Staff invite flow — separate milestone (factory member registration)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Auth helpers structure | HIGH | Pattern is standard for Next.js API routes; no novel tech |
| $extends + explicit query integration | HIGH | Both can coexist; explicit is primary, $extends is safety net |
| Onboarding state location | MEDIUM | Factory field is logical, but separate table possible if requirements expand |
| Build order | MEDIUM | Actual migration dependency order needs Prisma migration verification |
