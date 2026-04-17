# Phase 02: Factory Registration + Subscription Core - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable new factories to self-register with a trial subscription; block write operations when subscription is inactive or expired.

This phase delivers:
- Factory self-registration via `/api/auth/register` (already implemented — creates Factory + User + Subscription atomically)
- Subscription enforcement on write operations (already in middleware — 403 when inactive)
- Driver count enforcement — block driver assignment when driverCount exceeded
- Read-only mode UI — persistent banner across all pages when subscription inactive
- Trial expiry warning — banner 3 days before trial expires

</domain>

<decisions>
## Implementation Decisions

### Driver Count Enforcement (SUB-03)
- **D-01:** Block driver assignment at subscription check. Driver records CAN be created freely (for setup/testing), but assigning a driver to an Order triggers subscription check. If driverCount limit exceeded → 403 with message "Cần nâng cấp subscription để thêm driver". 1 admin free, paid per driver per month.

### Read-only Mode UX
- **D-02:** Read-only mode + warning banner on ALL pages via shared layout. Reads permitted (dashboard, orders, customers), writes blocked with 403. Banner persists across page navigation.
- **D-03:** Banner location: shared layout (all pages affected). Banner message: "Hệ thống chỉ đọc — Subscription hết hạn. Liên hệ Admin để nâng cấp."

### Trial Expiry Flow
- **D-04:** Trial expiry warning: banner shown when subscription has ≤3 days remaining. Warning: "Trial còn {N} ngày — Liên hệ Admin để nâng cấp."
- **D-05:** When TRIAL expires → Subscription status → EXPIRED → read-only mode (403 on writes). When PAID cancelled → CANCELLED → grace period (Phase 04) → read-only after grace.

### Registration (FACT-01, FACT-02 — already implemented)
- **D-06:** `/api/auth/register` already creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) atomically in Prisma transaction. No changes needed.

### Subscription Status Display (for ADMIN)
- **D-07:** ADMIN sees subscription status on dashboard: days remaining, plan type, driver count. This is Phase 02 scope — the UI component for displaying subscription info to ADMIN.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/ROADMAP.md` — Phase 02 goal, requirements FACT-01/02, SUB-01/02/03, success criteria
- `.planning/REQUIREMENTS.md` — v2.0 requirements (FACT-01, FACT-02, SUB-01, SUB-02, SUB-03)
- `.planning/PROJECT.md` — Current milestone: v2.0 Multi-tenant Factory Architecture

### Prior Phase Context
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 01 decisions (tenant middleware, SUPER_ADMIN bypass, factoryId field placement)

### Existing Code
- `src/app/api/auth/register/route.ts` — Existing registration endpoint (FACT-01, FACT-02 already implemented)
- `src/middleware.ts` — Existing subscription enforcement (403 on writes when inactive)
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `isGracePeriodExpired()`, `getDaysRemaining()`
- `src/lib/tenant.ts` — AsyncLocalStorage tenant context
- `prisma/schema.prisma` — Factory, Subscription, User models (driverCount field exists on Subscription)

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/subscription-status.ts` — `getDaysRemaining()` already exists, reuse for ≤3 day warning threshold
- `src/middleware.ts` — existing subscription check pattern for writes, extend with driverCount check
- `src/lib/tenant.ts` — tenant context for checking driverCount against subscription

### Integration Points
- `src/app/api/auth/register/route.ts` — already handles FACT-01/02, no changes needed
- `src/middleware.ts` — add driverCount enforcement on driver assignment endpoint
- `src/components/layouts/*` — add read-only banner to shared layout
- Dashboard component — add subscription status display for ADMIN

### Patterns to Follow
- Middleware pattern: return 403 JSON with `code` field for machine-readable errors
- Prisma transaction pattern: already used in register endpoint

</codebase_context>

<deferred>
## Deferred Ideas

- FACT-04 (7-day grace period after cancellation) — Phase 04
- SUB-04 (manual payment confirmation) — Phase 03
- SUB-05 (VietQR content template) — Phase 03
- SADM-02 to SADM-05 (Super Admin dashboard UI) — Phase 03

</deferred>

---

*Phase: 02-factory-registration-subscription-core*
*Context gathered: 2026-04-17*