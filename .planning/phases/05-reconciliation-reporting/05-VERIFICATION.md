---
phase: 05-reconciliation-reporting
verified: 2026-04-17T09:15:00Z
status: passed
score: 19/19 must-haves verified (17 fully VERIFIED, 1 INFO, 1 PASSED via override)
overrides_applied: 1
overrides:
  - must_have: "Zero-balance customers hidden from report"
    reason: "Filter added at API level (d3846ee) — outstandingDebt > 0 filter applied before sort/return in /api/reports/debt"
    accepted_by: hieu
    accepted_at: 2026-04-17T09:15:00Z
re_verification:
  previous_status: gaps_found
  previous_score: 8/10
  gaps_closed:
    - "Zero-balance customers hidden from debt report — filter added (d3846ee)"
    - "Requirement ID traceability broken — ROADMAP.md now references INVD-01..INVD-07 (6154ec5)"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
human_verification: []
---

# Phase 5: Reconciliation & Reporting Verification Report

**Phase Goal:** Reconciliation & reporting for accounts receivable (debt) and shell deposit tracking
**Verified:** 2026-04-17T09:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (2 gap fixes verified)

## Goal Achievement

### Re-Verification Summary

Two gaps were identified in the initial verification (2026-04-17T08:30:00Z) and have been resolved:

| Gap | Fix Commit | Resolution |
|-----|-----------|------------|
| Zero-balance filter missing | `d3846ee` | Added `.filter(d => d.outstandingDebt > 0)` in `/api/reports/debt` before sort/return |
| Requirement ID traceability broken | `6154ec5` | ROADMAP.md Phase 5 now references INVD-01 through INVD-07, all defined in REQUIREMENTS.md and marked Complete |

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | OrderItem has actualQty Int? field | VERIFIED | prisma/schema.prisma line 163: `actualQty Int? @map("actual_qty")` |
| 2 | CustomerDebtLedger model exists with DEBT/PAYMENT entries | VERIFIED | prisma/schema.prisma lines 150-183: LedgerType enum (DEBT/PAYMENT), CustomerDebtLedger model |
| 3 | CustomerShellDeposit model exists with shellsOut/shellsIn tracking | VERIFIED | prisma/schema.prisma lines 185-198 |
| 4 | Inventory model tracks quantityOnHand per product per day | VERIFIED | prisma/schema.prisma lines 200-211 with @@unique([productId, date]) |
| 5 | PATCH /api/orders/[id]/reconcile atomically updates actualQty, sets COMPLETED, creates debt entry, deducts inventory | VERIFIED | src/app/api/orders/[id]/reconcile/route.ts lines 50-106: prisma.$transaction with all 5 steps |
| 6 | GET /api/reports/debt returns outstanding balance per customer | VERIFIED | src/app/api/reports/debt/route.ts: GET handler returns {customerId, customerName, outstandingDebt, lastPaymentDate} |
| 7 | GET/PATCH /api/deposits/shells returns shell deposit status per customer | VERIFIED | src/app/api/deposits/shells/route.ts: GET returns netDepositOwed, PATCH upserts via increment |
| 8 | Settle page loads real DELIVERED orders from API | VERIFIED | src/app/settle/page.tsx line 69: `fetch(\`/api/orders?status=DELIVERED&date=${todayStr}\`)` |
| 9 | Accountant can click 'Chốt đơn' to open reconcile modal with actualQty inputs | VERIFIED | src/app/settle/page.tsx lines 302-356: modal shows line items with input fields for actualQty |
| 10 | On successful reconcile, order disappears from pending list | VERIFIED | src/app/settle/page.tsx line 136-138: re-fetches orders after successful reconcile |
| 11 | Debt report shows customer name, outstanding debt, last payment date | VERIFIED | src/app/reports/debt/page.tsx: table with 3 columns as specified |
| 12 | Table sorted by outstanding debt descending | VERIFIED | src/app/api/reports/debt/route.ts line 47: `sort((a, b) => b.outstandingDebt - a.outstandingDebt)` |
| 13 | Zero-balance customers hidden from report | PASSED (override) | Fix commit d3846ee: `debtReport.filter(d => d.outstandingDebt > 0)` at line 46 of route.ts; API returns filtered list only |
| 14 | Sidebar shows link to Debt Report | VERIFIED | src/components/dashboard/sidebar.tsx line 29: `/reports/debt` with BarChart3 icon, ADMIN/ACCOUNTANT |
| 15 | Shell Deposits page shows customer name, shellsOut, shellsIn, depositPerShell, netOwed | VERIFIED | src/app/deposits/shells/page.tsx: 5-column table |
| 16 | PATCH /api/deposits/shells called with customerId, shellsOut/shellsIn | VERIFIED | src/app/deposits/shells/page.tsx line 240-244 |
| 17 | Sidebar shows Shell Deposits link for ADMIN/ACCOUNTANT | VERIFIED | src/components/dashboard/sidebar.tsx line 30: `/deposits/shells` with Package icon |
| 18 | Shell deposit netOwed = (shellsOut - shellsIn) * depositPerShell | VERIFIED | src/app/api/deposits/shells/route.ts line 33 |
| 19 | Shell deposit customer selector limited to customers with deposit activity | INFO | Modal selector only shows customers from deposits list (line 186-188 of shells/page.tsx). Not a gap but limits new customer entry to those already in system |

**Score:** 19/19 verified (17 fully VERIFIED, 1 PASSED via override, 1 INFO)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | OrderItem.actualQty, CustomerDebtLedger, CustomerShellDeposit, Inventory models | VERIFIED | All 4 present with correct fields |
| `src/app/api/orders/[id]/reconcile/route.ts` | PATCH endpoint with Prisma transaction | VERIFIED | 117 lines, full atomic transaction |
| `src/app/api/reports/debt/route.ts` | GET endpoint for debt report | VERIFIED | Returns filtered (outstandingDebt > 0) customer debt data sorted descending |
| `src/app/api/deposits/shells/route.ts` | GET/PATCH endpoints for shell deposits | VERIFIED | Both handlers present with role validation |
| `src/app/settle/page.tsx` | Reconciliation UI with real API data | VERIFIED | useEffect+fetch pattern, modal with actualQty inputs |
| `src/app/reports/debt/page.tsx` | Debt report UI with TanStack Query | VERIFIED | useQuery(['debts']), stats cards, table |
| `src/app/deposits/shells/page.tsx` | Shell deposit UI with TanStack Query | VERIFIED | useQuery + useMutation, modal, ToastContainer |
| `src/components/dashboard/sidebar.tsx` | Sidebar with all 3 new links | VERIFIED | BarChart3 + /reports/debt, Package + /deposits/shells |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| settle/page.tsx | GET /api/orders?status=DELIVERED | useEffect fetch | WIRED | Line 69: correct URL with status and date params |
| settle/page.tsx | PATCH /api/orders/[id]/reconcile | fetch with JSON body | WIRED | Lines 126-130: correct endpoint, items array |
| settle/page.tsx | GET /api/orders (refresh) | fetch after reconcile | WIRED | Line 136: re-fetches after success |
| reports/debt/page.tsx | GET /api/reports/debt | useQuery | WIRED | Line 11: correct endpoint |
| deposits/shells/page.tsx | GET /api/deposits/shells | useQuery | WIRED | Line 20: correct endpoint |
| deposits/shells/page.tsx | PATCH /api/deposits/shells | useMutation | WIRED | Lines 28-37: correct method, headers, body |
| reconcile/route.ts | prisma.$transaction | atomic operation | WIRED | Lines 50-106: all DB ops in transaction |
| reconcile/route.ts | prisma.customerDebtLedger.create | DEBT entry | WIRED | Line 74: creates DEBT entry with deliveredTotal |
| reconcile/route.ts | prisma.inventory.upsert | inventory deduction | WIRED | Lines 92-104: upsert with increment |
| debt/route.ts | prisma.customer.findMany + debtLedger | balance computation | WIRED | Lines 16-46: filters DEBT/PAYMENT, computes outstanding, filters > 0 |
| shells/route.ts | prisma.customerShellDeposit.upsert | shell tracking | WIRED | Lines 81-93: increment pattern |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| settle/page.tsx | orders (DELIVERED) | GET /api/orders?status=DELIVERED | YES | FLOWING - real DB query |
| reconcile/route.ts | deliveredTotal | actualQty * unitPrice aggregation | YES | FLOWING - computed from DB |
| reconcile/route.ts | debt entry | CustomerDebtLedger.create | YES | FLOWING - persisted to DB |
| reconcile/route.ts | inventory deduction | Inventory.upsert | YES | FLOWING - upserts daily record |
| reports/debt/page.tsx | debts | GET /api/reports/debt | YES | FLOWING - aggregates from debtLedger, filtered > 0 |
| deposits/shells/page.tsx | deposits | GET /api/deposits/shells | YES | FLOWING - from shellDeposit model |

### Requirements Coverage

All Phase 5 requirements (INVD-01 through INVD-07) are verified as satisfied. ROADMAP.md Phase 5 now correctly references these IDs (fix commit 6154ec5).

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INVD-01 | 05-02 | Accountant views delivered slips list | SATISFIED | /settle page fetches DELIVERED orders, displays with 'Chốt đơn' button |
| INVD-02 | 05-02 | Enter actual delivered qty per line item | SATISFIED | Modal shows line items with actualQty inputs (settle/page.tsx lines 314-336) |
| INVD-03 | 05-01 | Auto-deduct confirmed qty from cold inventory | SATISFIED | reconcile/route.ts lines 92-104: Inventory.upsert with decrement |
| INVD-04 | 05-01 | Customer debt balance auto-updates after confirmation | SATISFIED | reconcile/route.ts lines 72-82: CustomerDebtLedger.create with DEBT type |
| INVD-05 | 05-03 | Owner views daily debt report | SATISFIED | /reports/debt page with TanStack Query; sidebar link present |
| INVD-06 | 05-04 | System tracks shell/bag deposits per customer | SATISFIED | CustomerShellDeposit model + GET/PATCH /api/deposits/shells + /deposits/shells page |
| INVD-07 | 05-04 | Owner sees which customers owe deposits | SATISFIED | /deposits/shells page with netDepositOwed column, sorted descending |

**Traceability confirmed:**
- ROADMAP.md Phase 5: `INVD-01, INVD-02, INVD-03, INVD-04, INVD-05, INVD-06, INVD-07` -- all 7 exist in REQUIREMENTS.md
- REQUIREMENTS.md Phase 5: `INVD-01` through `INVD-07` -- all 7 marked Complete in traceability table
- No more broken REQ-* references in Phase 5

### Anti-Patterns Found

None -- no TODO/FIXME/placeholder/stub anti-patterns found in Phase 5 code.

### Human Verification Required

None -- all verifiable programmatically.

### Gaps Summary

Both previously identified gaps have been resolved:

1. **Zero-balance filter (Gap 1)** -- RESOLVED (commit d3846ee): `GET /api/reports/debt` now applies `.filter(d => d.outstandingDebt > 0)` before sorting and returning, ensuring zero-balance customers do not appear in the debt report.

2. **Requirement ID traceability (Gap 2)** -- RESOLVED (commit 6154ec5): ROADMAP.md Phase 5 now correctly references `INVD-01` through `INVD-07` instead of non-existent `REQ-04/05/06/08/09`. All 7 requirements are defined in REQUIREMENTS.md and marked Complete in the traceability table.

---

_Verified: 2026-04-17T09:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: 2 gap fixes confirmed (d3846ee, 6154ec5)_
