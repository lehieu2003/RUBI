# Phase 8: API Route Hardening + Subscription Enforcement - Research

**Researched:** 2026-04-22
**Domain:** Next.js API route security, subscription enforcement, middleware patterns
**Confidence:** HIGH

## Summary

Phase 8 builds on Phase 7B RBAC enforcement to complete the auth helper migration across all write API endpoints and ensure subscription enforcement is applied consistently. The middleware already has subscription checking in place (SUBS-01/SUBS-02), but route-level enforcement via `requireActiveSubscription()` is defined in helpers but not yet imported in any route. Key tasks: (1) audit all write routes for auth helper usage, (2) add `requireActiveSubscription()` to write operations, (3) verify middleware reads subscription correctly, (4) configure VietQR template for manual payment confirmation, and (5) implement per-driver pricing logic.

**Primary recommendation:** Migrate all manual getSession() calls to auth helpers, then add `requireActiveSubscription()` to every write route as a single consistent step.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Subscription enforcement lives in TWO layers — middleware (edge) + `requireActiveSubscription()` helper (server)
- **D-02:** Subscription check endpoint: `GET /api/billing/subscription` already exists
- **D-03:** Middleware fails closed (503) when subscription check fails
- **D-04:** `requireActiveSubscription()` throws 403 when not ACTIVE/PAID
- **D-05:** Grace period: 7 days via `isGracePeriodExpired()` in middleware
- **D-06:** Middleware blocks writes only when CANCELLED + grace period expired
- **D-07:** Full migration — all write routes use auth helpers
- **D-11:** VietQR scope is payment template UI only — manual DB update by admin
- **D-12:** VietQR template goes in billing settings page (Phase 9 handles broader context)
- **D-13:** `requireActiveSubscription()` is route-level enforcement for all write operations

### Claude's Discretion

- Exact order and grouping of route migrations
- Whether to add requireActiveSubscription() to all write routes or only high-risk ones — full coverage is the default
- Specific VietQR template UI location and styling
- Test approach for subscription enforcement

### Deferred Ideas

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUBS-01 | Middleware reads subscription correctly from /api/billing/subscription response | Middleware calls subscription endpoint with correct headers; response parsed from `subRes.json()` |
| SUBS-02 | Middleware fails closed (blocks request) when subscription endpoint returns non-OK | 503 CHECK_FAILED returned on any exception in subscription check block |
| SUBS-03 | Subscription enforcement available as route-level helper for write operations | `requireActiveSubscription()` defined in `src/lib/auth/helpers.ts` but not yet imported in any route |
| SUB-02 | Subscription enforcement — write operations blocked when TRIAL expired or PAID cancelled | `isSubscriptionActive()` returns false for EXPIRED/CANCELLED status or expired TRIAL; `bulk-assign/route.ts` already uses this pattern |
| SUB-03 | Per-driver pricing | Subscription.driverCount limits active drivers (1 admin free + driverCount paid); pricePerDriver field on Subscription model |
| SUB-04 | Manual payment confirmation — Admin records payment extends +30 days | Payment confirm route exists at `/api/payments/confirm`; needs Payment record creation audit |
| SUB-05 | VietQR content template for payment reference | VietQR is UI template for bank transfer display (bank name, account number, account holder) — not API integration |
| FACT-04 | 7-day grace period after cancellation (read-only), then locked | `isGracePeriodExpired()` checks if CANCELLED and now > endDate; endDate set to now+7days on cancellation |
</phase_requirements>
---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Middleware subscription enforcement | Edge/Middleware | API Route | Middleware blocks writes before route handler for non-GET API requests |
| Route-level subscription enforcement | API Route | Middleware | `requireActiveSubscription()` called inside route handlers as defense-in-depth |
| Auth helper migration | API Route | — | All write routes migrate from manual getSession() to shared helpers |
| VietQR template | Frontend (Settings page) | API Route | UI-only; no API integration — admin reads bank info for manual transfer |
| Per-driver pricing | API Route | Database | Subscription.driverCount enforces limit; pricePerDriver is field on Subscription model |
| Grace period logic | Middleware | API Route | `isGracePeriodExpired()` used in middleware; same function available for routes |
| Manual payment confirmation | API Route | Database | `/api/payments/confirm` extends subscription +30 days; needs Payment record audit |

## Standard Stack

No new libraries needed. Phase uses existing codebase infrastructure.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@/lib/auth/helpers` | (existing) | requireSession, requireRole, requireFactoryId, requireActiveSubscription | Already implemented; needs migration across routes |
| `@/lib/subscription-status` | (existing) | isSubscriptionActive, isGracePeriodExpired | Already implemented; used by middleware and bulk-assign route |
| `@/lib/auth` (getSession) | (existing) | JWT verification, session extraction | Already used by all routes |

**Installation:** No new packages required.

## Architecture Patterns

### System Architecture Diagram

```
Request → Middleware (Edge Runtime)
              │
              ├── JWT verify → session
              ├── RBAC check (canAccessPath)
              ├── Impersonation block (writes)
              └── Subscription check (non-GET /api/*)
                        │
                        ├── fetch /api/billing/subscription
                        │
                        ├── isSubscriptionActive() → 403 READ_ONLY?
                        └── isGracePeriodExpired() → 403 ACCOUNT_LOCKED?
                                   │
                                   ↓ (passes all checks)
                          Route Handler
                              │
                              ├── requireSession/requireRole
                              ├── requireActiveSubscription() ← NEW
                              └── Business logic → DB
```

### Recommended Project Structure

No structural changes needed. Routes are already in `src/app/api/`.

```
src/app/api/
├── auth/           (login, register, logout, me)
├── billing/        (subscription endpoint)
├── admin/          (impersonation, stats, factories)
├── customers/      (CRUD, import, debt-export)
├── drivers/       (CRUD + driver-token auth for confirm)
├── orders/        (CRUD, bulk-assign, confirm, reconcile, status)
├── deposits/      (shells)
├── prices/        (global, customer/override)
├── staff/         (CRUD)
├── subscriptions/ (view, cancel)
├── factory/       (onboarding)
├── payments/      (confirm)
└── reports/       (debt)
```

### Pattern 1: Auth Helper Migration

**What:** Replace manual `getSession()` + role checks with `requireRole()`, `requireFactoryId()`, `requireActiveSubscription()` helpers.

**When to use:** All write API routes currently using manual session checks.

**Example (current manual pattern):**
```typescript
// FROM: Manual session check in orders/route.ts GET
const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
if (!session.factoryId) {
  return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
}
```

**Example (migrated pattern):**
```typescript
// TO: requireRole helper
const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
// requireRole already throws 401/403, no manual checks needed
```

### Pattern 2: Subscription Enforcement at Route Level

**What:** Add `requireActiveSubscription()` after role check in write routes as defense-in-depth.

**When to use:** All POST/PATCH/DELETE routes. Required by SUB-02.

**Example:**
```typescript
export async function PATCH(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
  await requireActiveSubscription(); // ← blocks if inactive
  // ... rest of handler
}
```

### Pattern 3: Middleware Subscription Check (Edge Runtime)

**What:** Middleware calls internal `/api/billing/subscription` via fetch (Edge runtime cannot use Prisma directly). Fails closed on any exception.

**Source:** `src/middleware.ts` lines 83-116

```typescript
if (request.method !== 'GET' && pathname.startsWith('/api/')) {
  const factoryId = session.factoryId;
  if (factoryId) {
    try {
      const subRes = await fetch(
        new URL('/api/billing/subscription', request.url),
        { headers: { Cookie: request.headers.get('cookie') || '' } }
      );
      if (subRes.ok) {
        const sub = await subRes.json();
        // CANCELLED + grace expired = locked
        if (sub?.status === 'CANCELLED' && isGracePeriodExpired(sub)) {
          return NextResponse.json({ code: 'ACCOUNT_LOCKED' }, { status: 403 });
        }
        // Not active = read-only
        if (!isSubscriptionActive(sub)) {
          return NextResponse.json({ code: 'READ_ONLY' }, { status: 403 });
        }
      }
    } catch (error) {
      // Fail closed: 503 CHECK_FAILED
      return NextResponse.json({ code: 'CHECK_FAILED' }, { status: 503 });
    }
  }
}
```

### Anti-Patterns to Avoid

- **Manual getSession() without helper in write routes:** Leads to inconsistent 401/403 behavior. Must migrate all to helpers.
- **Missing factoryId check after requireRole:** `requireRole` does NOT check factoryId. Routes that need factoryId must also call `requireFactoryId()` or check factoryId manually.
- **Double-checking subscription in route when middleware already checks:** Route-level `requireActiveSubscription()` is defense-in-depth. Middleware blocks most cases, route-level catches edge cases (Server Actions, direct calls).
- **Using driver.factoryId instead of session.factoryId for driverCount check:** bulk-assign/route.ts line 45 uses `driver.factoryId` instead of `session.factoryId` — could allow cross-factory driver counting. Should use `session.factoryId`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription status checking | Custom status enum + date comparison | `isSubscriptionActive()`, `isGracePeriodExpired()` from `@/lib/subscription-status` | Handles TRIAL/EXPIRED/CANCELLED logic correctly |
| Auth session checking | Manual getSession() + status code checks | `requireSession()`, `requireRole()`, `requireFactoryId()` from `@/lib/auth/helpers` | Consistent 401/403 behavior, throws NextResponse |
| Grace period calculation | Custom date math for 7-day window | `isGracePeriodExpired()` | Already implemented, tested |
| Driver limit checking | Manual count + comparison | Pattern from `bulk-assign/route.ts` lines 56-66 | Already implements 1-admin-free + driverCount limit |

**Key insight:** The subscription-status and auth helpers are already implemented. Research confirms no custom solutions are needed — migration is the only task.

## Common Pitfalls

### Pitfall 1: `/api/billing/subscription` role restriction

**What goes wrong:** This endpoint requires ADMIN role (line 16 of route: `if (session.role !== 'ADMIN')`). Middleware runs as the authenticated user, so if a non-ADMIN user somehow reaches the subscription check path, the check will return 403 and block writes incorrectly.

**Why it happens:** The subscription endpoint is locked to ADMIN only, but middleware may run as any authenticated user.

**How to avoid:** Verify that all users who need write access also have ADMIN role for subscription check, OR the subscription endpoint role check should be relaxed (e.g., allow ACCOUNTANT as well). Based on D-12 (billing settings page), ACCOUNTANT may need to view subscription status.

**Warning signs:** Middleware subscription check returns 403 when it should allow writes.

### Pitfall 2: `bulk-assign/route.ts` uses wrong factoryId for driver count

**What goes wrong:** Line 45 uses `driver.factoryId` instead of `session.factoryId` for the subscription query. This is a bug — it counts drivers against the DRIVER's factory, not the current user's factory.

**Why it happens:** Copy-paste from driver confirmation route pattern.

**How to avoid:** Use `session.factoryId` for all tenant-scoped queries. `driver.factoryId` is only correct when the driver is the subject, not the requestor.

### Pitfall 3: Payment audit log missing Payment records

**What goes wrong:** `POST /api/payments/confirm` extends subscription but does NOT create Payment records. The STATE.md notes "Payment audit log broken".

**Why it happens:** Route was implemented to extend subscription +30 days but Payment record creation was not added.

**How to avoid:** When confirming payment, also create a Payment record with amount = subscription.driverCount * subscription.pricePerDriver * 30/30 = monthly amount.

### Pitfall 4: `requireActiveSubscription()` not imported in any route

**What goes wrong:** The helper is defined but never used in any route, meaning route-level subscription enforcement is entirely missing.

**Why it happens:** Phase 7 implemented the helper but did not migrate routes to use it.

**How to avoid:** Add `import { requireActiveSubscription } from '@/lib/auth/helpers'` to all write routes and call it after `requireRole()`.

## Code Examples

### VietQR Content Template

VietQR is a Vietnamese QR payment standard. The template is UI-only — it displays bank account information for the admin to share with the factory owner for manual transfer. No API integration.

```typescript
// src/lib/vietqr-template.ts
// VietQR content template for manual payment reference
export type VietQRData = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount?: number;
  note?: string;
};

// Format for VietQR-compatible string
export function formatVietQRString(data: VietQRData): string {
  // VietQR format: beneficiary bank, account, amount, description
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

UI display would show:
- Bank: Vietcombank
- STK: 1234567890
- Ten: Cong Ty TNHH IceFlow
- Noi dung: Thanh toan IceFlow [factoryName]

### Per-Driver Pricing Check

```typescript
// From bulk-assign/route.ts lines 56-67 (needs bug fix on factoryId)
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const currentDriverCount = await prisma.driver.count({
  where: { factoryId: session.factoryId, isActive: true }, // ← correct: session.factoryId
});
if (currentDriverCount >= maxDrivers) {
  return NextResponse.json(
    { error: 'Can nang cap subscription de them driver', code: 'DRIVER_LIMIT_EXCEEDED' },
    { status: 403 }
  );
}
```

### Manual Payment Confirmation (needs Payment record fix)

```typescript
// From /api/payments/confirm - extend subscription +30 days
// Currently missing Payment record creation (STATE.md known issue)
// Fix: add prisma.payment.create() after subscription update
const newEndDate = new Date(subscription.endDate);
newEndDate.setDate(newEndDate.getDate() + 30);

const updated = await prisma.subscription.update({
  where: { id: subscriptionId },
  data: {
    status: 'ACTIVE',
    endDate: newEndDate,
  },
});

// Also create Payment record for audit
await prisma.payment.create({
  data: {
    factoryId: subscription.factoryId,
    subscriptionId: subscription.id,
    amount: (subscription.driverCount ?? 0) * (subscription.pricePerDriver?.toNumber() ?? 0),
    method: 'VietQR', // or 'BANK_TRANSFER'
    recordedBy: session.userId,
    confirmedAt: new Date(),
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual getSession() + role check per route | Shared `requireRole()` helper | Phase 7/7B | Consistent 401/403, centralized logic |
| Subscription checked only in middleware | Two-layer: middleware + route-level helper | Phase 8 (this phase) | Defense-in-depth, catches Server Actions |
| Bulk-assign driver count uses driver.factoryId | Should use session.factoryId | Phase 8 (bug fix) | Prevents cross-factory driver counting |
| Payment confirm missing Payment records | Add Payment.create() to payment confirm | Phase 8 (fix known issue) | Audit log completeness |

**Deprecated/outdated:**
- Manual getSession() in write routes: Should be replaced by requireRole/requireFactoryId
- No route-level subscription enforcement: requireActiveSubscription() exists but unused

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `/api/billing/subscription` role check (ADMIN only) is the intended restriction — ACCOUNTANT may need access for billing display | Pitfall 1 | Middleware subscription check could fail for ACCOUNTANT users making writes |
| A2 | VietQR template stores bank info in Factory model or separate billing settings — scope is UI display only | VietQR | No API integration, so no payment automation risk |
| A3 | Payment record creation on confirm is a bug fix, not new feature — expected behavior is to create records | Pitfall 3 | Audit log will remain incomplete if not fixed |
| A4 | bulk-assign/route.ts line 45 `driver.factoryId` is a bug to fix | Pitfall 2 | Cross-factory driver counting could occur |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Role for subscription status view:**
   - What we know: `/api/billing/subscription` restricts to ADMIN only (line 16)
   - What's unclear: Should ACCOUNTANT be able to view subscription status on the billing settings page? D-12 says billing settings page displays VietQR template. If ACCOUNTANT needs to see subscription, the role check needs relaxing.
   - Recommendation: Check if billing settings page is accessible by ACCOUNTANT. If yes, add ACCOUNTANT to the role check or create a separate read-only endpoint for subscription status.

2. **Where is VietQR bank data stored?**
   - What we know: VietQR template is UI-only, goes in billing settings (D-12)
   - What's unclear: Is bank info stored in Factory model? A separate BillingSettings model? Or is it hardcoded per factory?
   - Recommendation: Check Factory model fields. If no bank fields exist, add them or create a separate config table.

3. **Payment audit log scope:**
   - What we know: `POST /api/payments/confirm` does not create Payment records (STATE.md known issue)
   - What's unclear: Does a Payment model exist in Prisma schema? What fields?
   - Recommendation: Check Prisma schema for Payment model. If it exists, add Payment.create() to payment confirm route. If not, this may be Phase 9 scope.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase is code/config migration only).

## Validation Architecture

**NOTE:** `workflow.nyquist_validation` is set to `false` in `.planning/config.json`. Validation architecture section omitted.

---

## Sources

### Primary (HIGH confidence)
- `src/middleware.ts` — Middleware subscription check logic, edge runtime patterns
- `src/lib/auth/helpers.ts` — Auth helper implementations (requireSession, requireRole, requireFactoryId, requireActiveSubscription)
- `src/lib/subscription-status.ts` — isSubscriptionActive(), isGracePeriodExpired() functions
- `src/app/api/billing/subscription/route.ts` — Subscription check endpoint

### Secondary (MEDIUM confidence)
- `src/app/api/orders/bulk-assign/route.ts` — Per-driver pricing pattern with subscription check
- `src/app/api/payments/confirm/route.ts` — Manual payment confirmation pattern
- `prisma/schema.prisma` — Subscription model with driverCount, pricePerDriver fields

### Tertiary (LOW confidence)
- `src/app/api/customers/route.ts` — Manual getSession pattern (needs migration)
- `src/app/api/drivers/route.ts` — Manual getSession pattern in POST (needs migration)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, existing helpers already implemented
- Architecture: HIGH — two-layer enforcement pattern is clear and documented
- Pitfalls: MEDIUM — identified from code review but browser-based confirmation still needed

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — subscription enforcement is stable, no rapid changes expected)