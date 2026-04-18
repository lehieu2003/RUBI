# Phase 03: Subscription Management + Super Admin Dashboard - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete subscription billing workflow (manual payment confirmation + VietQR display) and build the Super Admin dashboard for system-wide tenant management.

**Already implemented (SUB-04, SUB-05):**
- PaymentRecorder component — Admin records payment → extends subscription by 30 days (`/api/payments/confirm` exists)
- VietQRCode component — VietQR display with bank details (hardcoded placeholder values)

**This phase delivers:**
- `/billing` page for ADMIN — PaymentRecorder + VietQRCode + subscription status
- `/admin/dashboard` (or `/superadmin`) — Super Admin tenant list + subscription actions
- SADM-02: Tenant list — all factories, subscription status, driver count, days remaining
- SADM-03: Activate/deactivate tenant subscription from dashboard
- SADM-04: Extend trial or subscription period (admin override)
- SADM-05: Configure price per driver

</domain>

<decisions>
## Implementation Decisions

### Super Admin Dashboard Layout (SADM-02)
- **D-01:** Dense data table layout — sortable columns, filter by status/subscription type. Best for power users managing many factories. Columns: Factory name, Subscription status, Plan type, Driver count, Days remaining, Actions.

### Subscription Actions UX (SADM-03, SADM-04, SADM-05)
- **D-02:** Row-level inline actions — Activate, Deactivate, Extend buttons directly in each table row. Fast for power users. No modal or slide-over needed for simple actions.
- **D-03:** Extend action shows inline input for number of days to add (default 30).
- **D-04:** Price per driver configured via row action or inline edit in the driverCount column area.

### Admin Billing Page
- **D-05:** Dedicated `/billing` page at `src/app/billing/page.tsx`. Contains:
  - SubscriptionStatusCard (already exists) showing current plan, days remaining, driver count
  - PaymentRecorder component for recording manual payments
  - VietQRCode component showing bank transfer details
- **D-06:** Billing page accessible to ADMIN role only. Redirect STAFF/ACCOUNTANT to dashboard if they try to access.

### Bank Account for VietQR
- **D-07:** VietQRCode currently has hardcoded placeholder bank details (Vietcombank 1234567890, CTY TNHH ICEFLOW). This is acceptable for v2.0 — bank account configuration is a future Phase 05+ item.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/ROADMAP.md` — Phase 03 goal, requirements SUB-04, SUB-05, SADM-02/03/04/05, success criteria
- `.planning/REQUIREMENTS.md` — v2.0 requirements (SUB-04, SUB-05, SADM-02 to SADM-05)
- `.planning/PROJECT.md` — Current milestone: v2.0 Multi-tenant Factory Architecture

### Prior Phase Context
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 01 decisions (tenant middleware, SUPER_ADMIN bypass, factoryId field)
- `.planning/phases/02-factory-registration-subscription-core/02-CONTEXT.md` — Phase 02 decisions (read-only banner, trial warning)

### Existing Code
- `src/components/billing/PaymentRecorder.tsx` — Already implemented, SUB-04 done
- `src/components/billing/VietQRCode.tsx` — Already implemented, SUB-05 done
- `src/components/billing/PricingDisplay.tsx` — Pricing display component
- `src/components/billing/CancelSubscriptionFlow.tsx` — Cancellation flow
- `src/components/dashboard/subscription-status-card.tsx` — Existing subscription status card
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `getDaysRemaining()`
- `prisma/schema.prisma` — Subscription model (planType, status, driverCount, pricePerDriver fields)
- `src/middleware.ts` — Role-based routing

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `PaymentRecorder.tsx` — Ready to use on /billing page, handles payment confirmation POST to `/api/payments/confirm`
- `VietQRCode.tsx` — Ready to use on /billing page, shows bank transfer info
- `subscription-status-card.tsx` — Already shows plan type, days remaining, driver count for ADMIN
- `src/lib/subscription-status.ts` — `getDaysRemaining()`, `isSubscriptionActive()` helpers

### Integration Points
- `/billing` page — needs new route `src/app/billing/page.tsx` (does not exist yet)
- `/admin/dashboard` — new route for Super Admin, needs new page + layout
- API: `/api/payments/confirm` — already exists, used by PaymentRecorder
- API: Need new endpoint for Super Admin to list all factories with subscriptions
- API: Need new endpoint for Super Admin to update subscription status/dates/pricePerDriver

### Patterns to Follow
- Table layout: Use existing `src/components/ui/table.tsx` or shadcn/ui Table component
- Row actions: Button group with small/ghost variants, consistent with existing dashboard patterns
- Billing page: Follow existing dashboard card layout with sections

</codebase_context>

<specifics>
## Specific Ideas

1. **Super Admin route protection**: `/admin/*` routes check `role === 'SUPER_ADMIN'` before rendering. Redirect to `/dashboard` if not authorized.

2. **Extend subscription UX**: Clicking "Extend" in a row shows an inline number input (default 30 days) with a confirm button. Direct update, no modal.

3. **VietQR bank details**: Currently hardcoded — Vietcombank 1234567890, CTY TNHH ICEFLOW. Do not add bank config UI in this phase.

</specifics>

<deferred>
## Deferred Ideas

- Bank account configuration (VietQR bank details) — future Phase 05+
- Multiple subscription plans (Basic, Premium tiers) — future Phase 05+
- Bulk activate/deactivate multiple factories at once — future Phase 05+

</deferred>

---

*Phase: 03-subscription-management-super-admin-dashboard*
*Context gathered: 2026-04-18*
