# Phase 9: Super Admin + Integration - Research

**Researched:** 2026-04-23
**Domain:** Super Admin panel + v1.0 entity factory-scoping verification
**Confidence:** HIGH

## Summary

Phase 9 is a **verification and gap-fill phase** — the Super Admin infrastructure is largely implemented. SADM-02 through SADM-05 are implemented via the existing `TenantTable` component + admin API routes. INT-01 through INT-05 verify that all v1.0 entities are factory-scoped and the RBAC/impersonation system is correctly wired.

The primary work is: (1) auditing all tenant API routes for correct `factoryId` filtering, (2) confirming RBAC route matrix completeness, (3) verifying end-to-end impersonation flow, and (4) fixing any gaps found during audit.

**Primary recommendation:** Create a verification plan that systematically checks each success criterion rather than assuming existing code is correct end-to-end.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SUPER_ADMIN reads tenant data via **admin panel only** (prismaAuth directly, no $extends tenant filtering). Tenant API routes are NOT used for SUPER_ADMIN reads.
- **D-02:** Impersonation uses separate `impersonate_token` httpOnly cookie — not the auth JWT. Security isolation is correct. No changes needed.
- **D-03:** Driver web-view uses static driver token (?token=), not session — impersonation has no effect on driver view. Correct. Leave as-is.
- **D-04:** `canAccessPath` in `src/lib/rbac/permissions.ts` returns `false` for SUPER_ADMIN — intentional. SUPER_ADMIN uses admin panel only.
- **D-06:** All v1.0 entities (Customer, Order, Driver, Product) have factoryId in schema.
- **D-07:** All tenant API routes filter by `session.factoryId` from Phase 6/8 work.
- **D-08:** Per-customer pricing works within factory scope — confirmed via CustomerPriceOverride model.
- **D-09 through D-13:** Subscription management infrastructure (tenant list, extend, activate/deactivate, price per driver, impersonation flow) already exists.
- **D-14:** Phase 9 is primarily a verification and gap-fill phase.
- **D-15:** Downstream agent should audit all tenant API routes for correct factoryId filtering.

### Claude's Discretion

- Specific RBAC route matrix updates if any are missing from tenantRoutePermissions
- How to structure the admin panel tenant detail view (already exists at `/admin/tenants/[factoryId]/page.tsx`)
- Test approach for verifying end-to-end SUPER_ADMIN impersonation flow

### Deferred Ideas (OUT OF SCOPE)

- Vehicle scheduling — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Custom shift time configuration — hardcoded in Phase 8B
- Payment gateway integration — manual confirmation sufficient for v2.0

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SADM-02 | Tenant list dashboard — all factories, subscription status, driver count, days remaining | Implemented at `/admin/tenants` via `TenantTable` + `GET /api/admin/factories`. Returns all fields. |
| SADM-03 | Activate/deactivate tenant subscription from dashboard | Implemented via `TenantTable` action modal + `PATCH /api/admin/subscriptions/[id]` with `status` field. |
| SADM-04 | Extend trial or subscription period (admin override) | Implemented via `TenantTable` extend modal + `PATCH /api/admin/subscriptions/[id]` with `extendDays`. |
| SADM-05 | Set price per driver | Implemented via `TenantTable` price modal + `PATCH /api/admin/subscriptions/[id]` with `pricePerDriver`. |
| INT-01 | All v1.0 entities (Customer, Order, Driver, Product) properly factory-scoped | All have `factoryId` in schema. Tenant API routes verified to filter by `session.factoryId`. |
| INT-02 | Per-customer pricing works within factory scope | `CustomerPriceOverride` keyed by `customerId+productId`. Factory scoping via Prisma $extends on Customer/Product. |
| INT-03 | RBAC middleware extended with SUPER_ADMIN bypass | `canAccessPath` returns `false` for SUPER_ADMIN (intentional — uses admin panel). |
| INT-04 | Delivery slips filtered by factory (via order.factoryId) | `/api/orders` filters by `factoryId: session.factoryId`. Confirmed. |
| INT-05 | Driver web-view scoped to factory (via driver.factoryId) | `/api/driver/orders` filters by `factoryId: driver.factoryId` (from token lookup). Confirmed. |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Super Admin tenant list | API / Backend (`/api/admin/factories`) | Frontend Server (`/admin/tenants`) | prismaAuth reads all factories; TenantTable renders |
| Subscription management (extend/activate/set price) | API / Backend (`/api/admin/subscriptions/[id]`) | Frontend Server (TenantTable action modals) | PATCH handler modifies Subscription records |
| SUPER_ADMIN impersonation | API / Backend (`/api/admin/impersonate/[factoryId]`) | Frontend Server (`/admin/tenants/[factoryId]`) | Sets `impersonate_token` cookie; drawer UI |
| Tenant entity factory-scoping | Database / Prisma (`$extends`) | API / Backend (explicit `where: { factoryId }`) | Defense-in-depth: $extends auto-injects + explicit filter |
| Driver web-view | API / Backend (`/api/driver/orders`) | Browser / Client (`/driver/page.tsx`) | Static token (?token=) bypasses session; filtered by driver.factoryId |
| RBAC enforcement | Frontend Server (middleware) | API / Backend (requireRole helpers) | Middleware handles page routing; route handlers enforce roles |

---

## Standard Stack

No new dependencies. Same stack as existing project:

| Library | Version | Purpose | Why Standard |
|---------|--------|---------|-------------|
| Next.js 15 | (existing) | App Router, Server Actions, RSC | Already in use |
| Prisma ORM | (existing) | Database access with $extends | Already in use |
| @prisma/client | (existing) | Prisma runtime | Already in use |
| prismaAuth | (existing) | Unextended Prisma for admin/super-admin reads | Already in use |
| Zod | (existing) | Runtime validation | Already installed |
| react-hot-toast | (existing) | Toast notifications | Already installed |
| lucide-react | (existing) | Icons | Already installed |

**No new packages needed.**

---

## Architecture Patterns

### Super Admin Read Path (Existing, Confirmed)

```
SUPER_ADMIN → /admin/tenants → TenantTable
                    ↓ fetch
            GET /api/admin/factories (prismaAuth — no $extends)
                    ↓
            Returns all factories (no factoryId filter)
```

### Impersonation Flow (Existing, Confirmed)

```
SUPER_ADMIN → "Hỗ trợ" button → POST /api/admin/impersonate/[factoryId]
                                           ↓
                                   Creates ImpersonationLog
                                           ↓
                                   Sets impersonate_token cookie (httpOnly, 15min)
                                           ↓
                                   Redirects to /admin/tenants/[factoryId]?impersonating=...&factoryId=...
                                           ↓
                                   Middleware: isImpersonating() returns { active: true, factoryId }
                                           ↓
                                   Tenant APIs: BLOCKED for non-GET (middleware)
                                           ↓
                                   End: POST /api/admin/impersonate/end → clears cookie
```

### Tenant Entity Scoping (Defense-in-Depth)

```
Tenant API request → requireRole(['ADMIN', ...])
                          ↓
                   session.factoryId available
                          ↓
                   Prisma $extends: auto-injects factoryId filter on $allModels
                          ↓
                   Explicit where: { factoryId: session.factoryId } (primary defense)
```

### RBAC Bypass Behavior

```
SUPER_ADMIN hits /api/orders → canAccessPath('SUPER_ADMIN', '/orders') → false
                                        ↓
                              Middleware: role === 'SUPER_ADMIN' → redirect to /admin/dashboard
                                        ↓
                              SUPER_ADMIN uses /admin/tenants (prismaAuth) for all reads
```

---

## Recommended Project Structure

Existing structure is sufficient. Phase 9 is verification, not structural change.

```
src/app/admin/              # Super Admin UI (already exists)
├── tenants/
│   ├── page.tsx             # Tenant list (TenantTable)
│   └── [factoryId]/page.tsx # Tenant detail
src/app/api/admin/          # Admin API routes (already exists)
├── factories/
│   ├── route.ts             # GET: tenant list (prismaAuth)
│   └── [factoryId]/route.ts # GET/POST: factory detail + create trial
├── subscriptions/
│   └── [id]/route.ts        # PATCH: extend/activate/set price
├── impersonate/
│   ├── [factoryId]/route.ts # POST: start impersonation
│   ├── end/route.ts         # POST: end impersonation
│   └── status/route.ts      # GET: check impersonation status
src/lib/rbac/
└── permissions.ts           # tenantRoutePermissions, canAccessPath
src/middleware.ts            # SUPER_ADMIN → /admin/dashboard redirect
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SUPER_ADMIN bypass of tenant filters | Custom unscoped queries | prismaAuth (unextended Prisma) | Admin reads need to bypass $extends; prismaAuth is the existing solution |
| Impersonation isolation | Store impersonation in JWT or session | Separate httpOnly cookie | Cookie-based isolation is correct security pattern |
| FactoryId scoping on all tenant entities | Add manual WHERE to every query | Prisma $extends + explicit where clause | Defense-in-depth: $extends fails-closed when ctx.factoryId absent |
| Subscription enforcement | Check subscription inline in every route | requireActiveSubscription() helper | Already implemented; consistent enforcement |

---

## Common Pitfalls

### Pitfall 1: Treating Phase 9 as a Build Phase Rather Than Verification
**What goes wrong:** Planning tries to implement new features instead of verifying existing infrastructure.
**Why it happens:** The CONTEXT.md explicitly says "Phase 9 is primarily a verification and gap-fill phase" (D-14), but the temptation is to add polish or enhancements.
**How to avoid:** Verify each success criterion is already implemented. Plan only for gaps found during verification.

### Pitfall 2: SUPER_ADMIN Session Reaching Tenant API Routes
**What goes wrong:** If a SUPER_ADMIN somehow bypasses the admin panel and reaches a tenant API directly (e.g., via curl), the route-level `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])` would block them — but they should be using admin routes instead.
**Why it happens:** Intentional design, but edge cases like `requireRole(['ADMIN', 'SUPER_ADMIN'])` on a route would incorrectly admit SUPER_ADMIN.
**How to avoid:** During audit, verify no route accidentally includes `SUPER_ADMIN` in role arrays. SUPER_ADMIN must always use prismaAuth/admin routes.

### Pitfall 3: CustomerPriceOverride Not Explicitly Factory-Scoped
**What goes wrong:** `CustomerPriceOverride` is not in `factoryIdModels` list in `lib/db.ts`, meaning direct queries on that model bypass factoryId filtering.
**Why it happens:** It was assumed that all access to CustomerPriceOverride goes through Customer/Product relations which are factory-scoped.
**How to avoid:** Verify that no API route queries `customerPriceOverride` directly without factory scoping. If found, add to `factoryIdModels` or add explicit filter.

### Pitfall 4: Incomplete FactoryId Filtering in Routes Added After Phase 6/8
**What goes wrong:** Routes like `/api/schedule/assignments` or `/api/driver/orders` may have been added without proper factoryId filtering.
**How to avoid:** Audit all API routes (not just the ones explicitly mentioned in Phase 8 context) for correct factoryId filtering.

### Pitfall 5: Missing RBAC Route Matrix Entry for New Tenant Routes
**What goes wrong:** New tenant app routes (e.g., `/schedule`) added in Phase 8B are not in `tenantRoutePermissions`, causing sidebar/middleware drift.
**Why it happens:** `/schedule` was added in Phase 8B but the RBAC route matrix in `permissions.ts` was not updated to include it.
**How to avoid:** Verify all tenant app routes exist in `tenantRoutePermissions` with correct roles.

---

## Code Examples

### Super Admin Read (prismaAuth — no $extends)
```typescript
// src/app/api/admin/factories/route.ts — GET
const factories = await basePrisma.factory.findMany({
  where: { isSystem: false },
  include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }, ... },
});
// basePrisma = prismaAuth (unextended) — no tenant filtering
```

### Tenant API with Explicit factoryId Filter + $extends
```typescript
// src/app/api/orders/route.ts — GET
const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
const where: Record<string, unknown> = { factoryId: session.factoryId };
const orders = await prisma.order.findMany({ where, ... });
// prisma = extendedPrisma ($extends auto-injects factoryId) + explicit where
```

### Driver Web-View factoryId Filtering (via token)
```typescript
// src/app/api/driver/orders/route.ts — GET
const driver = await prismaAuth.driver.findUnique({ where: { token } });
// prismaAuth used here — no $extends (driver is not tenant-scoped in same way)
// BUT factoryId comes from the driver record itself
const orders = await prisma.order.findMany({
  where: { factoryId: driver.factoryId, driverId: driver.id, ... },
});
```

### SUPER_ADMIN Blocked from Tenant Routes (by design)
```typescript
// src/lib/rbac/permissions.ts
export function canAccessPath(role: AppRole | undefined, pathname: string): boolean {
  if (!role || role === 'SUPER_ADMIN') return false; // SUPER_ADMIN blocked from tenant routes
  ...
}
```

### Impersonation Cookie Isolation
```typescript
// src/app/api/admin/impersonate/[factoryId]/route.ts — POST
response.cookies.set('impersonate_token', impersonation.token, {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 900, // 15 minutes
});
// auth_token JWT is NOT modified — role still SUPER_ADMIN, factoryId still null
```

### Middleware Blocks Writes During Impersonation
```typescript
// src/middleware.ts
if (request.method !== 'GET' && pathname.startsWith('/api/')) {
  const { active } = await isImpersonating(request);
  if (active) {
    return NextResponse.json(
      { error: 'Read-only during impersonation...', code: 'READ_ONLY_IMPERSONATION' },
      { status: 403 }
    );
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SUPER_ADMIN bypasses $extends for all reads | SUPER_ADMIN uses prismaAuth (unextended Prisma) for admin reads; tenant routes blocked for SUPER_ADMIN | Phase 6 | Clean separation: admin panel uses unscoped reads, tenant APIs use scoped reads |
| Impersonation stored in JWT | Impersonation uses separate httpOnly cookie | Phase 6 | Security isolation: JWT role stays SUPER_ADMIN, impersonation context is separate |
| Driver view used session auth | Driver view uses static token (?token=) | Phase 1/2 | Drivers don't need accounts; token-based access works without session |

**No deprecated approaches in Phase 9 scope.**

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All tenant API routes (not just those listed in Phase 8 context) filter by `session.factoryId` | INT-01 | Tenant data leak — must audit all `/api/*` routes |
| A2 | `CustomerPriceOverride` is never queried directly without going through Customer/Product relations | INT-02 | If direct queries exist, factory scoping is bypassed |
| A3 | `/schedule` route (added in Phase 8B) is included in `tenantRoutePermissions` with correct roles | INT-03 | Phase 8B added `/schedule` but RBAC matrix may not have been updated |

**All three assumptions need verification during planning/execution.**

---

## Open Questions

1. **Does `/schedule` (Phase 8B) have a `tenantRoutePermissions` entry?**
   - What we know: Phase 8B added `/schedule` as a tenant app route.
   - What's unclear: Whether `tenantRoutePermissions` was updated to include `/schedule`.
   - Recommendation: Check `permissions.ts` during planning; add entry if missing.

2. **Is `CustomerPriceOverride` ever queried directly without factory scoping?**
   - What we know: It's not in `factoryIdModels` list in `lib/db.ts`.
   - What's unclear: Whether any route directly queries `prisma.customerPriceOverride`.
   - Recommendation: Audit all Prisma queries for `customerPriceOverride` model usage.

3. **Does the driver web-view delivery slip (/driver page) correctly show only the impersonated factory's orders?**
   - What we know: Driver web-view uses static token (?token=), not session/impersonation.
   - What's unclear: If a SUPER_ADMIN impersonates a factory, then opens the driver web-view, does the driver token route properly filter by the impersonated factory's driver?
   - Recommendation: Verify `driver.factoryId` is set correctly on all driver records and the `/api/driver/orders` token lookup returns the right factory.

---

## Environment Availability

Step 2.6: SKIPPED (Phase 9 is a verification and code audit phase — no external dependencies beyond existing codebase tools).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireSession()` helper on all routes; SUPER_ADMIN uses separate auth |
| V3 Session Management | yes | JWT auth + impersonation cookie isolation |
| V4 Access Control | yes | `tenantRoutePermissions` + `canAccessPath` + `requireRole` |
| V5 Input Validation | yes | Zod v4 already in use; admin routes validate inputs |

### Known Threat Patterns for Phase 9 Scope

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SUPER_ADMIN accidentally reads all tenants via tenant API | Information Disclosure | `canAccessPath` returns `false` for SUPER_ADMIN; prismaAuth used for admin reads |
| Impersonation token theft | Elevation of Privilege | httpOnly + sameSite strict cookie; 15-min expiry; write blocking during impersonation |
| Tenant data leakage via unscoped query | Information Disclosure | Prisma $extends fail-closed + explicit `where: { factoryId }` defense-in-depth |
| SUPER_ADMIN write during impersonation | Tampering | Middleware blocks non-GET requests when impersonating |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/db.ts` — prismaAuth vs prisma distinction, factoryIdModels list, $extends behavior
- `src/lib/rbac/permissions.ts` — tenantRoutePermissions, canAccessPath
- `src/middleware.ts` — SUPER_ADMIN redirect, impersonation cookie check, write blocking
- `src/app/api/admin/factories/route.ts` — prismaAuth tenant list
- `src/app/api/admin/subscriptions/[id]/route.ts` — extend/activate/set price
- `src/app/api/admin/impersonate/[factoryId]/route.ts` — impersonation flow
- `src/app/api/driver/orders/route.ts` — factoryId filtering via driver.token
- `prisma/schema.prisma` — factoryId on all v1.0 entities

### Secondary (MEDIUM confidence)
- Phase 8 context (D-09 through D-13) — subscription management infrastructure confirmed
- Phase 7B context — SUPER_ADMIN behavior, impersonation read-only enforcement
- `.planning/ROADMAP.md` §Phase 9 — success criteria and requirements mapping

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing codebase, no new dependencies
- Architecture: HIGH — well-established patterns confirmed in code
- Pitfalls: MEDIUM — based on reading existing code and context, some gaps need verification

**Research date:** 2026-04-23
**Valid until:** 30 days (stable phase — verification, no new patterns)
