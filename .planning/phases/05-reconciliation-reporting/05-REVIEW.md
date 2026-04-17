---
phase: 05-reconciliation-reporting
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - prisma/schema.prisma
  - src/app/api/deposits/shells/route.ts
  - src/app/api/orders/[id]/reconcile/route.ts
  - src/app/api/orders/route.ts
  - src/app/api/reports/debt/route.ts
  - src/app/deposits/shells/page.tsx
  - src/app/reports/debt/page.tsx
  - src/app/settle/page.tsx
  - src/components/dashboard/sidebar.tsx
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 5 adds reconciliation and reporting functionality for orders, deposits, and debt tracking. Two critical security issues were found: the orders list endpoint lacks authentication, and the shell deposit PATCH endpoint lacks authentication. Several type safety issues and one data inconsistency in the reconcile flow also need attention.

## Critical Issues

### CR-01: Missing authentication on orders list endpoint

**File:** `src/app/api/orders/route.ts:6`
**Issue:** The GET handler has no session check. Any unauthenticated request can list all orders with customer details, product info, and pricing — a significant data exposure risk.
**Fix:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... rest of handler
```

### CR-02: Missing authentication on shell deposit PATCH endpoint

**File:** `src/app/api/deposits/shells/route.ts:57`
**Issue:** The PATCH handler (line 57-104) has no session authentication. Any authenticated or unauthenticated request can modify shell deposit records for any customer, enabling unauthorized data manipulation.
**Fix:**
```typescript
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // ... rest of handler
```

## Warnings

### WR-01: Type mismatch in settle page order mapping

**File:** `src/app/settle/page.tsx:96`
**Issue:** The `OrderFromAPI` interface defines `total: unknown`. At line 96, `typeof order.total === 'number'` is evaluated at runtime since `order.total` is typed as `unknown`. This relies on JavaScript runtime type coercion which is fragile.
**Fix:**
```typescript
// Use explicit number conversion with fallback
total: typeof order.total === 'number' ? order.total : Number(order.total) || 0,
// Consider also adding NaN check
```

### WR-02: Missing `code` field in orders API response

**File:** `src/app/settle/page.tsx:91`
**Issue:** The settle page maps `order.code` (line 91) but the orders API response does not include a `code` field. The fallback `DH-${order.id.slice(-6).toUpperCase()}` masks this gap. The schema confirms orders have no `code` field — only `id`. This is a display inconsistency worth noting but not a functional bug due to the fallback.

### WR-03: Shell deposit customer dropdown limits new transactions

**File:** `src/app/deposits/shells/page.tsx:186-188`
**Issue:** The customer dropdown only shows customers who already have deposit activity (from `deposits` query). A customer with zero deposit history cannot be selected for their first transaction.
**Fix:**
Either fetch and display all active customers in the dropdown, or show a search/select input that queries the customer list.

### WR-04: Invalid date query param not passed in settle page

**File:** `src/app/settle/page.tsx:69`
**Issue:** The fetch includes `status=DELIVERED` but not the `date` parameter, even though `todayStr` is computed at line 64. The order list will return all DELIVERED orders across all dates, not just today.
**Fix:**
```typescript
const res = await fetch(`/api/orders?status=DELIVERED&date=${todayStr}`);
```

### WR-05: Reconciliation uses order snapshot outside transaction

**File:** `src/app/api/orders/[id]/reconcile/route.ts:66-69`
**Issue:** Within the `$transaction` block (line 50), `order.orderItems` is accessed directly instead of being queried within the transaction. While this works if no concurrent modifications occur, it breaks the atomicity guarantee. A concurrent reconciliation on the same order could cause inconsistencies.
**Fix:**
Query order items within the transaction context or pass them as part of the transaction scope.

## Info

### IN-01: Redundant session auth middleware pattern

**File:** `src/app/api/orders/route.ts` (GET handler)
**Issue:** No session auth middleware. While this is noted as CR-01, the pattern is inconsistent — other endpoints like `reports/debt/route.ts` and `deposits/shells/route.ts` all check session. This creates an inconsistent API security posture.

### IN-02: Sort mutates source array

**File:** `src/app/api/reports/debt/route.ts:47`
**Issue:** `filtered.sort(...)` mutates the `filtered` array in place rather than using a non-mutating sort. In a server context with concurrent requests, mutation-based sorting could cause subtle race conditions if the same array reference were shared. Low risk in current implementation but considered poor practice.
**Fix:**
```typescript
const sorted = [...filtered].sort((a, b) => b.outstandingDebt - a.outstandingDebt);
return NextResponse.json(sorted);
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_