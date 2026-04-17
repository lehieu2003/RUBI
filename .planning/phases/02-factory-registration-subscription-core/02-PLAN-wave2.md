---
wave: 2
depends_on:
  - 02-PLAN-wave1
phase: 02-factory-registration-subscription-core
files_modified:
  - src/components/dashboard/stat-card.tsx
  - src/components/dashboard/dashboard-client.tsx
autonomous: false
---

# Plan: Phase 02 Wave 2 — ADMIN Subscription Status Dashboard

## Context

Per D-07 from CONTEXT.md: "ADMIN sees subscription status on dashboard: days remaining, plan type, driver count." This is Phase 02 scope — the UI component for displaying subscription info to ADMIN.

Wave 1 fixes critical gaps (registration transaction, driverCount enforcement, banner text). Wave 2 adds the subscription status card to the ADMIN dashboard.

## Tasks

### Task 1: Add SubscriptionStatusCard to dashboard components

<read_first>
- `src/components/dashboard/stat-card.tsx` — existing component to extend
- `src/components/dashboard/dashboard-client.tsx` — dashboard page structure
- `src/app/api/billing/subscription/route.ts` — `/api/billing/subscription` returns `{ subscription, driverCount }`
- `src/lib/subscription-status.ts` — `getDaysRemaining()`, `isSubscriptionActive()`, `isWithinWarningPeriod()`
</read_first>

<action>
Create a new `SubscriptionStatusCard.tsx` component at `src/components/dashboard/subscription-status-card.tsx`.

The card should display for ADMIN role only and show:
1. **Plan type** — `subscription.planType` (TRIAL or PAID)
2. **Status** — ACTIVE / EXPIRED / CANCELLED with color coding
3. **Days remaining** — only for TRIAL, using `getDaysRemaining(sub)`
4. **Driver count** — `{currentDriverCount} / {maxAllowed}` where maxAllowed = `1 + subscription.driverCount`
5. **Warning styling** — if TRIAL ≤ 3 days OR subscription inactive, show warning color

Use existing `StatCard` component as the base wrapper. Add this card to the stats row in `DashboardClient`.

```typescript
// In subscription-status-card.tsx
interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
  driverCount: number;
  isAdmin: boolean;
}

export function SubscriptionStatusCard({ subscription, driverCount, isAdmin }: SubscriptionStatusCardProps) {
  if (!isAdmin) return null;

  const daysRemaining = getDaysRemaining(subscription);
  const isWarning = isWithinWarningPeriod(subscription);
  const isInactive = !isSubscriptionActive(subscription);
  const maxDrivers = 1 + (subscription?.driverCount ?? 0);

  const statusColor = isInactive ? 'text-red-500' : 'text-emerald-400';
  const statusBg = isInactive ? 'bg-red-500/20' : 'bg-emerald-500/20';

  return (
    <StatCard
      title="Subscription"
      value={subscription?.planType ?? 'N/A'}
      subValue={
        isWarning
          ? `Trial còn ${daysRemaining} ngày — Liên hệ Admin để nâng cấp`
          : isInactive
          ? 'Hết hạn — Chỉ đọc'
          : `Còn ${daysRemaining} ngày`
      }
      icon={CreditCard}
      iconColor={isWarning ? 'text-amber-400' : isInactive ? 'text-red-400' : 'text-blue-400'}
      iconBg={isWarning ? 'bg-amber-500/20' : isInactive ? 'bg-red-500/20' : 'bg-blue-500/20'}
      warning={isWarning || isInactive}
    >
      {/* Driver count detail */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Drivers</span>
          <span className="text-white font-medium">{driverCount} / {maxDrivers}</span>
        </div>
      </div>
    </StatCard>
  );
}
```

Add to `DashboardClient` stats grid as the 5th card (grid-cols-4 → stat cards fit naturally alongside existing 4).

Fetch subscription data client-side from `/api/billing/subscription` since dashboard page server-fetches but subscription status needs live data.
</action>

<acceptance_criteria>
- [ ] `src/components/dashboard/subscription-status-card.tsx` exists and exports `SubscriptionStatusCard`
- [ ] Card shows plan type (TRIAL/PAID), status (ACTIVE/EXPIRED/CANCELLED), days remaining, driver count
- [ ] Card only renders for ADMIN role (checks `session.role === 'ADMIN'`)
- [ ] Card uses `StatCard` component wrapper
- [ ] Card added to `DashboardClient` stats grid as 5th item
- [ ] Warning styling applied when TRIAL ≤ 3 days or subscription inactive
</acceptance_criteria>

---

## Verification

1. ADMIN sees subscription card on dashboard with correct plan type, days remaining, driver count
2. Non-ADMIN (STAFF, ACCOUNTANT) do NOT see the subscription card
3. Trial with > 3 days remaining shows no warning
4. Trial with ≤ 3 days remaining shows warning with correct text

## Must-Haves (for phase goal)

- ADMIN can see subscription status (days remaining, plan type, driver count) directly on dashboard — no need to navigate to billing page