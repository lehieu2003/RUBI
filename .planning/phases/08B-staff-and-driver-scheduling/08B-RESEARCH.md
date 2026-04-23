# Phase 08B: Staff and Driver Scheduling - Research

**Researched:** 2026-04-22
**Domain:** Driver shift scheduling with subscription enforcement + weekly calendar UI
**Confidence:** HIGH

## Summary

Phase 08B adds shift scheduling for drivers (MORNING/AFTERNOON/NIGHT per day) with paidDriverLimit enforcement. Staff are tracked via existing Order.assignerId. The implementation requires: (1) Prisma schema update adding a Shift enum and DriverShiftAssignment model, (2) new API routes for CRUD shift assignments, (3) a weekly calendar grid UI at `/schedule` accessible to ADMIN/ACCOUNTANT, and (4) subscription enforcement using the existing subscription lookup/error shape while counting distinct scheduled drivers for the target date.

**Primary recommendation:** Add a Shift enum and DriverShiftAssignment table keyed by driverId + shiftDate, create `/api/schedule/drivers` endpoint, and build a weekly grid UI with color-coded M/A/N cells. Do not store shift/shiftDate directly on Driver because that only supports one scheduled day per driver.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Driver shifts = MORNING (6am-2pm), AFTERNOON (2pm-10pm), NIGHT (10pm-6am) — hardcoded, no custom config
- **D-02:** Staff tracked via existing Order.assignerId — no new Staff model
- **D-03:** Driver shifts are stored in DriverShiftAssignment keyed by driverId + shiftDate
- **D-05:** paidDriverLimit enforcement at assignment time by counting distinct scheduled drivers for the target date
- **D-06:** Error if limit exceeded: "Cần nâng cấp subscription để thêm driver"
- **D-07:** UI = weekly calendar grid (rows=drivers, cols=days, color-coded M/A/N cells)
- **D-08:** New "Lịch trình" sidebar menu for ADMIN/ACCOUNTANT
- **D-09:** All drivers (isActive=true or false) can be scheduled — admin decides

### Deferred Ideas (OUT OF SCOPE)
- Vehicle scheduling (which truck each driver uses) — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Driver GPS tracking — not in scope (PROJECT.md out of scope)
- Custom shift time configuration — hardcoded M/A/N for now

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| REQ-01 | Add Shift enum + DriverShiftAssignment model in Prisma | Driver model and Factory model in schema.prisma |
| REQ-02 | Create `/api/schedule/drivers` endpoint for CRUD shift assignments | Existing Next.js API route + auth helper patterns |
| REQ-03 | Enforce paidDriverLimit at shift assignment time | Subscription lookup from bulk-assign + distinct scheduled-driver count for target date |
| REQ-04 | Build weekly calendar grid UI (rows=drivers, cols=days, M/A/N color coding) | Driver web-view card pattern from `src/app/driver/page.tsx` |
| REQ-05 | Add "Lịch trình" menu item to sidebar for ADMIN/ACCOUNTANT | `tenantRoutePermissions` pattern from `permissions.ts` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Driver shift data persistence | Database (Prisma) | — | DriverShiftAssignment model in schema.prisma |
| Shift assignment validation | API / Backend | — | `/api/schedule/drivers` route |
| paidDriverLimit enforcement | API / Backend | — | Reuse bulk-assign subscription lookup/error shape and count scheduled drivers per date |
| Weekly calendar grid rendering | Frontend (React) | — | Client component at `/schedule/page.tsx` |
| Sidebar navigation | Frontend (React) | — | `sidebar.tsx` + `permissions.ts` |
| Subscription status check | API / Backend | — | `requireActiveSubscription()` helper |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15 App Router | ^15 | API routes + page rendering | Already in use |
| Prisma ORM | 7.8.0 | Database access, schema migrations | Already in use |
| Zod | (installed) | Input validation for API routes | Already in use |
| React Hook Form | (installed) | Form state management | Already in use |
| Tailwind CSS | (installed) | Styling | Already in use |
| shadcn/ui | (installed) | Reusable UI components | Already in use |

### No New Dependencies Required
This phase uses only existing libraries. The calendar grid can be built with CSS Grid + Tailwind. No calendar library needed.

## Architecture Patterns

### System Architecture Diagram

```
[Browser: ADMIN/ACCOUNTANT]
       |
       v (GET /schedule)
[Next.js Page: /schedule/page.tsx]
       |
       v (fetch /api/schedule/drivers?week=...)
[API Route: /api/schedule/drivers/route.ts]
       |
       +---> [Prisma: DriverShiftAssignment table keyed by driverId + shiftDate]
       |
       +---> [Prisma: Subscription table for driverCount]
       |
       v (shift assignment POST/PATCH)
[paidDriverLimit check]
       |
       +-- [OK] --> [Write shift to Driver record]
       |
       +-- [EXCEEDED] --> [403: "Cần nâng cấp subscription để thêm driver"]
```

### Recommended Project Structure
```
src/
├── app/
│   ├── schedule/                    # NEW: scheduling page
│   │   ├── page.tsx                # Weekly calendar grid (client component)
│   │   └── loading.tsx             # Skeleton loading
│   └── api/
│       └── schedule/
│           └── drivers/
│               └── route.ts        # NEW: shift assignment API
├── components/
│   └── schedule/
│       ├── calendar-grid.tsx       # NEW: reusable calendar grid
│       └── shift-cell.tsx          # NEW: individual shift cell
└── lib/
    └── rbac/
        └── permissions.ts          # MODIFY: add /schedule route
```

### Pattern 1: paidDriverLimit Enforcement (subscription lookup from bulk-assign)
**What:** Check subscription driver limit before allowing a schedule write
**When to use:** When assigning a driver to a date in the schedule
**Example:**
```typescript
// Source: src/app/api/orders/bulk-assign/route.ts lines 49-60 for subscription lookup/error shape
const subscription = await prisma.subscription.findFirst({
  where: { factoryId: session.factoryId },
  orderBy: { createdAt: 'desc' },
});
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const scheduledDrivers = await prisma.driverShiftAssignment.findMany({
  where: {
    factoryId: session.factoryId,
    shiftDate,
    NOT: { driverId },
  },
  select: { driverId: true },
  distinct: ['driverId'],
});
if (scheduledDrivers.length >= maxDrivers) {
  return NextResponse.json(
    { error: 'Cần nâng cấp subscription để thêm driver', code: 'DRIVER_LIMIT_EXCEEDED' },
    { status: 403 }
  );
}
```

### Pattern 2: RBAC Route Addition (from permissions.ts)
**What:** Add new route to tenantRoutePermissions array with role-based access
**When to use:** When adding a new tenant-accessible route
**Example:**
```typescript
// Source: src/lib/rbac/permissions.ts lines 14-28
const opsRoles: TenantRole[] = ['ADMIN', 'ACCOUNTANT'];
export const tenantRoutePermissions: AppRoutePermission[] = [
  // ... existing routes ...
  { href: '/schedule', label: 'Lịch trình', roles: opsRoles, match: 'prefix' },
];
```

### Pattern 3: Sidebar Menu Metadata (from sidebar.tsx)
**What:** Add icon+label mapping for new route in menuMetadata object
**When to use:** When adding a sidebar link for a new route
**Example:**
```typescript
// Source: src/components/dashboard/sidebar.tsx lines 23-35
const menuMetadata = {
  // ... existing entries ...
  '/schedule': { icon: Calendar, label: 'Lịch trình' },
};
```

### Pattern 4: Weekly Calendar Grid (CSS Grid)
**What:** Responsive grid layout for 7-day week with driver rows
**When to use:** For shift scheduling UI
**Structure:**
- CSS Grid: `grid-cols-7` for days, each row = one driver
- Color coding: MORNING=amber, AFTERNOON=blue, NIGHT=violet
- Click cell to cycle M -> A -> N -> empty

### Anti-Patterns to Avoid
- **Do not add a Staff model:** D-02 explicitly states staff tracked via Order.assignerId. Creating a Staff model would contradict the decision and add unnecessary complexity.
- **Do not use a calendar library:** Tailwind CSS Grid is sufficient for a simple weekly view. Adding a library increases bundle size with no benefit for this simple use case.
- **Do not check isActive for scheduling eligibility or the scheduling cap:** D-09 states all drivers (active or inactive) can be scheduled. The scheduling cap is based on distinct scheduled drivers for the target date.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription limit enforcement | Global active-driver count | Subscription lookup + distinct scheduled drivers for target date | Matches scheduling semantics |
| RBAC route configuration | Custom role middleware | tenantRoutePermissions array | Already established pattern |
| Sidebar navigation | Custom nav component | menuMetadata + getVisibleTenantRoutes | Consistent with rest of app |

**Key insight:** The subscription lookup and error shape from bulk-assign are canonical. For scheduling, the count must be distinct scheduled drivers on the target date, not all active drivers in the factory.

## Runtime State Inventory

> Not applicable — this is a greenfield feature (new scheduling module), not a rename/refactor/migration.

## Common Pitfalls

### Pitfall 1: Wrong driver count in limit check
**What goes wrong:** Using the factory's global active-driver count instead of the number of distinct drivers scheduled on the target date.
**Why it happens:** bulk-assign counts active drivers, but scheduling assigns existing drivers to dates. Copying the count query verbatim would block valid schedules or fail to enforce the per-date cap.
**How to avoid:** Reuse the subscription lookup/error response, then count distinct DriverShiftAssignment.driverId values for the same factoryId + shiftDate, excluding the current driver.
**Warning signs:** Subscription limit error triggers when user expects it shouldn't, or doesn't trigger when it should.

### Pitfall 2: Timezone issues with shiftDate
**What goes wrong:** shiftDate stored without timezone consideration, causing shifts to appear on wrong days.
**Why it happens:** JavaScript Date objects and PostgreSQL date fields handle timezone differently.
**How to avoid:** Store shiftDate as date-only (no time), strip time component before save. Use `new Date(dateString).setHours(0,0,0,0)` pattern.
**Warning signs:** Calendar shows shifts on incorrect date, especially near midnight.

### Pitfall 3: Forgetting factoryId filter
**What goes wrong:** Driver schedule queries return drivers from other tenants.
**Why it happens:** Missing `where: { factoryId: session.factoryId }` in Prisma queries.
**How to avoid:** Always use factoryId filter on Driver queries. This is standard practice in the codebase (asyncLocalStorage + Prisma $extends).
**Warning signs:** Scheduler showing drivers from other factories.

## Code Examples

### Driver shift assignment model (to add to schema)
```prisma
// NEW enum - add to schema.prisma
enum Shift {
  MORNING   // 6am-2pm
  AFTERNOON // 2pm-10pm
  NIGHT     // 10pm-6am
}

// ADD relations:
// Factory.driverShiftAssignments DriverShiftAssignment[]
// Driver.shiftAssignments DriverShiftAssignment[]

model DriverShiftAssignment {
  id        String   @id @default(cuid())
  factoryId String   @map("factory_id")
  driverId  String   @map("driver_id")
  shiftDate DateTime @map("shift_date") @db.Date
  shift     Shift
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  factory   Factory  @relation(fields: [factoryId], references: [id])
  driver    Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)

  @@unique([driverId, shiftDate])
  @@index([factoryId, shiftDate])
  @@index([driverId])
  @@map("driver_shift_assignments")
}
```

### Schedule API route skeleton
```typescript
// src/app/api/schedule/drivers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

// GET /api/schedule/drivers?week=2026-04-20
// Returns all drivers with their shifts for the given week
export async function GET(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
  if (!session.factoryId) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get('week'); // Monday of the week
  const weekStartDate = parseDateOnly(weekStart);
  const weekEndDate = addDays(weekStartDate, 7);

  const drivers = await prisma.driver.findMany({
    where: { factoryId: session.factoryId },
    include: {
      shiftAssignments: {
        where: {
          shiftDate: { gte: weekStartDate, lt: weekEndDate },
          factoryId: session.factoryId,
        },
        orderBy: { shiftDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      shifts: driver.shiftAssignments.map((assignment) => ({
        shiftDate: assignment.shiftDate,
        shift: assignment.shift,
      })),
    }))
  );
}

// PATCH /api/schedule/drivers
// Body: { driverId: string, shift: 'MORNING'|'AFTERNOON'|'NIGHT'|null, shiftDate: string }
// Upserts one driver/date assignment (null = delete assignment)
export async function PATCH(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
  await requireActiveSubscription();
  if (!session.factoryId) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const body = await request.json();
  // Validate + enforce paidDriverLimit...
  // Reuse subscription lookup/error shape from bulk-assign; count scheduled drivers for shiftDate.
}
```

### Calendar Grid UI (conceptual)
```tsx
// Weekly grid: rows=drivers, cols=7 days, cells=shift badge
<div className="grid grid-cols-7 gap-2">
  {/* Header row: Mon-Sun */}
  {['T2','T3','T4','T5','T6','T7','CN'].map(day => (
    <div key={day} className="text-center text-slate-400 font-medium">{day}</div>
  ))}

  {/* Driver rows */}
  {drivers.map(driver => (
    <>
      <div className="col-span-1 font-medium text-white">{driver.name}</div>
      {weekDays.map(date => {
        const shift = getShift(driver.id, date);
        return (
          <button
            key={date}
            onClick={() => cycleShift(driver.id, date)}
            className={`px-2 py-1 rounded text-xs font-semibold ${
              shift === 'MORNING' ? 'bg-amber-500/30 text-amber-400' :
              shift === 'AFTERNOON' ? 'bg-blue-500/30 text-blue-400' :
              shift === 'NIGHT' ? 'bg-violet-500/30 text-violet-400' :
              'bg-white/5 text-slate-500 border border-dashed border-white/10'
            }`}
          >
            {shift?.[0] || '+'} {/* M, A, N, or + */}
          </button>
        );
      })}
    </>
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No driver scheduling | Shift-based M/A/N assignment per day | Phase 08B | Enables shift coverage visibility |
| Staff tracked ad-hoc | Staff tracked via assignerId (existing) | Already in place | No change needed |

**Deprecated/outdated:**
- None relevant to this phase.

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Calendar grid can be built with pure CSS Grid + Tailwind (no third-party calendar library) | Standard Stack | Low — CSS Grid is well-suited for weekly grids |
| A2 | Shift time ranges (6am-2pm, etc.) are for display only, not enforced in code | D-01 | Low — times are metadata, actual shift is enum |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions (RESOLVED)

1. **Week start convention**
   - What we know: Calendar shows 7 days, rows = drivers, color-coded M/A/N cells
   - What's unclear: Does the week start on Monday (ISO standard in Vietnam) or Sunday?
   - **Resolution (RESOLVED):** Use Monday as first day (ISO standard, consistent with Vietnam business practice) — per D-01 no explicit override, standard Monday start applied
   - Recommendation: Use Monday as first day (ISO standard, consistent with Vietnam business practice)

2. **Shift unassignment flow**
   - What we know: Clicking a filled cell should cycle or clear the shift
   - What's unclear: What is the exact interaction model? Click to cycle M->A->N->empty? Or click->modal->confirm?
   - **Resolution (RESOLVED):** Direct cycle on click (M->A->N->empty) for speed, as primary value is quick visual overview — per UI spec and focus on speed over complexity
   - Recommendation: Direct cycle on click (M->A->N->empty) for speed, as primary value is quick visual overview

3. **Week navigation**
   - What we know: Weekly view showing one week at a time
   - What's unclear: How does user navigate between weeks? Arrow buttons? Date picker?
   - **Resolution (RESOLVED):** Previous/Next week arrows with "Hôm nay" (Today) button — per calendar-grid.tsx implementation pattern
   - Recommendation: Previous/Next week arrows with "Today" button

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase uses only existing project stack)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (Next.js 15 default) |
| Config file | `vitest.config.ts` (if exists) or `package.json` |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | DriverShiftAssignment persists one shift per driver/date | unit | `npm test -- --run tests/api/schedule/drivers.test.ts` | TBD |
| REQ-02 | GET /api/schedule/drivers returns factory drivers | unit | `npx vitest run api/schedule/drivers.get --reporter=verbose` | TBD |
| REQ-02 | PATCH /api/schedule/drivers creates/updates shift | unit | `npx vitest run api/schedule/drivers.patch --reporter=verbose` | TBD |
| REQ-03 | paidDriverLimit exceeded returns 403 | unit | `npx vitest run api/schedule/drivers.limit --reporter=verbose` | TBD |
| REQ-04 | Calendar grid renders 7 columns x N driver rows | component | Manual review required | TBD |
| REQ-05 | Sidebar shows "Lịch trình" for ADMIN/ACCOUNTANT | unit | `npx vitest run sidebar.schedule-link --reporter=verbose` | TBD |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (fast feedback)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/schedule/drivers.test.ts` — covers REQ-02, REQ-03
- [ ] `tests/lib/subscription.test.ts` — paidDriverLimit enforcement
- [ ] `tests/components/schedule/calendar-grid.test.tsx` — covers REQ-04
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/dom` — if not already in package.json

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | requireRole(['ADMIN', 'ACCOUNTANT']) in API route |
| V3 Session Management | yes | Existing session pattern via getSession() |
| V4 Access Control | yes | RBAC via tenantRoutePermissions + requireRole |
| V5 Input Validation | yes | Zod schema validation on PATCH body |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Driver shift assigned to wrong tenant | Tampering | factoryId filter on all queries |
| Subscription limit bypassed | Elevation | Count distinct scheduled drivers for target date before upsert |
| Invalid shift enum value | Tampering | Zod enum validation before DB write |
| Factory data leaked via scheduling | Information Disclosure | requireRole + factoryId scoping |

## Sources

### Primary (HIGH confidence)
- `src/app/api/orders/bulk-assign/route.ts` — subscription lookup and DRIVER_LIMIT_EXCEEDED error shape (lines 49-60)
- `src/lib/rbac/permissions.ts` — tenantRoutePermissions structure
- `src/lib/auth/helpers.ts` — requireRole, requireActiveSubscription helpers
- `prisma/schema.prisma` — Driver, Subscription models

### Secondary (MEDIUM confidence)
- `src/components/dashboard/sidebar.tsx` — menuMetadata pattern for sidebar routes
- `src/app/driver/page.tsx` — card-based UI pattern for driver views
- `src/app/settle/page.tsx` — admin page pattern with data fetching and modals

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — follows established codebase patterns (bulk-assign, RBAC, sidebar)
- Pitfalls: MEDIUM — based on known patterns but specific scheduling issues not yet encountered

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — scheduling is a stable pattern with no fast-moving changes)
