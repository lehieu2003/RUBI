# Phase 01: Foundation — Data Layer + Factory Model + Super Admin Role

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the cross-cutting data layer that enables multi-tenancy for v2.0. All subsequent phases depend on this foundation.

This phase delivers:
- `Factory` model created
- `factoryId` field added to Customer, Driver, Order, Product
- Prisma tenant middleware auto-injects `factoryId` filter via AsyncLocalStorage + `$extends`
- SUPER_ADMIN role bypasses factoryId filter
- Subscription enforcement middleware on write requests
- Factory-scoped unique constraints (`@@unique([code, factoryId])`)
- Tenant activation/deactivation via subscription status

</domain>

<decisions>
## Implementation Decisions

### Backfill Strategy
- **D-01:** Create a default "System" factory. All existing Customer, Driver, Order, Product records assigned to this factory during backfill migration. New records created by admins get their factory's factoryId.

### Tenant Middleware Approach
- **D-02:** AsyncLocalStorage stores `factoryId` per request context. Prisma `$extends` hook auto-injects `factoryId` filter into all `findMany`/`findFirst` queries for non-SUPER_ADMIN users. No query changes needed in API routes.

### SUPER_ADMIN Creation
- **D-03:** One-time seed script creates the first SUPER_ADMIN account. Run manually after deployment. No automatic creation mechanism.

### factoryId Field Placement
- **D-04:** Direct `factoryId` String field on Customer, Driver, Order, Product models. Not inherited via relations — explicit field is simpler for constraints and JOINs.
- **D-05:** `@@unique([code, factoryId])` on Customer.code and Driver.phone for factory-scoped uniqueness.

### Subscription Enforcement
- **D-06:** Dual-layer enforcement: Edge middleware (existing) + per-route guard in write handlers. HTTP 403 returned when TRIAL expired or PAID cancelled.

### SUPER_ADMIN Bypass
- **D-07:** SUPER_ADMIN role bypasses factoryId filter entirely — can query across all factories. Implemented via role check in tenant middleware before auto-injecting factoryId.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/ROADMAP.md` — Phase 01 goal, requirements DATA-01 to DATA-05, FACT-03, SADM-01, success criteria
- `.planning/REQUIREMENTS.md` — All v2.0 requirements (Factory Management, Subscription, Super Admin, Data Layer)
- `.planning/research/STACK.md` — AsyncLocalStorage + Prisma $extends approach (Section 2)
- `.planning/research/PITFALLS.md` — Critical gaps: no factoryId on Customer/Driver/Order/Product, GET routes without factoryId filter
- `.planning/PROJECT.md` — Current milestone: v2.0 Multi-tenant Factory Architecture

### Existing Code
- `src/lib/db.ts` — PrismaClient singleton
- `src/lib/subscription-status.ts` — isSubscriptionActive(), getFactorySubscription()
- `src/middleware.ts` — Existing JWT auth + role routing + subscription check on writes
- `prisma/schema.prisma` — Current schema (User.factoryId and Subscription.factoryId already exist)

### External Docs
- Prisma `$extends` API: https://www.prisma.io/docs/orm/prisma-client/extensions
- Node.js AsyncLocalStorage: https://nodejs.org/api/async_context.html#class-asynclocalstorage

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `getFactorySubscription()`, `getDaysRemaining()` — already implemented, reuse for DATA-04
- `src/middleware.ts` — JWT verification + role routing pattern — extend for SUPER_ADMIN check
- `prisma/schema.prisma` — User.factoryId and Subscription.factoryId already exist

### Integration Points
- All API routes in `src/app/api/*/route.ts` — GET /api/drivers, GET /api/customers, GET /api/orders currently have NO factoryId filter (from PITFALLS.md)
- `src/lib/db.ts` — Where PrismaClient is instantiated, add $extends here
- New `src/lib/tenant.ts` — AsyncLocalStorage context + $extends configuration

### Schema Changes Required
1. Create `Factory` model (id, name, phone, address, createdAt, updatedAt)
2. Add `factoryId` String to Customer, Driver, Order, Product
3. Add `@@unique([code, factoryId])` to Customer.code
4. Add `@@unique([code, factoryId])` to Driver.phone
5. Add `factoryId` String to Subscription (already has it)
6. Add `factoryId` String to User (already has it)

</code_context>

<specifics>
## Specific Ideas

1. **Hybrid enforcement** — Edge middleware catches HTTP requests; per-route guard catches direct Server Action calls. Both check `isSubscriptionActive()`.

2. **Grace period** — FACT-04 (7-day grace) is Phase 04, not this phase. This phase only sets up activation/deactivation mechanism (via subscription status).

3. **Backfill script** — Prisma migration adds factoryId as optional first, then backfill script assigns all records to default factory, then migration makes factoryId required + with default.

</specifics>

<deferred>
## Deferred Ideas

- FACT-04 (7-day grace period after cancellation) — Phase 04
- FACT-01/FACT-02 (Factory registration flow) — Phase 02
- SADM-02 to SADM-05 (Super Admin dashboard UI) — Phase 03

</deferred>

---

*Phase: 01-foundation-data-layer*
*Context gathered: 2026-04-17*
