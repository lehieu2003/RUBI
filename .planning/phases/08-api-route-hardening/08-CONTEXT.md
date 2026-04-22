# Phase 8: API Route Hardening + Subscription Enforcement - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

All write API endpoints use auth helpers (requireSession/requireRole/requireFactoryId); subscription enforcement blocks writes when inactive (TRIAL expired, PAID cancelled); 7-day grace period enforced; VietQR payment template configured for manual confirmation. Phase 8 builds on Phase 7B RBAC enforcement and Phase 7 auth infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Subscription Enforcement Strategy (SUBS-01, SUBS-02, SUBS-03)
- **D-01:** Subscription enforcement lives in TWO layers — defense-in-depth:
  1. **Middleware (Edge runtime):** Blocks writes when subscription check returns non-OK for non-GET API requests. Already partially implemented in `src/middleware.ts`.
  2. **requireActiveSubscription() helper (Server runtime):** Called in all write API route handlers as route-level enforcement. Catches Server Actions and direct API calls that bypass middleware.
- **D-02:** Subscription check endpoint: `GET /api/billing/subscription` — already exists at `src/app/api/billing/subscription/route.ts`
- **D-03:** Middleware subscription check failure behavior: **Fail closed** — when subscription check fails (503), all write operations are blocked. This is consistent with current middleware behavior (503 + CHECK_FAILED code).
- **D-04:** `requireActiveSubscription()` helper behavior: throws `NextResponse.json({ error: 'Subscription Required' }, { status: 403 })` when subscription is not ACTIVE/PAID. Already implemented in `src/lib/auth/helpers.ts`.

### Grace Period (SUBS-04)
- **D-05:** Grace period: write operations allowed during 7 days after subscription cancellation. Already implemented via `isGracePeriodExpired()` in `src/lib/subscription-status.ts` and checked in middleware.
- **D-06:** Middleware blocks writes only when `subscription.status === 'CANCELLED' && isGracePeriodExpired(subscription)` — grace period still active = writes allowed.

### Auth Helper Migration Scope (AUTH-06)
- **D-07:** **Full migration — all write routes** use auth helpers (requireRole/requireFactoryId/requireActiveSubscription). Aligns with AUTH-06 goal from REQUIREMENTS.md.
- **D-08:** Routes to migrate (currently using manual getSession()+roleCheck):
  - `src/app/api/customers/route.ts` — POST uses manual getSession(), lacks requireRole
  - `src/app/api/drivers/route.ts` — POST uses manual getSession(), lacks requireRole
  - `src/app/api/orders/route.ts` — bulk operations need auth
  - `src/app/api/orders/[id]/confirm/route.ts` — needs requireRole
  - `src/app/api/orders/[id]/reconcile/route.ts` — needs auth
  - `src/app/api/orders/[id]/status/route.ts` — needs auth
  - `src/app/api/deposits/shells/route.ts` — needs auth
  - `src/app/api/prices/customer/override/route.ts` — needs auth
  - `src/app/api/prices/global/route.ts` — needs auth
  - `src/app/api/staff/route.ts` — needs auth
  - `src/app/api/staff/[id]/route.ts` — needs auth
  - `src/app/api/subscriptions/[id]/route.ts` — needs auth
  - `src/app/api/subscriptions/cancel/route.ts` — needs auth
  - `src/app/api/factory/onboarding/route.ts` — needs auth
- **D-09:** Admin routes already using requireRole (confirm payment, subscriptions): keep using requireRole(['ADMIN']). Extend to other admin write routes.
- **D-10:** Auth helper migration replaces manual getSession() + role checks with shared helpers — consistent 401/403 behavior across all routes.

### VietQR Payment Template (SUBS-05)
- **D-11:** VietQR scope: payment template UI only — display bank account info for manual transfer. Confirmation is a manual database update by admin (not a VietQR API integration).
- **D-12:** VietQR template will be added to billing settings page — Phase 9 (Super Admin) handles the broader payment/integration context.

### Subscription Enforcement Availability (SUBS-03)
- **D-13:** `requireActiveSubscription()` helper is available as route-level enforcement for all write operations. Already implemented in `src/lib/auth/helpers.ts`.

### Route-Level Role Enforcement
- **D-14:** All write API endpoints use auth helpers before processing. requireRole for ADMIN-only routes, requireSession for routes accessible to multiple roles.
- **D-15:** Role hierarchy: ADMIN > ACCOUNTANT > STAFF. STAFF can only access /orders and /customers (order entry focus). ACCOUNTANT can access /dashboard, /orders, /customers, /settle, /inventory, /vehicles.

### Claude's Discretion
- Exact order and grouping of route migrations (can group by functional area)
- Whether to add requireActiveSubscription() to all write routes or only high-risk ones — full coverage is the default
- Specific VietQR template UI location and styling
- Test approach for subscription enforcement (can test middleware behavior + route-level helper separately)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 8 — Phase goal, success criteria, requirements mapping
- `.planning/REQUIREMENTS.md` §SUBS-01 to §SUBS-03, §AUTH-06, §SUB-02, §SUB-03, §SUB-04, §SUB-05, §FACT-04 — Subscription enforcement and auth requirements

### Prior Phase Context
- `.planning/phases/07B-rbac-enforcement/07B-CONTEXT.md` — RBAC route matrix, SUPER_ADMIN behavior, write route helper migration decisions
- `.planning/phases/07-auth-infra/07-CONTEXT.md` — Auth helper structure, rate limiting, registration flow decisions
- `.planning/phases/06-data-layer-hardening/06-CONTEXT.md` — Factory-scoped uniqueness, SUPER_ADMIN bypass behavior

### Existing Implementation
- `src/middleware.ts` — Current subscription check in middleware (already blocks writes when inactive + grace period)
- `src/lib/auth/helpers.ts` — requireSession, requireRole, requireFactoryId, requireActiveSubscription helpers
- `src/lib/subscription-status.ts` — isSubscriptionActive(), isGracePeriodExpired() functions
- `src/app/api/billing/subscription/route.ts` — Subscription check endpoint (GET returns subscription + driverCount)
- `src/app/api/customers/route.ts` — Manual getSession() in POST (needs migration)
- `src/app/api/drivers/route.ts` — Manual getSession() in POST (needs migration)
- `src/app/api/payments/confirm/route.ts` — Already uses requireRole(['ADMIN'])

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth/helpers.ts` — All four auth helpers already implemented and imported in some routes
- `src/lib/subscription-status.ts` — isSubscriptionActive(), isGracePeriodExpired() — already used in middleware
- `src/middleware.ts` — Subscription enforcement already partially implemented (blocks CANCELLED+expired, blocks inactive)
- `src/app/api/billing/subscription/route.ts` — GET endpoint returns subscription + driverCount

### Established Patterns
- Auth helpers throw NextResponse objects directly as exceptions — callers handle via instanceof or let Next.js handle
- Middleware subscription check uses fetch to internal API (Edge runtime can't use Prisma directly)
- Grace period: 7 days via isGracePeriodExpired() — checked before blocking CANCELLED subscriptions
- Rate limiter uses in-memory Map (no new dependency)

### Integration Points
- Auth helpers at `src/lib/auth/helpers.ts` — imported by write routes needing role/subscription checks
- Subscription check endpoint at `/api/billing/subscription` — called by middleware and available for route-level use
- VietQR template will go in billing settings area (Phase 9 context)

### Current Risks to Address
- Some write routes use manual getSession() instead of requireRole() — inconsistent 401/403 behavior
- Middleware subscription check fails closed (503) on check failure — aligns with D-03 decision
- /api/billing/subscription requires ADMIN role — may need to allow ACCOUNTANT for subscription status display

</code_context>

<specifics>
## Specific Ideas

VietQR template: display factory bank account info (bank name, account number, account holder) in billing settings page for manual payment. Admin records payment via direct DB update or admin panel (not VietQR API integration in Phase 8).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 08-api-route-hardening*
*Context gathered: 2026-04-22*