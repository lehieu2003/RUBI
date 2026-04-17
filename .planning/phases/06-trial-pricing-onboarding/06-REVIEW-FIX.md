---
phase: 06-trial-pricing-onboarding
fixed_at: 2026-04-17T00:00:00Z
review_path: .planning/phases/06-trial-pricing-onboarding/06-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 5
skipped: 2
status: partial
---
# Phase 6: Code Review Fix Report

**Fixed at:** 2026-04-17T00:00:00Z
**Source review:** .planning/phases/06-trial-pricing-onboarding/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 critical, 6 warnings)
- Fixed: 5
- Skipped: 2

## Fixed Issues

### CR-01: CancelSubscriptionFlow fetches data using wrong URL parameters

**Files modified:** `src/components/billing/CancelSubscriptionFlow.tsx`, `src/app/api/customers/debt-export/route.ts`
**Commit:** 9046c86
**Applied fix:** Replaced malformed `/api/customers?factoryId=XXX` and `/api/orders?factoryId=XXX&months=6` calls with a new dedicated `/api/customers/debt-export` endpoint that returns customers with their debtLedger and shellDeposit, plus recent orders (last 6 months) for Excel export.

### WR-02: `/api/billing/subscription` GET lacks role authorization

**Files modified:** `src/app/api/billing/subscription/route.ts`
**Commit:** 3a9fd45
**Applied fix:** Added ADMIN role check before returning subscription and driver count data, consistent with other billing-related endpoints.

### WR-04: Middleware fails open on subscription check error

**Files modified:** `src/middleware.ts`
**Commit:** f897cb1
**Applied fix:** Replaced silent fail-open with logged 503 response (`CHECK_FAILED`) to reject write operations when subscription status cannot be verified.

### WR-05: PATCH allows `pricePerDriver` to be set to zero

**Files modified:** `src/app/api/subscriptions/[id]/route.ts`
**Commit:** b370ed9
**Applied fix:** Changed validation from `> 0` to `>= 1000` to enforce a minimum 1,000 VND pricing threshold.

## Skipped Issues

### WR-01: `/api/subscriptions/[id]` GET lacks authorization check

**File:** `src/app/api/subscriptions/[id]/route.ts:15-18`
**Reason:** Code context differs from review — ownership check is already present in the current code:
```typescript
if (!subscription || subscription.factoryId !== session.factoryId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```
**Original issue:** Reviewer noted missing ownership check, but current code already has it.

### WR-03: `/api/drivers` GET returns count without factory scoping

**File:** `src/app/api/drivers/route.ts:21`
**Reason:** Code context differs from review — the Driver model in `prisma/schema.prisma` does not have a `factoryId` field, so factory-scoped filtering is not possible without a schema migration. Cannot fix without database schema change.
**Original issue:** Reviewer noted driver count is not factory-scoped, but the Driver model lacks factoryId column entirely.

---

_Fixed: 2026-04-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
