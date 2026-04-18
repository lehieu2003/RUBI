# Phase 03: Subscription Management + Super Admin Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 03-subscription-management-super-admin-dashboard
**Areas discussed:** Super Admin dashboard layout, Subscription actions UX, Admin billing page

---

## Super Admin Dashboard Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Table (recommended) | Dense data table — sortable columns, filters. Best for power users managing many factories | ✓ |
| Card grid | Visual cards with factory name/status. Easier to scan but less data-dense | |
| Hybrid | Summary cards at top, table below for details | |

**User's choice:** Table (recommended)
**Notes:** Dense table is best for power Super Admin users managing many factories

---

## Subscription Actions UX

| Option | Description | Selected |
|--------|-------------|----------|
| Row actions (recommended) | Inline actions in each row — activate, deactivate, extend buttons. Fast for power users | ✓ |
| Detail modal | Click row → modal with full details and actions. More info but extra clicks | |
| Slide-over panel | Click row → right slide-over panel. Balances info and action | |

**User's choice:** Row actions (recommended)
**Notes:** Fast for power users, inline extend with day input

---

## Admin Billing Page

| Option | Description | Selected |
|--------|-------------|----------|
| Billing page (recommended) | Dedicated /billing page with PaymentRecorder + VietQRCode + subscription status. Clear and focused | ✓ |
| Dashboard tab/section | Integrate billing into existing dashboard page. Fewer pages but busier dashboard | |
| Settings page | Billing lives under /settings/billing. Logical grouping with other factory settings | |

**User's choice:** Billing page (recommended)
**Notes:** Clear separation, dedicated /billing page

---

## Deferred Ideas

- Bank account configuration (VietQR bank details) — future Phase 05+
- Multiple subscription plans (Basic, Premium tiers) — future Phase 05+
- Bulk activate/deactivate multiple factories at once — future Phase 05+
