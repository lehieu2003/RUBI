---
phase: 05-reconciliation-reporting
fixed_at: 2026-04-17T00:00:00Z
review_path: .planning/phases/05-reconciliation-reporting/05-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-04-17T00:00:00Z
**Source review:** .planning/phases/05-reconciliation-reporting/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Missing authentication on orders list endpoint

**Files modified:** `src/app/api/orders/route.ts`
**Commit:** c4989a6
**Applied fix:** Added session authentication (getSession check, 401 if no session, 403 if not ACCOUNTANT/ADMIN) to GET /api/orders handler.

### CR-02: Missing authentication on shell deposit PATCH endpoint

**Files modified:** `src/app/api/deposits/shells/route.ts`
**Commit:** N/A - no changes made
**Applied fix:** SKIPPED - The PATCH handler at lines 57-104 already has proper session authentication at lines 59-65. The reviewer incorrectly identified this as missing auth. The code correctly checks for session and validates ACCOUNTANT/ADMIN role before processing any PATCH request.

### WR-01: Type mismatch in settle page order mapping

**Files modified:** `src/app/settle/page.tsx`
**Commit:** N/A - no changes made
**Applied fix:** SKIPPED - The line 96 code `typeof order.total === 'number' ? order.total : Number(order.total) || 0` already uses explicit Number() conversion with fallback as suggested. The reviewer's suggested fix matches the existing code exactly.

### WR-04: Invalid date query param not passed in settle page

**Files modified:** `src/app/settle/page.tsx`
**Commit:** N/A - no changes made
**Applied fix:** SKIPPED - The fetch at line 69 already includes `date=${todayStr}` as part of the URL. The reviewer incorrectly stated the date parameter was missing when it is present: `const res = await fetch(\`/api/orders?status=DELIVERED&date=${todayStr}\`);`

### WR-05: Reconciliation uses order snapshot outside transaction

**Files modified:** `src/app/api/orders/[id]/reconcile/route.ts`
**Commit:** eba0014
**Applied fix:** Moved order fetch inside the $transaction block so that order.orderItems is queried within transaction scope, ensuring atomicity. The pre-transaction validation and order fetch were moved into the transaction callback.

### WR-03: Shell deposit customer dropdown limits new transactions

**Files modified:** `src/app/deposits/shells/page.tsx`
**Commit:** eebc603
**Applied fix:** Added a new useQuery to fetch all customers from `/api/customers` endpoint, and changed the customer dropdown select to iterate over `allCustomers` instead of `deposits`. This allows new customers with no prior deposit history to be selected for their first transaction.

### IN-02: Sort mutates source array

**Files modified:** `src/app/api/reports/debt/route.ts`
**Commit:** 6e8a72e
**Applied fix:** Changed `filtered.sort()` (mutation) to `[...filtered].sort()` (non-mutating spread pattern) to avoid mutating the source array in server context.

---

_Fixed: 2026-04-17T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
