# Phase 6: Data Layer Hardening - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

All tenant-scoped queries explicitly filter by factoryId; Prisma $extends fails closed when ctx.factoryId is absent; JWT_SECRET validated at startup; seed scripts don't leak tokens.
</domain>

<decisions>
## Implementation Decisions

### Fail-closed Behavior (DATA-05)
- **D-01:** Prisma $extends THROWS an explicit error when `ctx.factoryId` is absent for tenant-scoped models (Customer, Driver, Order, Product, User, Subscription). Not silent empty — loud failure.
- **D-02:** SUPER_ADMIN bypasses factoryId filter entirely in $extends — stays as-is. Super Admin needs system-wide access; role check happens in middleware before $extends runs.

### JWT_SECRET Validation (SEC-01, SEC-03)
- **D-03:** App throws fatal error on startup if `JWT_SECRET` env var is missing in production. Clear failure — impossible to run without proper config.
- **D-04:** Remove hardcoded fallback secret `'iceflow-secret-key-change-in-production'` from `auth.ts`. The fallback was SEC-03 violation.
- **D-05:** `seed-system-factory.ts` must NOT print JWT tokens to console (SEC-02 fix).

### Factory.onboardingCompleted Field (REG-03)
- **D-06:** Add `onboardingCompleted: Boolean @default(false)` to Factory model. New factories start with onboarding incomplete.

### API Route Redundancy (DATA-01, DATA-03)
- **D-07:** Keep explicit `factoryId: session.factoryId` filters in API routes as defense in depth. $extends is the safety net, explicit filters make intent clear in each route.

### Claude's Discretion
- findFirst/findUnique in $extends: same fail-closed behavior as findMany (throw when ctx.factoryId absent)
- Specific error message format for the thrown error — Claude decides
- Migration approach for onboardingCompleted field — Claude decides
</decisions>

<canonical_refs>
## Canonical References

### Phase Requirements
- `ROADMAP.md` §Phase 6 — Phase goal, success criteria
- `REQUIREMENTS.md` §DATA-01 to DATA-05, §SEC-01 to SEC-03, §REG-03, §BUILD-04 — Specific requirements

### Existing Implementation
- `src/lib/db.ts` — Prisma $extends implementation (CURRENT: passes through when ctx.factoryId absent)
- `src/lib/auth.ts` — JWT handling (CURRENT: has hardcoded fallback secret)
- `src/lib/tenant.ts` — AsyncLocalStorage tenant context
- `prisma/schema.prisma` — Factory model (NEEDS: onboardingCompleted field)
- `prisma/seed-system-factory.ts` — Super Admin seed (NEEDS: remove JWT console.log)

### API Routes (already have explicit factoryId filters)
- `src/app/api/customers/route.ts`
- `src/app/api/drivers/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/products/route.ts`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db.ts` — Extended Prisma instance — primary target for fail-closed changes
- `src/lib/auth.ts` — JWT sign/verify — target for JWT_SECRET startup check
- `prisma/seed-system-factory.ts` — Seed script — target for token logging fix

### Established Patterns
- Explicit `where: { factoryId: session.factoryId }` in API routes — defense in depth already in place
- `factoryIdModels` array in $extends listing tenant-scoped models
- SUPER_ADMIN bypass via `ctx.role === 'SUPER_ADMIN'` check

### Integration Points
- New Factory field `onboardingCompleted` must be added to schema and migrated
- JWT_SECRET check happens at module load time in auth.ts
- $extends fail-closed affects all tenant-scoped queries globally

### Violations to Fix
1. `src/lib/auth.ts:4-6` — hardcoded fallback JWT secret (SEC-03)
2. `prisma/seed-system-factory.ts:61-62` — console.log of JWT token (SEC-02)
</code_context>

<specifics>
## Specific Ideas

No specific references or "like X" moments from discussion — implementation decisions are clear from requirements.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-data-layer-hardening*
*Context gathered: 2026-04-22*
