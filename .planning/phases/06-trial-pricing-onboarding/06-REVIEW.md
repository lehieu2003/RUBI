---
phase: 06-trial-pricing-onboarding
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - prisma/schema.prisma
  - src/app/(auth)/register/page.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/api/auth/me/route.ts
  - src/app/api/auth/register/route.ts
  - src/app/api/billing/subscription/route.ts
  - src/app/api/customers/import/route.ts
  - src/app/api/customers/route.ts
  - src/app/api/drivers/route.ts
  - src/app/api/payments/confirm/route.ts
  - src/app/api/subscriptions/[id]/route.ts
  - src/app/api/subscriptions/cancel/route.ts
  - src/app/dashboard/page.tsx
  - src/app/onboarding/page.tsx
  - src/app/settings/billing/page.tsx
  - src/components/billing/CancelSubscriptionFlow.tsx
  - src/components/billing/PaymentRecorder.tsx
  - src/components/billing/PricingDisplay.tsx
  - src/components/billing/VietQRCode.tsx
  - src/components/dashboard/dashboard-client.tsx
  - src/components/layout/AppShell.tsx
  - src/components/trial/TrialBanner.tsx
  - src/components/trial/TrialWarningModal.tsx
  - src/lib/auth-provider.tsx
  - src/lib/auth.ts
  - src/lib/export-excel.ts
  - src/lib/subscription-status.ts
  - src/middleware.ts
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---
# Phase 6: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Reviewed all Phase 6 (trial-pricing-onboarding) files for bugs, security issues, and code quality problems. Found 1 critical issue, 6 warnings, and 3 informational items.

The most serious issue is in `CancelSubscriptionFlow.tsx` where customer/order data is fetched using malformed URL query parameters that do not match the actual API endpoints, causing the export to always silently fail. There are also several authorization gaps in API routes and potential data inconsistency issues in subscription handling.

## Critical Issues

### CR-01: CancelSubscriptionFlow fetches data using wrong URL parameters

**File:** `src/components/billing/CancelSubscriptionFlow.tsx:23-29`
**Issue:** The export fetches customer and order data using query parameters that the respective API routes do not accept. The `/api/customers` route does not accept a `factoryId` query parameter, and `/api/orders` endpoint was not even provided in the phase 6 changes. This means the Excel export will always receive `undefined` data and proceed to export an empty file.

```typescript
// Lines 23-29 - WRONG URL parameters
const [customersRes, ordersRes] = await Promise.all([
  fetch(`/api/customers?factoryId=${factoryId}`),  // /api/customers does NOT accept factoryId
  fetch(`/api/orders?factoryId=${factoryId}&months=6`),  // /api/orders endpoint does not exist in phase 6
]);

const { customers } = await customersRes.json();  // customers will be undefined
const { orders } = await ordersRes.json();  // orders will be undefined
```

**Fix:**
The export should use the correct API endpoints. Looking at the existing endpoints:
- `/api/customers` (GET) returns all customers filtered by `isActive: true` - no factoryId needed
- There is no `/api/orders` endpoint in phase 6

If the intent is to export customer debt data, the backend needs either a dedicated export endpoint or the existing endpoints need to accept factory-scoped parameters:

```typescript
// Option: Fetch customers from the correct endpoint
const customersRes = await fetch('/api/customers');
const { customers } = await customersRes.json();

// Option: Create a new /api/customers/debt-export endpoint that accepts factoryId
```

---

## Warnings

### WR-01: `/api/subscriptions/[id]` GET lacks authorization check

**File:** `src/app/api/subscriptions/[id]/route.ts:7-24`
**Issue:** The GET handler does not verify that the subscription belongs to the current factory. Any authenticated user can fetch any subscription by ID if they know the ID.

```typescript
// Line 15-18 - No ownership check before returning subscription
const subscription = await prisma.subscription.findUnique({
  where: { id },
});
// Missing: if (!subscription || subscription.factoryId !== session.factoryId) return 404
```

**Fix:**
Add ownership verification before returning the subscription, consistent with the PATCH handler:

```typescript
const subscription = await prisma.subscription.findUnique({
  where: { id },
});

if (!subscription || subscription.factoryId !== session.factoryId) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### WR-02: `/api/billing/subscription` GET lacks role authorization

**File:** `src/app/api/billing/subscription/route.ts:7-30`
**Issue:** The endpoint returns subscription and driver count data for any authenticated user without checking if they are an ADMIN. Any staff member in the factory can see billing details.

```typescript
// Line 9-12 - Only checks if session exists, not role
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Missing: role check for ADMIN
```

**Fix:**
Add role verification consistent with other billing-related endpoints:

```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (session.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### WR-03: `/api/drivers` GET returns count without factory scoping

**File:** `src/app/api/drivers/route.ts:21`
**Issue:** When called with `?active=true` (billing use case), the endpoint counts ALL active drivers across all factories, not just the current factory's drivers. This is a data leak in a multi-tenant scenario.

```typescript
// Line 21 - Counts ALL drivers, not factory-scoped
const driverCount = await prisma.driver.count({
  where: { isActive: true },
  // Missing: where factoryId = session.factoryId
});
```

**Fix:**
Add factory filtering to the driver count query:

```typescript
const driverCount = await prisma.driver.count({
  where: { 
    isActive: true,
    // Add factory scoping if drivers are factory-associated
    // OR ensure the drivers table has a factoryId column
  },
});
```

### WR-04: Middleware fails open on subscription check error

**File:** `src/middleware.ts:97-99`
**Issue:** If the database call to `getFactorySubscription()` throws, the middleware silently catches the error and allows the request to proceed. This could allow writes when subscription check should have blocked them.

```typescript
// Lines 97-99
} catch {
  // Fail open on DB errors
}
```

**Fix:**
Fail closed instead - reject write operations if subscription status cannot be verified:

```typescript
} catch {
  // Fail closed: reject write if subscription check fails
  return NextResponse.json(
    { error: 'Unable to verify subscription status', code: 'CHECK_FAILED' },
    { status: 503 }
  );
}
```

### WR-05: PATCH `/api/subscriptions/[id]` allows pricePerDriver to be zero

**File:** `src/app/api/subscriptions/[id]/route.ts:54`
**Issue:** The validation allows `pricePerDriver` to be set to 0, which seems unintentional for a pricing field.

```typescript
// Line 54 - Allows zero
if (typeof body.pricePerDriver === 'number' && body.pricePerDriver > 0) {
```

**Fix:**
Add minimum value validation:

```typescript
if (typeof body.pricePerDriver === 'number' && body.pricePerDriver >= 1000) {
  // Minimum 1,000 VND per driver
```

### WR-06: Subscription status never transitions to EXPIRED

**File:** `src/lib/subscription-status.ts:15-21`
**Issue:** The schema defines an `EXPIRED` subscription status, and the middleware checks for `sub.status === 'EXPIRED'`, but nothing in the codebase ever sets a subscription to `EXPIRED`. The `isSubscriptionActive()` function checks `new Date() > sub.endDate` for TRIAL plans, but the status remains `ACTIVE`. This means the `EXPIRED` status is dead code and the middleware's `EXPIRED` check is unreachable.

**Fix:**
Add a mechanism to transition subscriptions to EXPIRED status. This could be:
1. A cron job/background process that runs daily
2. A check in `isSubscriptionActive()` that sets the status before returning
3. A database trigger

---

## Info

### IN-01: Magic numbers in subscription-status.ts

**File:** `src/lib/subscription-status.ts:31-34`
**Issue:** The 3-day warning period is hardcoded. This value may need to be configurable.

```typescript
// Line 34
return days <= 3 && days > 0;
```

**Fix:**
Extract to a constant or environment variable:

```typescript
const WARNING_DAYS_THRESHOLD = parseInt(process.env.TRIAL_WARNING_DAYS || '3');
return days <= WARNING_DAYS_THRESHOLD && days > 0;
```

### IN-02: Hardcoded bank account in VietQRCode component

**File:** `src/components/billing/VietQRCode.tsx:30`
**Issue:** The Vietcombank account number `1234567890` is hardcoded. This should come from environment variables for production.

```typescript
// Line 30
<span className="font-medium font-mono">1234567890</span>
```

**Fix:**
Use environment variable:

```typescript
<span className="font-medium font-mono">{process.env.NEXT_PUBLIC_BANK_ACCOUNT || '1234567890'}</span>
```

### IN-03: Hardcoded JWT secret fallback in auth.ts

**File:** `src/lib/auth.ts:4-6`
**Issue:** The JWT secret has a fallback value that would be insecure in production if the environment variable is not set.

```typescript
// Lines 4-6
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'iceflow-secret-key-change-in-production'
);
```

**Fix:**
Throw an error in production if the secret is not configured:

```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
export const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_