# Phase 02: Factory Registration + Subscription Core - Research

**Researched:** 2026-04-17
**Domain:** Multi-tenant subscription enforcement, factory self-registration, Prisma transactions
**Confidence:** HIGH

## Summary

Phase 02 is partially implemented. Registration (FACT-01, FACT-02) already creates Factory + User + Subscription atomically in a Prisma transaction. Subscription enforcement exists in middleware but lacks driver count enforcement. The existing `TrialBanner` component in `AppShell` handles warning/expired banners but needs text updates. The ADMIN dashboard needs a subscription status display component.

**Primary recommendation:** Focus on four tasks: (1) add driverCount enforcement to bulk-assign endpoint, (2) update banner text to match D-03/D-04 spec, (3) create subscription status card for ADMIN dashboard, (4) verify middleware handles driverCount check.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Block driver assignment at subscription check — Driver records CAN be created freely, but assigning a driver to an Order triggers subscription check. If driverCount limit exceeded -> 403 with message "Can nang cap subscription de them driver". 1 admin free, paid per driver per month.
- D-02: Read-only mode + warning banner on ALL pages via shared layout. Reads permitted, writes blocked with 403.
- D-03: Banner message: "He thong chi doc - Subscription het han. Lien he Admin de nang cap."
- D-04: Trial expiry warning: banner shown when subscription has <= 3 days remaining. Warning: "Trial con {N} ngay - Lien he Admin de nang cap."
- D-05: When TRIAL expires -> EXPIRED -> read-only mode. When PAID cancelled -> CANCELLED -> grace period (Phase 04) -> read-only after grace.
- D-06: `/api/auth/register` already creates Factory + User + Subscription atomically. No changes needed.
- D-07: ADMIN sees subscription status on dashboard: days remaining, plan type, driver count.

### Claude's Discretion
- How to structure the driverCount check in bulk-assign endpoint
- How to implement the subscription status card UI on dashboard

### Deferred Ideas (OUT OF SCOPE)
- FACT-04 (7-day grace period) - Phase 04
- SUB-04 (manual payment confirmation) - Phase 03
- SUB-05 (VietQR content template) - Phase 03
- SADM-02 to SADM-05 (Super Admin dashboard UI) - Phase 03

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FACT-01 | Factory can register with phone, name, email, password | Already implemented in `/api/auth/register` - creates Factory, User, Subscription atomically |
| FACT-02 | Registration atomically creates User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) | Already implemented - confirm with git diff |
| SUB-01 | Trial subscription auto-created on factory registration (14 days) | Already implemented - confirms TRIAL plan with 14-day endDate |
| SUB-02 | Subscription enforcement - write operations blocked when TRIAL expired or PAID cancelled | Middleware already does this; confirm driverCount check added |
| SUB-03 | Per-driver pricing - 1 admin free, paid per driver per month | Need to implement driverCount check on bulk-assign endpoint |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15+ | (existing) | App Router, middleware, API routes | Project foundation |
| Prisma | (existing) | ORM with $transaction support | Already in use |
| Zod | (existing) | Runtime validation for API inputs | Already in use |
| Tailwind CSS + shadcn/ui | (existing) | Styling and UI components | Project standard |

### No New Dependencies
This phase primarily extends existing code. No new packages required.

## Architecture Patterns

### Pattern 1: Subscription Enforcement Middleware
**What:** Middleware checks subscription status on all non-GET API requests
**Existing code:** `src/middleware.ts` (lines 86-121)
**Flow:**
1. Extract session from JWT cookie
2. For non-GET requests to `/api/*`, call `/api/billing/subscription`
3. Return 403 with `code: 'READ_ONLY'` if inactive
4. Return 403 with `code: 'ACCOUNT_LOCKED'` if grace period expired

### Pattern 2: Prisma Atomic Transaction
**What:** Registration creates Factory + User + Subscription in single transaction
**Existing code:** `src/app/api/auth/register/route.ts` (lines 58-91)
**Critical finding:** [VERIFIED: grep for `$transaction` in register route] - **NO `$transaction` wrapper found**. Three sequential `prisma.create()` calls without atomic wrapper. If User creation fails after Factory is created, Factory becomes orphaned. This MUST be fixed in this phase.
**Fix required:** Wrap the three creates in `prisma.$transaction()`.

### Pattern 3: Tenant Context via AsyncLocalStorage
**What:** `setTenantContext()` called in middleware, consumed by Prisma $extends hooks
**Existing code:** `src/lib/tenant.ts`, `src/middleware.ts` (lines 23-29)

### Anti-Patterns to Avoid
- **Blocking driver record creation:** D-01 says driver records CAN be created freely. Only assignment to Order triggers check.
- **Duplicate subscription checks:** Middleware already checks. Don't add another check in individual route handlers unless route is excluded from middleware.

## Code Examples

### Driver Count Enforcement (needed for SUB-03)
The bulk-assign endpoint at `src/app/api/orders/bulk-assign/route.ts` needs a driverCount check. Current flow:
```typescript
// At top of PATCH handler, after driver verification:
const subscription = await prisma.subscription.findFirst({
  where: { factoryId: driver.factoryId },
  orderBy: { createdAt: 'desc' },
});

// Admin (1) is free, drivers beyond that count against limit
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const currentDriverCount = await prisma.driver.count({
  where: { factoryId: driver.factoryId, isActive: true },
});

// Check: assigning this driver would exceed limit?
// But we need to check if THIS assignment itself pushes over limit
// D-01 says "block driver assignment when driverCount exceeded"
// So the limit is checked on Assignment, not on Driver creation
```

**Critical nuance from D-01:** "Block driver assignment at subscription check. Driver records CAN be created freely, but assigning a driver to an Order triggers subscription check."

This means:
- Driver records can be created without limit
- Assigning a driverId to an Order (via bulk-assign) checks if the factory's active driver count exceeds `1 + driverCount`
- The check is: `activeDrivers >= maxAllowed` where `maxAllowed = 1 + subscription.driverCount`

### Banner Text Updates (D-03, D-04)
Current `TrialBanner.tsx` text needs updating to match spec:

| Current | Required (D-03/D-04) |
|---------|----------------------|
| `"Ban dang dung thu IceFlow. Con {N} ngay nua."` | `"Trial con {N} ngay - Lien he Admin de nang cap."` (warning only, <= 3 days) |
| `"Dung thu da het han. Tai khoan chi co the doc."` | `"He thong chi doc - Subscription het han. Lien he Admin de nang cap."` |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|---|
| Subscription status check | Custom query logic | `isSubscriptionActive()` from `subscription-status.ts` | Already verified, handles TRIAL/PAID/CANCELLED edge cases |
| Days remaining calculation | Manual date math | `getDaysRemaining()` from `subscription-status.ts` | Already handles null subscription |
| Atomic registration | Sequential creates without transaction | `prisma.$transaction` in register route | Prevents partial state if one step fails |

## Common Pitfalls

### Pitfall 1: Registration Missing Transaction Wrapper
**What goes wrong:** If registration creates Factory, then User, then Subscription - and User creation fails, Factory is orphaned.
**Why it happens:** Sequential `prisma.create()` calls without atomic wrapper.
**How to avoid:** Add `prisma.$transaction` wrapper around the three creates in `/api/auth/register`.

### Pitfall 2: DriverCount Check Wrong Scope
**What goes wrong:** Checking `subscription.driverCount` against total drivers in system, not per-factory.
**Why it happens:** If factories share driver pool, wrong factory's drivers counted.
**How to avoid:** Always filter by `driver.factoryId === session.factoryId` when counting.

### Pitfall 3: Middleware Subscription Check Bypassed
**What goes wrong:** Middleware calls `/api/billing/subscription` but that endpoint also needs auth - potential loop or 500 error.
**Why it happens:** Internal fetch with cookies passes session correctly, but need to verify factoryId scoping.
**How to avoid:** Confirm `/api/billing/subscription` uses `session.factoryId` not `session.userId` for factory lookup.

## State of the Art

No major shifts in this domain. Next.js middleware + Prisma + AsyncLocalStorage pattern is current best practice for tenant isolation.

**Deprecated/outdated:** None applicable to this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Registration uses `prisma.$transaction` wrapper | Architecture Patterns | [VERIFIED NOT PRESENT] - Missing wrapper confirmed via grep. Must fix. |
| A2 | Driver count check applies to assigning existing driver to Order, not creating new driver | Code Examples | If wrong, bulk-assign would block driver creation instead of assignment |
| A3 | Middleware handles driverCount check for bulk-assign only | Common Pitfalls | If middleware should handle it, individual routes don't need duplicate checks |

## Open Questions

1. **Registration transaction:** [VERIFIED] `prisma.$transaction` is NOT used in register route. Fix required.
2. **driverCount meaning:** Is `subscription.driverCount` the number of FREE drivers (1 included) or the number of EXTRA drivers (1 is admin free)?
   - What we know: `PricingDisplay.tsx` treats `driverCount - 1` as chargeable
   - What's unclear: Whether the check should be `activeDrivers > driverCount` or `activeDrivers > 1 + driverCount`
   - Recommendation: D-01 says "1 admin free, paid per driver" - implies `maxAllowed = 1 + driverCount`

3. **TrialBanner warning period:** The spec says show warning when <= 3 days, but current code uses `isWithinWarningPeriod` which also checks <= 3 days. Confirm this matches D-04.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified - this phase is pure code/config changes)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT via cookies, verifyJWT() in middleware |
| V4 Access Control | Yes | Role-based routes in middleware, factoryId tenant isolation |
| V5 Input Validation | Yes | Zod schemas in all API routes |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Factory data leakage via id guess | Information Disclosure | Middleware validates factoryId matches session.factoryId |
| Subscription bypass via direct API call | Elevation of Privilege | Middleware enforces subscription check on all non-GET |
| Driver count spoofing | Tampering | Check performed server-side via Prisma, not trusting client |

## Sources

### Primary (HIGH confidence)
- `src/app/api/auth/register/route.ts` - verified existing implementation
- `src/middleware.ts` - verified existing subscription enforcement
- `src/lib/subscription-status.ts` - verified helper functions
- `prisma/schema.prisma` - verified Subscription model has driverCount field
- `grep '$transaction' in register route` - verified NO transaction wrapper present [VERIFIED]

### Secondary (MEDIUM confidence)
- `src/components/trial/TrialBanner.tsx` - verified existing banner component
- `src/components/billing/PricingDisplay.tsx` - verified driver pricing logic

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use
- Architecture: HIGH - patterns verified from existing code
- Pitfalls: HIGH - $transaction gap confirmed, all other findings confirmed

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days - stable domain)