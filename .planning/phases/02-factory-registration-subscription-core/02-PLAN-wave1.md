---
wave: 1
depends_on: []
phase: 02-factory-registration-subscription-core
files_modified:
  - src/app/api/auth/register/route.ts
autonomous: false
---

# Plan: Phase 02 Wave 1 — Core Fixes

## Context

Phase 02 enables factory self-registration with trial subscriptions and subscription enforcement. This wave addresses three critical gaps identified in research:

1. **Registration missing transaction** — `/api/auth/register` uses sequential `prisma.create()` calls without atomic wrapper. If User creation fails after Factory, Factory becomes orphaned.
2. **DriverCount not enforced** — The `bulk-assign` endpoint assigns drivers to orders but never checks if the factory's driverCount subscription limit is exceeded.
3. **Banner text wrong** — `TrialBanner` messages do not match D-03/D-04 spec; also shows banner for all TRIAL (even with many days remaining) instead of only when ≤3 days.

## Tasks

### Task 1: Wrap registration creates in `prisma.$transaction`

<read_first>
- `src/app/api/auth/register/route.ts` — file being modified
- `src/lib/db.ts` — verify `prisma` export supports `$transaction`
- `prisma/schema.prisma` — verify Factory, User, Subscription model shapes
</read_first>

<action>
Replace lines 58–91 (three sequential `prisma.create` calls) with a single `prisma.$transaction` call:

```typescript
// Create factory, user, and subscription atomically
const [factory, user, subscription] = await prisma.$transaction([
  prisma.factory.create({ data: { name: factoryName, phone } }),
  prisma.user.create({
    data: {
      email, password: hashedPassword, name, phone,
      role: 'ADMIN', isFactoryOwner: true, factoryId: factory.id,
    },
  }),
  prisma.subscription.create({
    data: {
      factoryId: factory.id,
      planType: 'TRIAL',
      startDate: new Date(),
      endDate: trialEndDate,
      status: 'ACTIVE',
      driverCount: 0,
    },
  }),
]);
```

Keep the JWT generation (lines 94–103) outside the transaction — it's not a DB operation.
</action>

<acceptance_criteria>
- [ ] `src/app/api/auth/register/route.ts` contains `prisma.$transaction([` on one line and `]);` closing on another
- [ ] All three creates (factory, user, subscription) are inside the transaction array
- [ ] `trialEndDate` variable is declared before the transaction and used inside it
- [ ] No sequential `prisma.factory.create(...);` followed by `prisma.user.create(...)` pattern remains
</acceptance_criteria>

---

### Task 2: Add driverCount enforcement to bulk-assign endpoint

<read_first>
- `src/app/api/orders/bulk-assign/route.ts` — file being modified
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `getDaysRemaining()` for reference
- `src/app/api/billing/subscription/route.ts` — for subscription fetching pattern
</read_first>

<action>
After the driver existence check (line 34), add driverCount enforcement:

```typescript
// Verify driver exists
const driver = await prisma.driver.findUnique({ where: { id: driverId } });
if (!driver) {
  return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
}

// SUB-03: Check driverCount subscription limit
// 1 admin free, paid drivers counted against subscription.driverCount
const subscription = await prisma.subscription.findFirst({
  where: { factoryId: driver.factoryId },
  orderBy: { createdAt: 'desc' },
});
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const currentDriverCount = await prisma.driver.count({
  where: { factoryId: driver.factoryId, isActive: true },
});
if (currentDriverCount >= maxDrivers) {
  return NextResponse.json(
    { error: 'Cần nâng cấp subscription để thêm driver', code: 'DRIVER_LIMIT_EXCEEDED' },
    { status: 403 }
  );
}
```

Add `isSubscriptionActive` import from `@/lib/subscription-status` and check it before driverCount check.
If `subscription` exists and `!isSubscriptionActive(subscription)`, return 403 with `code: 'READ_ONLY'`.
</action>

<acceptance_criteria>
- [ ] `src/app/api/orders/bulk-assign/route.ts` imports `isSubscriptionActive` from `@/lib/subscription-status`
- [ ] Response on limit exceeded returns 403 with `{ error: 'Cần nâng cấp subscription để thêm driver', code: 'DRIVER_LIMIT_EXCEEDED' }`
- [ ] Driver count check filters by `driver.factoryId` (not session factoryId, since driver record carries factoryId)
- [ ] `maxDrivers = 1 + (subscription?.driverCount ?? 0)` — admin free, paid drivers add to limit
- [ ] Check is only on `bulk-assign` PATCH — driver record creation is NOT blocked
</acceptance_criteria>

---

### Task 3: Update TrialBanner text and warning period logic

<read_first>
- `src/components/trial/TrialBanner.tsx` — file being modified
- `src/lib/subscription-status.ts` — `isWithinWarningPeriod()` helper already exists
</read_first>

<action>
Three changes to `TrialBanner`:

**1. Change `trial` banner text** (line 53):
- Old: `` `Bạn đang dùng thử IceFlow. Còn ${bannerData.daysRemaining} ngày nữa.` ``
- New: `` `Trial còn ${bannerData.daysRemaining} ngày — Liên hệ Admin để nâng cấp.` ``

**2. Change `expired` banner text** (line 54):
- Old: `'Dùng thử đã hết hạn. Tài khoản chỉ có thể đọc.'`
- New: `'Hệ thống chỉ đọc — Subscription hết hạn. Liên hệ Admin để nâng cấp.'`

**3. Only show `trial` banner when ≤3 days remaining** (line 39 change):
- Current: unconditionally sets `{ type: 'trial', daysRemaining: getDaysRemaining(sub) }` when TRIAL is active
- New: Use `isWithinWarningPeriod(sub)` — only show warning banner when trial has ≤3 days, not for all trial periods
- This aligns with D-04: warning only when ≤3 days remaining

```typescript
// Change line 39:
if (sub.planType === 'TRIAL' && isWithinWarningPeriod(sub)) {
  setBannerData({ type: 'trial', daysRemaining: getDaysRemaining(sub) });
  return;
}
// Remove the unconditional trial banner case — trial without warning is silently allowed
```
</action>

<acceptance_criteria>
- [ ] `TrialBanner.tsx` import includes `isWithinWarningPeriod`
- [ ] `trial` banner text contains "Trial còn {N} ngày — Liên hệ Admin để nâng cấp"
- [ ] `expired` banner text contains "Hệ thống chỉ đọc — Subscription hết hạn. Liên hệ Admin để nâng cấp"
- [ ] Trial banner only shows when `isWithinWarningPeriod(sub)` returns true
- [ ] No banner shown when TRIAL has > 3 days remaining
</acceptance_criteria>

---

## Verification

After wave 1:
1. Registration uses `prisma.$transaction` — check `git diff src/app/api/auth/register/route.ts`
2. bulk-assign returns `DRIVER_LIMIT_EXCEEDED` when driverCount exceeded — test with mock factory
3. TrialBanner shows warning only when ≤3 days and with correct Vietnamese text

## Must-Haves (for phase goal)

- Registration atomic (transaction wrapper) — prevents orphaned Factory on partial failure
- DriverCount enforced on bulk-assign — 403 when limit exceeded
- Banner text matches D-03/D-04 — correct Vietnamese messages