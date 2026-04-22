# Phase 8: API Route Hardening + Subscription Enforcement - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 26 API routes
**Analogs found:** 14 / 17 files matched

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/api/orders/route.ts` | route | CRUD (read-heavy) | `src/app/api/customers/route.ts` | role-match |
| `src/app/api/customers/route.ts` GET | route | CRUD (read-heavy) | `src/app/api/drivers/route.ts` GET | exact |
| `src/app/api/drivers/route.ts` GET | route | CRUD (read-heavy) | `src/app/api/customers/route.ts` GET | exact |
| `src/app/api/subscriptions/[id]/route.ts` GET | route | request-response | `src/app/api/customers/route.ts` GET | role-match |
| `src/app/api/factory/onboarding/route.ts` GET | route | request-response | `src/app/api/customers/route.ts` GET | role-match |
| `src/app/api/orders/[id]/reconcile/route.ts` PATCH | route | request-response | `src/app/api/orders/[id]/status/route.ts` | exact |
| `src/app/api/orders/[id]/status/route.ts` PATCH | route | request-response | `src/app/api/orders/[id]/reconcile/route.ts` | exact |
| `src/app/api/orders/bulk-assign/route.ts` PATCH | route | request-response | `src/app/api/orders/[id]/status/route.ts` | role-match |
| `src/app/api/deposits/shells/route.ts` PATCH | route | request-response | `src/app/api/orders/[id]/status/route.ts` | role-match |
| `src/app/api/prices/customer/override/route.ts` POST/DELETE | route | request-response | `src/app/api/prices/global/route.ts` | exact |
| `src/app/api/prices/global/route.ts` POST | route | request-response | `src/app/api/prices/customer/override/route.ts` | exact |
| `src/app/api/staff/route.ts` POST | route | request-response | `src/app/api/staff/[id]/route.ts` | exact |
| `src/app/api/staff/[id]/route.ts` PATCH/DELETE | route | request-response | `src/app/api/staff/route.ts` | exact |
| `src/app/api/subscriptions/[id]/route.ts` PATCH | route | request-response | `src/app/api/staff/[id]/route.ts` | role-match |
| `src/app/api/subscriptions/cancel/route.ts` POST | route | request-response | `src/app/api/payments/confirm/route.ts` | role-match |
| `src/app/api/factory/onboarding/route.ts` PATCH | route | request-response | `src/app/api/subscriptions/cancel/route.ts` | role-match |
| `src/app/api/payments/confirm/route.ts` | route (bug fix) | request-response | (reference only) | pattern-only |
| `src/lib/vietqr-template.ts` | utility (new) | transform | N/A | no-analog |
| `src/middleware.ts` | middleware | request-response | (reference only) | pattern-only |

---

## Pattern Assignments

### `src/app/api/orders/route.ts` (route, CRUD read-heavy)

**Analog:** `src/app/api/customers/route.ts` (GET uses manual getSession + factoryId check)

**Current pattern** (lines 9-19):
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN' && session.role !== 'STAFF') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Migration target** (from `src/app/api/customers/route.ts` lines 38-41):
```typescript
const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Replace manual getSession + role check with `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])` for GET handler.

---

### `src/app/api/customers/route.ts` GET (route, CRUD read-heavy)

**Analog:** `src/app/api/drivers/route.ts` GET (lines 10-17)

**Current pattern** (lines 11-17):
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Migration target** (from `src/app/api/drivers/route.ts` GET uses same pattern):
Both GET handlers use identical manual getSession pattern. Migrate to `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])` for consistency.

**Action:** Replace manual getSession with `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])` in GET handler.

---

### `src/app/api/drivers/route.ts` GET (route, CRUD read-heavy)

**Analog:** `src/app/api/customers/route.ts` GET

Same pattern as customers/route.ts GET. Migrate to `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])`.

---

### `src/app/api/subscriptions/[id]/route.ts` GET (route, request-response)

**Analog:** `src/app/api/customers/route.ts` GET (manual getSession pattern)

**Current pattern** (lines 7-13):
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Replace with `requireRole(['ADMIN', 'ACCOUNTANT'])` — ACCOUNTANT needs subscription status access per D-12 (billing settings page). Also check Pitfall 1 from RESEARCH.md regarding ADMIN-only restriction on `/api/billing/subscription`.

---

### `src/app/api/factory/onboarding/route.ts` GET (route, request-response)

**Analog:** `src/app/api/customers/route.ts` GET (manual getSession pattern)

**Current pattern** (lines 7-13):
```typescript
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Replace with `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])` for GET handler.

---

### `src/app/api/orders/[id]/reconcile/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/orders/[id]/status/route.ts` PATCH

**Current pattern** (lines 18-22):
```typescript
const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`. Pattern from `src/lib/auth/helpers.ts` lines 35-47:
```typescript
await requireActiveSubscription();
// throws 403 with 'Subscription Required' if inactive
```

---

### `src/app/api/orders/[id]/status/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/orders/[id]/reconcile/route.ts` PATCH

**Current pattern** (lines 21-24):
```typescript
const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/orders/bulk-assign/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/orders/[id]/status/route.ts`

**Issues identified:**
1. Line 45 uses `driver.factoryId` instead of `session.factoryId` — BUG per RESEARCH.md Pitfall 2
2. Has subscription check but uses `isSubscriptionActive()` directly instead of `requireActiveSubscription()` helper

**Current pattern** (lines 17-20, 43-54, 56-67):
```typescript
const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
// ... subscription check at lines 43-54
// ... driver count check at lines 56-67
```

**Actions:**
1. Replace `driver.factoryId` with `session.factoryId` at line 45
2. Add `await requireActiveSubscription()` after `requireRole()` (replaces direct subscription check)
3. Keep driver count check (lines 56-67) as it enforces SUB-03 per-driver pricing limit

---

### `src/app/api/deposits/shells/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/orders/[id]/status/route.ts`

**Current pattern** (lines 57-61):
```typescript
const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/prices/customer/override/route.ts` POST/DELETE (route, request-response)

**Analog:** `src/app/api/prices/global/route.ts` POST

**Current pattern POST** (lines 15-18):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Current pattern DELETE** (lines 66-69):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after both `requireRole()` calls (POST and DELETE handlers).

---

### `src/app/api/prices/global/route.ts` POST (route, request-response)

**Analog:** `src/app/api/prices/customer/override/route.ts` POST

**Current pattern** (lines 14-17):
```typescript
await requireRole(['ADMIN']);
// Note: no factoryId check — global prices may be system-wide
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`. Global prices are factory-scoped in data model.

---

### `src/app/api/staff/route.ts` POST (route, request-response)

**Analog:** `src/app/api/staff/[id]/route.ts` PATCH

**Current pattern** (lines 37-41):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/staff/[id]/route.ts` PATCH/DELETE (route, request-response)

**Analog:** `src/app/api/staff/route.ts` POST

**Current pattern PATCH** (lines 12-15):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Current pattern DELETE** (lines 85-88):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after both `requireRole()` calls.

---

### `src/app/api/subscriptions/[id]/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/staff/[id]/route.ts` PATCH

**Current pattern** (lines 29-32):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/subscriptions/cancel/route.ts` POST (route, request-response)

**Analog:** `src/app/api/payments/confirm/route.ts`

**Current pattern** (lines 7-10):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/factory/onboarding/route.ts` PATCH (route, request-response)

**Analog:** `src/app/api/subscriptions/cancel/route.ts` POST

**Current pattern** (lines 7-10):
```typescript
const session = await requireRole(['ADMIN']);
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Action:** Add `requireActiveSubscription()` after `requireRole()`.

---

### `src/app/api/payments/confirm/route.ts` (bug fix - payment record)

**Reference:** RESEARCH.md Pitfall 3 — Payment audit log missing Payment records

**Current pattern** (lines 33-43):
```typescript
// Update subscription: planType = PAID, status = ACTIVE, extend endDate +30 days
const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const updatedSubscription = await prisma.subscription.update({
  where: { id: subscriptionId },
  data: {
    planType: 'PAID',
    status: 'ACTIVE',
    endDate: newEndDate,
  },
});
```

**Fix needed:** Add `prisma.payment.create()` after subscription update:
```typescript
// Also create Payment record for audit
const monthlyAmount = (subscription.driverCount ?? 0) * (subscription.pricePerDriver?.toNumber() ?? 0);
await prisma.payment.create({
  data: {
    factoryId: subscription.factoryId,
    subscriptionId: subscription.id,
    amount: monthlyAmount,
    method: 'VietQR', // or 'BANK_TRANSFER'
    recordedBy: session.userId,
    confirmedAt: new Date(),
  },
});
```

**Action:** Add Payment record creation after subscription update. Verify Payment model exists in Prisma schema.

---

### `src/lib/vietqr-template.ts` (new utility)

**Role:** utility
**Data Flow:** transform

**No analog in codebase.** This is a new file per D-11/D-12.

**Pattern to implement** (from RESEARCH.md lines 265-287):
```typescript
export type VietQRData = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount?: number;
  note?: string;
};

export function formatVietQRString(data: VietQRData): string {
  const parts = [
    data.bankName,
    data.accountNumber,
    data.accountHolder,
    data.amount ? data.amount.toString() : '',
    data.note || '',
  ];
  return parts.join('|');
}
```

**Action:** Create `src/lib/vietqr-template.ts` with VietQR data types and formatting function.

---

## Shared Patterns

### Authentication (requireRole / requireSession)

**Source:** `src/lib/auth/helpers.ts` (lines 11-47)

**Apply to:** All route files migrating from manual getSession()

**Pattern:**
```typescript
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

// Replace manual getSession() + role check:
const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
if (!session.factoryId) { /* error */ } // <- still needed for factoryId

// For write routes, also add:
await requireActiveSubscription();
```

**Important:** `requireRole` does NOT check factoryId. Routes needing factoryId must still check it manually OR use `requireFactoryId()` in addition to `requireRole()`.

### Error Handling (Response throws)

**Source:** `src/lib/auth/helpers.ts` lines 6-9

**Apply to:** All route handlers that call auth helpers

**Pattern:**
```typescript
// Auth helpers throw NextResponse objects directly
// Catch and re-throw in try/catch:
} catch (error) {
  if (error instanceof Response) throw error;
  console.error('[METHOD /path]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

### Subscription Enforcement (Two-Layer Defense)

**Source:** `src/middleware.ts` (lines 82-117) + `src/lib/auth/helpers.ts` (lines 35-47)

**Apply to:** All write routes (POST/PATCH/DELETE)

**Middleware pattern** (blocks at edge):
```typescript
if (request.method !== 'GET' && pathname.startsWith('/api/')) {
  // fetch /api/billing/subscription
  // check isSubscriptionActive() and isGracePeriodExpired()
  // return 403 READ_ONLY or ACCOUNT_LOCKED or 503 CHECK_FAILED
}
```

**Route-level pattern** (defense-in-depth):
```typescript
// After requireRole(), add:
await requireActiveSubscription();
// throws 403 'Subscription Required' if not ACTIVE
```

### Middleware Subscription Check (Edge Runtime)

**Source:** `src/middleware.ts` lines 83-116

**Key insight:** Edge runtime uses fetch to internal API because Prisma doesn't work in Edge. Fail-closed on any exception (503 CHECK_FAILED).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/vietqr-template.ts` | utility | transform | New file — no existing template pattern in codebase |
| `src/middleware.ts` | middleware | request-response | Reference only — not being modified in this phase |

---

## Key Bugs to Fix

| File | Line | Bug | Fix |
|------|------|-----|-----|
| `src/app/api/orders/bulk-assign/route.ts` | 45 | Uses `driver.factoryId` instead of `session.factoryId` | Replace with `session.factoryId` |
| `src/app/api/payments/confirm/route.ts` | 33-43 | Missing Payment record creation | Add `prisma.payment.create()` after subscription update |

---

## Open Questions (from RESEARCH.md)

| # | Question | Impact | Resolution Needed |
|---|----------|--------|-------------------|
| O1 | `/api/billing/subscription` is ADMIN-only — should ACCOUNTANT access it for billing settings page? | Middleware subscription check could fail for ACCOUNTANT writes | Add ACCOUNTANT to role check in subscription endpoint |
| O2 | Where is VietQR bank data stored? (Factory model or separate table?) | VietQR template implementation | Check Factory model for bank fields |

---

## Metadata

**Analog search scope:** `src/app/api/**/*.ts`
**Files scanned:** 36 routes
**Pattern extraction date:** 2026-04-22
**Confidence:** HIGH

---

## Pattern Mapping Complete

**Phase:** 08-api-route-hardening
**Files classified:** 17
**Analogs found:** 14 / 17 matched

### Coverage
- Files with exact analog: 8
- Files with role-match analog: 6
- Files with no analog: 3 (new utility + middleware reference + payments confirm bug fix)

### Key Patterns Identified
- All write routes should use `requireRole()` + `requireActiveSubscription()` helper chain
- GET routes with manual getSession() should migrate to `requireRole()` for consistency
- Auth helpers throw NextResponse objects — use `if (error instanceof Response) throw error` pattern
- Middleware provides edge-level enforcement; route-level helper provides defense-in-depth
- bulk-assign has a known bug using `driver.factoryId` instead of `session.factoryId`
- Payment confirm route needs Payment record creation for audit completeness

### Files Created
- `.planning/phases/08-api-route-hardening/08-PATTERNS.md` (this file)

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files.