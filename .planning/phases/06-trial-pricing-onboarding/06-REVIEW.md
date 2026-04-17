---
phase: 06
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - prisma/schema.prisma
  - src/app/api/auth/register/route.ts
  - src/lib/subscription-status.ts
  - src/app/(auth)/register/page.tsx
  - src/components/trial/TrialBanner.tsx
  - src/components/trial/TrialWarningModal.tsx
  - src/middleware.ts
  - src/app/settings/page.tsx
  - src/app/settings/billing/page.tsx
  - src/app/onboarding/page.tsx
  - src/components/billing/PricingDisplay.tsx
  - src/components/billing/VietQRCode.tsx
  - src/components/billing/PaymentRecorder.tsx
  - src/app/api/payments/confirm/route.ts
  - src/app/api/customers/import/route.ts
  - src/app/api/drivers/route.ts
  - src/lib/auth.ts
  - src/components/billing/CancelSubscriptionFlow.tsx
  - src/lib/export-excel.ts
  - src/app/api/subscriptions/cancel/route.ts
  - src/app/api/subscriptions/[id]/route.ts
  - src/app/api/auth/me/route.ts
  - src/lib/auth-provider.tsx
  - src/components/layout/AppShell.tsx
  - src/app/(auth)/login/page.tsx
  - src/app/dashboard/page.tsx
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-17
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Reviewed all 27 Phase 06 source files (trial-pricing-onboarding). Found 1 critical payment validation gap, 5 warnings including hardcoded bank details and settings calling non-existent API endpoints, and 3 informational items.

The codebase is generally well-structured with proper auth checks on API routes. However, the CancelSubscriptionFlow component fetches from a non-existent `/api/customers/debt-export` endpoint, the payment confirmation endpoint accepts any amount without validating against expected cost, and the settings page references `/api/staff` endpoints that do not exist.

## Critical Issues

### CR-01: Payment amount not validated server-side

**File:** `src/app/api/payments/confirm/route.ts:18-33`
**Issue:** The `/api/payments/confirm` endpoint accepts any positive amount without verifying it matches the expected subscription cost. A user could confirm a payment of 1000 VND instead of the expected 300,000+ VND and the system would accept it, updating the subscription to PAID status.

```typescript
// Line 18-19: amount validated as positive number only
if (!subscriptionId || typeof amount !== 'number' || amount <= 0) {
  return NextResponse.json({ error: 'Invalid input: subscriptionId and positive amount required' }, { status: 400 });
}

// Lines 24-33: subscription ownership verified but amount NOT validated against expected cost
const subscription = await prisma.subscription.findUnique({
  where: { id: subscriptionId },
});
if (!subscription) {
  return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
}
if (subscription.factoryId !== factoryId) {
  return NextResponse.json({ error: 'Subscription does not belong to your factory' }, { status: 403 });
}
// MISSING: validation that amount === (driverCount - 1) * pricePerDriver

// Lines 35-43: subscription updated regardless of amount paid
const updatedSubscription = await prisma.subscription.update({
  where: { id: subscriptionId },
  data: {
    planType: 'PAID',
    status: 'ACTIVE',
    endDate: newEndDate,
  },
});
```

**Fix:** Add server-side validation of the paid amount against expected cost:
```typescript
const pricePerDriver = Number(subscription.pricePerDriver) || 150000;
const expectedAmount = Math.max(0, subscription.driverCount - 1) * pricePerDriver;
if (amount < expectedAmount) {
  return NextResponse.json(
    { error: 'Amount paid is less than expected', expected: expectedAmount },
    { status: 400 }
  );
}
```

---

## Warnings

### WR-01: CancelSubscriptionFlow calls non-existent export endpoint

**File:** `src/components/billing/CancelSubscriptionFlow.tsx:22-34`
**Issue:** The cancel flow fetches customer debt data from `/api/customers/debt-export` (line 23), but this endpoint does not exist in the Phase 06 file list. The export will always fail silently, causing `customers` to be undefined and the Excel file to contain no data.

```typescript
// Line 22-29: Fetches from non-existent endpoint
const exportRes = await fetch('/api/customers/debt-export');
if (!exportRes.ok) {
  throw new Error('Failed to fetch export data');
}
const { customers, orders } = await exportRes.json();
// customers will be undefined if endpoint doesn't exist or returns different shape

// Lines 32-34: Proceeds to export even with undefined data
if (customers) {
  exportCustomerDebtExcel(customers, orders || []);
}
```

**Fix:** Either implement the `/api/customers/debt-export` endpoint, or use existing endpoints:
```typescript
// Option: Use existing /api/customers endpoint
const customersRes = await fetch('/api/customers');
const { customers } = await customersRes.json();
```

### WR-02: Settings page calls non-existent API endpoints

**File:** `src/app/settings/page.tsx:62,433-437,484-495`
**Issue:** The settings page makes API calls to `/api/staff` and `/api/staff/:id` which are not in the Phase 06 file list and do not appear to exist in the codebase. All staff management operations (list, create, update password, toggle active) will result in 404 errors.

```typescript
// Line 62: GET /api/staff - endpoint does not exist
const res = await fetch('/api/staff');
const data = await res.json();
if (data.users) setStaffUsers(data.users);

// Lines 433-437: POST /api/staff - endpoint does not exist
await fetch('/api/staff', { method: 'POST', ... });

// Lines 484-495: PATCH /api/staff/:id - endpoint does not exist
await fetch(`/api/staff/${showPasswordModal}`, { method: 'PATCH', ... });
```

**Fix:** Either implement the `/api/staff` endpoints or remove staff management UI until those endpoints are built.

### WR-03: Hardcoded bank account details

**File:** `src/components/billing/VietQRCode.tsx:26-34`
**Issue:** Bank account number, account name, and bank name are hardcoded. If any of these change, a code deployment is required.

```typescript
// Lines 26-34: All hardcoded
<span className="font-medium">Vietcombank</span>
<span className="font-medium font-mono">1234567890</span>
<span className="font-medium">CTY TNHH ICEFLOW</span>
```

**Fix:** Move to environment variables:
```typescript
const BANK_NAME = process.env.NEXT_PUBLIC_VIETQR_BANK_NAME || 'Vietcombank';
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_VIETQR_BANK_ACCOUNT || '1234567890';
const ACCOUNT_NAME = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || 'CTY TNHH ICEFLOW';
```

### WR-04: PaymentRecorder uses hardcoded pricePerDriver

**File:** `src/components/billing/PaymentRecorder.tsx:24`
**Issue:** The expected amount calculation uses hardcoded `150000` instead of reading from the subscription's `pricePerDriver` field. If the price is changed in the subscription record, this component shows an incorrect expected amount, and the server also doesn't validate against the actual price.

```typescript
// Line 24: hardcoded, ignores subscription.pricePerDriver
const expectedAmount = Math.max(0, driverCount - 1) * 150000;
```

**Fix:** Use the subscription's pricePerDriver:
```typescript
const pricePerDriver = Number(subscription.pricePerDriver) || 150000;
const expectedAmount = Math.max(0, driverCount - 1) * pricePerDriver;
```

### WR-05: pricePerDriver allows values below 1000 VND

**File:** `src/app/api/subscriptions/[id]/route.ts:54`
**Issue:** The PATCH endpoint allows `pricePerDriver` to be set to any value >= 0, including 1-999 VND which is below the stated minimum of 1000 VND.

```typescript
// Line 54: Allows zero
if (typeof body.pricePerDriver === 'number' && body.pricePerDriver >= 0) {
  updates.pricePerDriver = body.pricePerDriver;
}
```

**Fix:** Require minimum 1000 VND:
```typescript
if (typeof body.pricePerDriver === 'number' && body.pricePerDriver >= 1000) {
  updates.pricePerDriver = body.pricePerDriver;
}
```

---

## Info

### IN-01: JWT_SECRET fallback insecure for production

**File:** `src/lib/auth.ts:4-6`
**Issue:** The JWT secret defaults to `'iceflow-secret-key-change-in-production'` if the environment variable is not set. If this code runs in production without JWT_SECRET configured, all JWTs are signed with a well-known secret.

```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'iceflow-secret-key-change-in-production'
);
```

**Fix:** Fail closed in production:
```typescript
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-only'
);
```

### IN-02: Magic number for warning period

**File:** `src/lib/subscription-status.ts:34`
**Issue:** The 3-day warning threshold is hardcoded as a magic number.

```typescript
return days <= 3 && days > 0;
```

**Fix:** Extract to named constant:
```typescript
const WARNING_DAYS_THRESHOLD = 3;
return days <= WARNING_DAYS_THRESHOLD && days > 0;
```

### IN-03: Driver slug collision potential

**File:** `src/app/api/drivers/route.ts:59`
**Issue:** Slug generation uses only name + millisecond timestamp. Two drivers with the same name created in the same millisecond will have colliding slugs, causing a 500 error from Prisma's unique constraint.

```typescript
const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
```

**Fix:** Use UUID for slug or handle unique constraint error gracefully:
```typescript
const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
```

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_