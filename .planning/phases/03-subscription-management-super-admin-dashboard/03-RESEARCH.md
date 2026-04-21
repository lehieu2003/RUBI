# Phase 03: Subscription Management + Super Admin Dashboard - Research

**Researched:** 2026-04-18
**Domain:** Multi-tenant subscription billing (manual payment + VietQR) and Super Admin dashboard for factory tenant management
**Confidence:** HIGH

## Summary

Phase 03 builds on already-implemented payment components (PaymentRecorder, VietQRCode) and adds two new surfaces: a `/billing` page for ADMIN users to record payments and view VietQR info, and an `/admin/dashboard` page for SUPER_ADMIN to manage all factory subscriptions system-wide. The core technical challenge is Super Admin queries bypassing the tenant-scoped Prisma $extends hooks to fetch all factories without filtering.

**Primary recommendation:** Build `/admin/dashboard` using a direct Prisma query (not the extended `prisma` client) so SUPER_ADMIN can read all subscriptions. Use row-action buttons for inline subscription management. The billing page can largely reuse existing components on a new route.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dense data table layout — sortable columns, filter by status/subscription type
- **D-02:** Row-level inline actions — Activate, Deactivate, Extend buttons directly in each table row
- **D-03:** Extend action shows inline input for number of days to add (default 30)
- **D-04:** Price per driver configured via row action or inline edit in the driverCount column area
- **D-05:** Dedicated `/billing` page at `src/app/billing/page.tsx`
- **D-06:** Billing page accessible to ADMIN role only. Redirect STAFF/ACCOUNTANT to dashboard
- **D-07:** VietQRCode currently has hardcoded placeholder bank details — do not add bank config UI

### Claude's Discretion
- How to structure the Super Admin table (column order, exact layout)
- Whether to reuse existing StatCard for summary stats or build fresh

### Deferred Ideas (OUT OF SCOPE)
- Bank account configuration (VietQR bank details) — future Phase 05+
- Multiple subscription plans (Basic, Premium tiers) — future Phase 05+
- Bulk activate/deactivate multiple factories at once — future Phase 05+

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUB-04 | Manual payment confirmation — Admin records payment, extends +30 days | PaymentRecorder.tsx + `/api/payments/confirm` route already exist. Need to expose via `/billing` page. |
| SUB-05 | VietQR content template for payment reference | VietQRCode.tsx already implemented with `buildVietQRContent()` function. Hardcoded bank details per D-07. |
| SADM-02 | Tenant list dashboard — all factories, subscription status, driver count, days remaining | Need new `/admin/dashboard` page + API to fetch all factories with subscriptions. Must use base Prisma or bypass $extends for SUPER_ADMIN. |
| SADM-03 | Activate/deactivate tenant subscription from dashboard | Need new PATCH API endpoint for SUPER_ADMIN to update subscription status |
| SADM-04 | Extend trial or subscription period (admin override) | Need new PATCH API endpoint to update `endDate` by arbitrary days |
| SADM-05 | Set price per driver | Existing `Subscription.pricePerDriver` field + existing PATCH route `api/subscriptions/[id]` allows ADMIN to update. Need SUPER_ADMIN version. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15+ | (from project) | App Router, Server Components, Route Handlers | Project baseline |
| Prisma ORM | (from project) | Database access with $extends for tenant scoping | Project baseline |
| Tailwind CSS | v4 | Styling with dark theme (slate-900/slate-800) | Project baseline |
| lucide-react | (latest) | Icon library per UI-SPEC | Used throughout |
| Zod | (latest) | Runtime validation for API inputs | Project baseline |

### Supporting
| Library | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-table | (latest) | Table sorting, filtering (SADM-02 dense table) |
| Sonner / toast | (via existing pattern) | Toast notifications per UI-SPEC |
| @prisma/client | (latest) | Database client |

### Already Implemented (Do Not Rebuild)
- `PaymentRecorder.tsx` — payment confirmation POST to `/api/payments/confirm`
- `VietQRCode.tsx` — VietQR display with hardcoded bank details
- `PricingDisplay.tsx` — pricing breakdown display
- `subscription-status-card.tsx` — StatCard-based subscription display
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `getDaysRemaining()`, `isWithinWarningPeriod()`
- `src/app/api/billing/subscription/route.ts` — GET subscription for current factory
- `src/app/api/payments/confirm/route.ts` — POST payment confirmation (extends +30 days)
- `src/app/api/subscriptions/[id]/route.ts` — PATCH subscription (driverCount, pricePerDriver)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-table | Plain HTML table | react-table provides sorting/filtering out of the box — worth the dependency for SADM-02 |
| Sonner | Custom toast div | Sonner is already used in project — follow existing pattern |

**Installation:** No new packages needed — all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── billing/
│   │   └── page.tsx           # NEW: Admin billing page (SUB-04, SUB-05)
│   ├── admin/
│   │   └── dashboard/
│   │       └── page.tsx       # NEW: Super Admin tenant dashboard (SADM-02/03/04/05)
│   └── api/
│       ├── admin/
│       │   ├── factories/     # NEW: GET all factories + subscriptions
│       │   │   └── route.ts
│       │   └── subscriptions/
│       │       └── [id]/
│       │           └── route.ts  # NEW: PATCH for SUPER_ADMIN activate/deactivate/extend
│       └── billing/
│           └── subscription/
│               └── route.ts      # EXISTS
│       └── payments/
│           └── confirm/
│               └── route.ts      # EXISTS
├── components/
│   ├── billing/                  # EXISTS — reuse all
│   │   ├── PaymentRecorder.tsx
│   │   ├── VietQRCode.tsx
│   │   └── PricingDisplay.tsx
│   ├── admin/
│   │   ├── tenant-table.tsx   # NEW: Super Admin tenant list component
│   │   └── tenant-row-actions.tsx # NEW: Inline row actions (activate/deactivate/extend/price)
│   └── ui/
│       └── drawer.tsx             # EXISTS
```

### Pattern 1: Super Admin API Without Tenant Filter

**What:** Super Admin queries must fetch all factories without the automatic `factoryId` filter injected by the extended Prisma client.

**When to use:** Any API endpoint that serves SUPER_ADMIN for system-wide data.

**Implementation:** Import `PrismaClient` directly (not the extended `prisma` from `@/lib/db`). Alternatively, temporarily clear the AsyncLocalStorage context.

```typescript
// src/app/api/admin/factories/route.ts
import { PrismaClient } from '@prisma/client'; // NOT from '@/lib/db'

const basePrisma = new PrismaClient();

export async function GET() {
  // SUPER_ADMIN can see all factories
  const factories = await basePrisma.factory.findMany({
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      drivers: { where: { isActive: true } },
    },
  });
  return NextResponse.json({ factories });
}
```

**Critical note:** The extended `prisma` from `@/lib/db` uses AsyncLocalStorage + $extends to auto-inject `factoryId` for all queries. SUPER_ADMIN bypasses this filter in `$allModels.findMany` by returning `query(args)` early — BUT only when `ctx.role === 'SUPER_ADMIN'`. So actually the extended prisma DOES return all records for SUPER_ADMIN already. Verify this is working correctly in planning.

### Pattern 2: Inline Row Actions

**What:** Action buttons (Activate, Deactivate, Extend, Edit Price) live directly in table rows without modals.

**When to use:** For Super Admin dashboard power-user actions where speed matters.

**UI-SPEC D-02/D-03/D-04:** Extend shows inline number input (default 30). Edit price shows inline input.

```typescript
// In tenant-row-actions.tsx
const [extendDays, setExtendDays] = useState(30);
const [showExtendInput, setShowExtendInput] = useState(false);

// Extend action
<button onClick={() => setShowExtendInput(true)}>Gia hạn</button>
{showExtendInput && (
  <div className="flex gap-2 mt-2">
    <input
      type="number"
      value={extendDays}
      onChange={e => setExtendDays(Number(e.target.value))}
      className="w-24 px-2 py-1 border rounded"
    />
    <button onClick={handleExtend}>Xác nhận</button>
    <button onClick={() => setShowExtendInput(false)}>Hủy</button>
  </div>
)}
```

### Pattern 3: Optimistic UI for Row Actions

**What:** Update table state immediately on action click before API responds.

**When to use:** All row action buttons (activate/deactivate/extend/price edit).

```typescript
const handleActivate = async (factoryId: string) => {
  // Optimistic update
  setFactories(prev => prev.map(f =>
    f.id === factoryId ? { ...f, subscription: { ...f.subscription, status: 'ACTIVE' } } : f
  ));
  try {
    const res = await fetch(`/api/admin/subscriptions/${subId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    if (!res.ok) throw new Error();
    toast.success('Đã kích hoạt');
  } catch {
    // Revert on failure
    refetch();
    toast.error('Không thể thực hiện');
  }
};
```

### Anti-Patterns to Avoid
- **Using extended `prisma` for Super Admin list without verifying bypass works:** The code shows SUPER_ADMIN bypasses the factoryId filter in `$allModels.findMany/findFirst/findUnique`, but verify this is tested. If not, use base Prisma.
- **Building a modal for Extend action:** UI-SPEC D-03 says inline input, not modal. Respect the decision.
- **Adding bank config UI in this phase:** D-07 explicitly defers this to Phase 05+.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table sorting/filtering | Write custom sort logic | @tanstack/react-table | Handles multi-column sort, filtering, pagination out of box |
| Toast notifications | Build custom toast div | Sonner (if already in project) or existing pattern | Consistent UX, accessible, dismissible |
| VietQR generation | Build custom QR string generator | VietQRCode.tsx already exists | Handles bank detail formatting, content template |

**Key insight:** The PaymentRecorder and VietQRCode components are production-ready. The main work is wiring them into a new `/billing` route and building the Super Admin dashboard from scratch.

## Common Pitfalls

### Pitfall 1: Extended Prisma Auto-Filters SUPER_ADMIN Queries

**What goes wrong:** Super Admin tenant list API returns empty results because the $extends hook still filters even for SUPER_ADMIN.

**Why it happens:** The $extends hook checks `ctx.role === 'SUPER_ADMIN'` to bypass filter, but the AsyncLocalStorage context must be set correctly by middleware.

**How to avoid:** In `middleware.ts`, `setTenantContext()` is called when session exists. For API route handlers called from client components, the context should propagate correctly. If issues arise, use base `PrismaClient` directly for admin API routes.

**Warning signs:** GET `/api/admin/factories` returns 200 but `factories: []`.

### Pitfall 2: Subscription Status Not Refetched After Payment

**What goes wrong:** PaymentRecorder calls `onPaymentConfirmed()` callback but parent billing page state does not refresh.

**Why it happens:** The callback fires `fetch('/api/billing/subscription')` but sets state only if no error. Also, the extended prisma client may cache results.

**How to avoid:** Verify the callback properly triggers re-render. Use React Query's `invalidateQueries` if available, or ensure `setData()` is called with fresh response.

### Pitfall 3: Route /billing vs /settings/billing Confusion

**What goes wrong:** Two billing-related routes exist: `/settings/billing` (existing) and `/billing` (new per D-05). Which one is correct?

**Why it happens:** The context says D-05 "Dedicated `/billing` page at `src/app/billing/page.tsx`" but `/settings/billing` already exists with similar content.

**How to avoid:** Decide in planning: If `/settings/billing` is the canonical route, move PaymentRecorder + VietQRCode there. If `/billing` is the new canonical route, redirect `/settings/billing` to `/billing` or deprecate it.

## Code Examples

### Super Admin API — List All Factories with Subscriptions
```typescript
// src/app/api/admin/factories/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Use base client to avoid tenant filter
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const factories = await basePrisma.factory.findMany({
    where: { isSystem: false },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { drivers: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ factories });
}
```

### Super Admin API — Update Subscription (Activate/Deactivate/Extend)
```typescript
// src/app/api/admin/subscriptions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, extendDays, pricePerDriver, driverCount } = body;

  const updates: Record<string, unknown> = {};

  if (status === 'ACTIVE' || status === 'CANCELLED') {
    updates.status = status;
  }
  if (typeof extendDays === 'number' && extendDays > 0) {
    const sub = await basePrisma.subscription.findUnique({ where: { id } });
    if (sub) {
      const newEndDate = new Date(Math.max(sub.endDate.getTime(), Date.now()) + extendDays * 24 * 60 * 60 * 1000);
      updates.endDate = newEndDate;
    }
  }
  if (typeof pricePerDriver === 'number') {
    updates.pricePerDriver = pricePerDriver;
  }
  if (typeof driverCount === 'number') {
    updates.driverCount = driverCount;
  }

  const updated = await basePrisma.subscription.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ subscription: updated });
}
```

### Billing Page (Admin)
```typescript
// src/app/billing/page.tsx
'use client';
import { PaymentRecorder } from '@/components/billing/PaymentRecorder';
import { VietQRCode } from '@/components/billing/VietQRCode';
import { SubscriptionStatusCard } from '@/components/dashboard/subscription-status-card';
import { useEffect, useState } from 'react';

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [driverCount, setDriverCount] = useState(0);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold">Thanh toán</h1>
      <SubscriptionStatusCard subscription={subscription} driverCount={driverCount} isAdmin />
      <PaymentRecorder subscription={subscription} driverCount={driverCount} />
      <VietQRCode amount={Math.max(0, driverCount - 1) * 150000} />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-factory billing | Multi-tenant billing with factory-scoped subscription | Phase 02 | Factory-filtered queries now standard |
| Hardcoded bank details in VietQR | Bank config deferred to Phase 05+ | Phase 03 (D-07) | No bank UI in v2.0 |
| Trial extension only via registration | Admin can extend any subscription via dashboard | Phase 03 SADM-04 | New override capability |

**Deprecated/outdated:**
- Payment confirmation without extending endDate — `/api/payments/confirm` now extends +30 days correctly

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extended prisma correctly bypasses factoryId filter for SUPER_ADMIN | Architecture Patterns | If bypass doesn't work, Super Admin API returns empty. Use base Prisma as fallback. |
| A2 | `/api/admin/factories` route needs to be created | Standard Stack | If existing route covers this, extra work wasted |
| A3 | @tanstack/react-table is available in project | Common Pitfalls | If not installed, build plain table or add package |
| A4 | `/billing` page is distinct from `/settings/billing` | Common Pitfalls | If they should be the same, one should redirect to the other |

## Open Questions

1. **Should `/billing` replace `/settings/billing` or coexist?**
   - What we know: `/settings/billing` exists with all billing components
   - What's unclear: Is D-05's `/billing` meant to be a new canonical route, or is `/settings/billing` already correct?
   - Recommendation: Discuss with user — if billing is frequently accessed, a shorter `/billing` URL makes sense. If not, keep it under `/settings/`.

2. **Does the extended prisma actually return all records for SUPER_ADMIN in $allModels.findMany?**
   - What we know: Code shows `if (ctx.role === 'SUPER_ADMIN') return query(args);` which should bypass filter
   - What's unclear: Whether this is tested and works correctly with AsyncLocalStorage
   - Recommendation: Planner should verify by writing a quick test or examining the tenant.ts implementation

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond existing Node.js/Next.js stack)

## Validation Architecture

> Skip this section — `workflow.nyquist_validation` is `false` in `.planning/config.json`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via cookies, verified in middleware |
| V3 Session Management | yes | 7-day JWT expiration, httpOnly cookie |
| V4 Access Control | yes | Role-based routes: ADMIN for billing, SUPER_ADMIN for admin dashboard |
| V5 Input Validation | yes | Zod for body parsing in new API endpoints |
| V6 Cryptography | no | No cryptography in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation (ADMIN calling SUPER_ADMIN API) | Elevation | Role check in middleware + API route |
| Subscription tampering (user modifies own subscription) | Tampering | ADMIN can only modify own factory's subscription via factoryId check |
| Extended prisma filter bypass failure | Information disclosure | SUPER_ADMIN bypass not working → use base Prisma as fallback |
| VietQR content injection | Tampering | VietQRContent is factory name + month only — no user-controlled injection |

## Sources

### Primary (HIGH confidence)
- `src/components/billing/PaymentRecorder.tsx` — Existing component, SUB-04 done
- `src/components/billing/VietQRCode.tsx` — Existing component, SUB-05 done
- `src/lib/subscription-status.ts` — Helper functions for subscription checks
- `prisma/schema.prisma` — Subscription model with all required fields
- `src/middleware.ts` — Role-based routing, SUPER_ADMIN bypass noted
- `.planning/phases/03-subscription-management-super-admin-dashboard/03-CONTEXT.md` — Locked decisions
- `.planning/phases/03-subscription-management-super-admin-dashboard/03-UI-SPEC.md` — Design contract

### Secondary (MEDIUM confidence)
- `src/app/api/subscriptions/[id]/route.ts` — PATCH pattern for subscription updates
- `src/app/api/payments/confirm/route.ts` — Payment confirmation pattern
- `src/app/settings/billing/page.tsx` — Existing billing page structure

### Tertiary (LOW confidence)
- `@tanstack/react-table` availability — not verified in codebase, may need package install

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — patterns from existing codebase
- Pitfalls: MEDIUM — edge cases around prisma $extends bypass need verification

**Research date:** 2026-04-18
**Valid until:** ~30 days for stable features (subscription management is well-established)

---

## RESEARCH COMPLETE

**Phase:** 03 - Subscription Management + Super Admin Dashboard
**Confidence:** HIGH

### Key Findings
1. PaymentRecorder + VietQRCode already implemented — SUB-04 and SUB-05 essentially done, just need `/billing` page to expose them
2. New work is primarily building `/admin/dashboard` + Super Admin API endpoints (SADM-02/03/04/05)
3. Extended Prisma `$extends` auto-injects factoryId for non-SUPER_ADMIN — SUPER_ADMIN bypass may work but needs verification
4. `/settings/billing` already exists with all billing components — D-05's `/billing` may need to either replace it or coexist with redirect
5. New API endpoints needed: `GET /api/admin/factories` and `PATCH /api/admin/subscriptions/[id]`

### File Created
`.planning/phases/03-subscription-management-super-admin-dashboard/03-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libraries verified in codebase |
| Architecture | HIGH | Patterns from existing codebase, no new concepts |
| Pitfalls | MEDIUM | Prisma $extends bypass needs verification in planning |

### Open Questions
1. `/billing` vs `/settings/billing` — which is canonical?
2. Extended prisma SUPER_ADMIN bypass — does it work in practice?

### Ready for Planning
Research complete. Planner can now create PLAN.md files.