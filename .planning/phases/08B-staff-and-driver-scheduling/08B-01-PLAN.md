---
phase: "08B"
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/app/api/schedule/assignments/route.ts
  - src/app/api/staff/route.ts
  - src/app/api/staff/[id]/route.ts
  - src/app/api/drivers/route.ts
  - src/app/driver/page.tsx
  - src/app/vehicles/page.tsx
  - src/app/schedule/page.tsx
  - src/app/schedule/loading.tsx
  - src/components/schedule/calendar-grid.tsx
  - src/components/dashboard/sidebar.tsx
  - src/lib/auth.ts
  - src/lib/auth-provider.tsx
  - src/lib/db.ts
  - src/lib/rbac/permissions.ts
  - src/lib/tenant.ts
  - src/middleware.ts
autonomous: false
requirements:
  - REQ-01
  - REQ-02
  - REQ-03
  - REQ-04
  - REQ-05
must_haves:
  truths:
    - "Admin can assign a driver to MORNING/AFTERNOON/NIGHT shift on any date"
    - "Admin can view a weekly calendar grid showing all drivers and their shift assignments"
    - "Admin can remove a driver shift assignment"
    - "System enforces paidDriverLimit per date when assigning shifts"
    - "Admin/Accountant can access /schedule via sidebar menu"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Shift enum and DriverShiftAssignment model"
      contains: "enum Shift, model DriverShiftAssignment"
    - path: "src/app/api/schedule/drivers/route.ts"
      provides: "GET/PATCH shift assignments, paidDriverLimit enforcement"
      exports: "GET, PATCH"
    - path: "src/app/schedule/page.tsx"
      provides: "Weekly calendar grid UI"
    - path: "src/components/schedule/calendar-grid.tsx"
      provides: "Reusable calendar grid component"
    - path: "src/components/dashboard/sidebar.tsx"
      provides: "Sidebar menu with Lịch trình link"
    - path: "src/lib/rbac/permissions.ts"
      provides: "/schedule route permissions for ADMIN/ACCOUNTANT"
  key_links:
    - from: "src/app/schedule/page.tsx"
      to: "/api/schedule/drivers"
      via: "fetch GET for shift data"
      pattern: "fetch.*api/schedule/drivers"
    - from: "src/app/api/schedule/drivers/route.ts"
      to: "prisma.driverShiftAssignment"
      via: "Prisma query with factoryId filter and driverId+shiftDate upsert/delete"
      pattern: "prisma\\.driverShiftAssignment\\.(findMany|upsert|deleteMany)"
---

> Revision 2026-04-23: This plan was implemented with the user-approved account-based revision. Driver scheduling moved from `DriverShiftAssignment` at `/api/schedule/drivers` to user-based `ScheduleAssignment` at `/api/schedule/assignments`; `DRIVER` is now a `UserRole`; Đội xe is read-only; Nhân sự creates driver accounts; and `/schedule` assigns both `STAFF` and `DRIVER` users.

<objective>
Implement driver shift scheduling with weekly calendar grid UI and paidDriverLimit enforcement.

Purpose: Allow ADMIN/ACCOUNTANT to assign drivers to MORNING/AFTERNOON/NIGHT shifts per day, view shift coverage across a week, and enforce subscription driver limits per date.

Output:
- Prisma schema with Shift enum and DriverShiftAssignment model
- `/api/schedule/drivers` route for GET/PATCH shift assignments
- `/schedule` page with weekly calendar grid UI
- Sidebar "Lịch trình" menu item for ADMIN/ACCOUNTANT
</objective>

<execution_context>
@D:/IceFlow SaaS/.claude/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08B-staff-and-driver-scheduling/08B-CONTEXT.md
@.planning/phases/08B-staff-and-driver-scheduling/08B-RESEARCH.md
@.planning/phases/08B-staff-and-driver-scheduling/08B-UI-SPEC.md

# Existing patterns to reuse

## paidDriverLimit enforcement (subscription lookup/error shape from bulk-assign)
```typescript
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

## RBAC route addition (permissions.ts)
```typescript
{ href: '/schedule', label: 'Lịch trình', roles: opsRoles, match: 'prefix' }
```

## Sidebar menu metadata (sidebar.tsx)
```typescript
'/schedule': { icon: Calendar, label: 'Lịch trình' },
```

## Driver model in schema.prisma (lines 115-131)
```prisma
model Driver {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  token     String   @unique @default(uuid())
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  phone     String?
  factoryId String   @map("factory_id")
  factory   Factory  @relation(fields: [factoryId], references: [id])
  orders    Order[]

  @@unique([phone, factoryId])
  @@index([factoryId])
  @@map("drivers")
}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Prisma schema with Shift enum and DriverShiftAssignment model</name>
  <read_first>
    - prisma/schema.prisma (full Driver model, existing Subscription model with driverCount)
  </read_first>
  <action>
    Add to prisma/schema.prisma:

1. **Shift enum** (add near other enums like OrderStatus):
```prisma
enum Shift {
  MORNING
  AFTERNOON
  NIGHT
}
```

2. **Relations**:
- Add `driverShiftAssignments DriverShiftAssignment[]` to Factory model.
- Add `shiftAssignments DriverShiftAssignment[]` to Driver model.

3. **DriverShiftAssignment model**:
```prisma
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

The Driver model final state should have:
- Existing: id, name, slug, token, isActive, createdAt, updatedAt, phone, factoryId, factory, orders
- New: shiftAssignments relation only; do not add shift/shiftDate scalar fields directly to Driver
- Existing indexes: @@unique([phone, factoryId]), @@index([factoryId])
</action>
  <verify>
    <automated>grep -n "enum Shift" prisma/schema.prisma && grep -n "model DriverShiftAssignment" prisma/schema.prisma && grep -n "@@unique(\\[driverId, shiftDate\\])" prisma/schema.prisma && npx prisma validate</automated>
  </verify>
  <done>
    - Prisma schema updated with Shift enum (MORNING, AFTERNOON, NIGHT)
    - DriverShiftAssignment model stores one shift per driver per date
    - Unique constraint on driverId + shiftDate prevents duplicate assignments
    - Index on factoryId + shiftDate supports weekly tenant queries
    - Run `npx prisma validate` confirms schema is valid
  </done>
</task>

<task type="auto">
  <name>Task 2: Create /api/schedule/drivers API route with GET and PATCH handlers</name>
  <read_first>
    - src/app/api/orders/bulk-assign/route.ts (subscription lookup and DRIVER_LIMIT_EXCEEDED error shape)
    - src/lib/auth/helpers.ts (requireRole, requireActiveSubscription)
    - src/lib/db.ts (prisma export)
  </read_first>
  <action>
    Create file: src/app/api/schedule/drivers/route.ts

**GET handler** — Returns all drivers with their shift assignments for a given week:
- Accept `?week=2026-04-20` query param (Monday of target week)
- Query all drivers where factoryId matches session.factoryId, plus assignments where `shiftDate >= weekStart` and `< weekStart + 7 days`
- Return array: { id, name, shifts: [{ shiftDate, shift }] } for each driver
- Use requireRole(['ADMIN', 'ACCOUNTANT'])

**PATCH handler** — Assign or remove a driver's shift:
- Accept body: { driverId: string, shift: "MORNING"|"AFTERNOON"|"NIGHT"|null, shiftDate: string }
- Validate inputs with Zod schema
- Check driver exists and belongs to session.factoryId
- **Enforce paidDriverLimit for the target date**:
  - Get subscription, compute maxDrivers = 1 + driverCount
  - If assigning a non-null shift, count distinct `driverId` values in DriverShiftAssignment for the same factoryId and shiftDate, excluding the current driver
  - If scheduledDistinctDrivers >= maxDrivers, return 403 with error "Cần nâng cấp subscription để thêm driver"
  - Do not use `driver.isActive` for scheduling eligibility; D-09 allows inactive drivers to be scheduled
- If shift is null, delete the DriverShiftAssignment row for driverId + shiftDate
- Otherwise upsert DriverShiftAssignment by driverId + shiftDate
- Return { success: true, assignment: { driverId, shift, shiftDate } }

**Import path for prisma:** `@/lib/db`

Use the subscription lookup and error shape from bulk-assign, but count scheduled drivers for the target date:
```typescript
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
</action>
  <verify>
    <automated>grep -n "GET\|PATCH" src/app/api/schedule/drivers/route.ts && grep -n "requireRole\|requireActiveSubscription" src/app/api/schedule/drivers/route.ts && grep -n "DRIVER_LIMIT_EXCEEDED" src/app/api/schedule/drivers/route.ts</automated>
  </verify>
  <done>
    - GET /api/schedule/drivers returns { id, name, shifts: [{ shiftDate, shift }] }[] for all factory drivers
    - PATCH /api/schedule/drivers upserts or deletes assignment rows with paidDriverLimit enforcement
    - 403 returned with exact error message when limit exceeded
    - requireRole(['ADMIN', 'ACCOUNTANT']) enforced on both handlers
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    After Task 2 completes, the API route exists at src/app/api/schedule/drivers/route.ts with GET and PATCH handlers. The schema has been updated in Task 1.
  </what-built>
  <how-to-verify>
    1. Ensure prisma/schema.prisma changes are committed (run `npx prisma migrate dev --name add_driver_shift_assignments` to generate migration and apply)
    2. Run `npm run dev` and test the API:
       - GET http://localhost:3000/api/schedule/drivers?week=2026-04-20 (as ADMIN)
       - PATCH with body { driverId: "...", shift: "MORNING", shiftDate: "2026-04-20" }
    3. Expected: GET returns drivers with per-day shifts array, PATCH upserts one assignment row
    4. If paidDriverLimit is exceeded for that date: PATCH returns 403 with "Cần nâng cấp subscription để thêm driver"
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Build weekly calendar grid UI at /schedule</name>
  <read_first>
    - .planning/phases/08B-staff-and-driver-scheduling/08B-UI-SPEC.md (full UI contract)
    - src/app/driver/page.tsx (card-based UI pattern)
  </read_first>
  <action>
    Create src/app/schedule/page.tsx as a client component:

**Page header:** "Lịch trình tuần" with week navigation:
- Week label format: "Tuần XX — dd/MM/yyyy" (e.g., "Tuần 17 — 21/04/2026")
- Navigation: "‹" previous week, "›" next week, "Hôm nay" button
- Week starts on Monday (Vietnam ISO standard)

**Fetch data:**
- On mount and on week change, fetch GET /api/schedule/drivers?week={monday}
- Store drivers with their per-date `shifts` assignments in React state

**Calendar grid structure:**
- CSS Grid: `grid-cols-8` (1 col driver name + 7 cols for Mon-Sun)
- Column 1: Driver name, min-width 120px, sticky left
- Columns 2-8: Shift cells for each day

**Shift cell rendering (per UI spec colors):**
- MORNING: `bg-amber-500/15` background, `#fbbf24` text
- AFTERNOON: `bg-blue-500/15` background, `#60a5fa` text
- NIGHT: `bg-violet-500/15` background, `#a78bfa` text
- Empty: `bg-white/5` with `border border-dashed border-white/10`, text slate-500

**Cell content:**
- M = first letter of shift (M, A, N) or "+" for empty
- Font: text-xs font-semibold
- Cell min-height: 44px for touch targets

**Cell interaction:**
- Click to cycle: M → A → N → empty (wraps around)
- On cycle, PATCH /api/schedule/drivers with `driverId`, `shiftDate`, and new shift value
- Show brief loading state during PATCH

**Save button:** "Lưu lịch trình" blue gradient primary CTA at bottom

**Copy per UI spec:**
- "Lịch trình tuần" for page heading
- Day headers: T2, T3, T4, T5, T6, T7, CN
- Empty state: "Chưa có lịch trình" + "Nhấn vào ô trống để gán ca cho tài xế"

Also create loading.tsx with skeleton matching the grid layout.
</action>
  <verify>
    <automated>grep -n "grid-cols-8\|MORNING\|AFTERNOON\|NIGHT\|T2\|T3\|T4\|T5\|T6\|T7\|CN\|Lịch trình" src/app/schedule/page.tsx | head -30</automated>
  </verify>
  <done>
    - /schedule page renders weekly calendar grid
    - Grid has 8 columns (driver name + 7 days)
    - Day headers in Vietnamese (T2-CN)
    - Shift cells show M/A/N with correct color coding
    - Click cycles M→A→N→empty
    - Week navigation works with "Hôm nay" button
  </done>
</task>

<task type="auto">
  <name>Task 4: Add /schedule route to sidebar and RBAC permissions</name>
  <read_first>
    - src/lib/rbac/permissions.ts (tenantRoutePermissions array)
    - src/components/dashboard/sidebar.tsx (menuMetadata object)
  </read_first>
  <action>
    **A. Add to tenantRoutePermissions in src/lib/rbac/permissions.ts:**

After the last entry (before the closing `]`), add:
```typescript
{ href: '/schedule', label: 'Lịch trình', roles: opsRoles, match: 'prefix' },
```

opsRoles is already defined as `['ADMIN', 'ACCOUNTANT']` — no change needed.

**B. Add to menuMetadata in src/components/dashboard/sidebar.tsx:**

Import Calendar icon from lucide-react (add to existing import):
```typescript
import { ..., Calendar } from 'lucide-react';
```

Add entry:
```typescript
'/schedule': { icon: Calendar, label: 'Lịch trình' },
```
</action>
  <verify>
    <automated>grep -n "/schedule" src/lib/rbac/permissions.ts && grep -n "/schedule" src/components/dashboard/sidebar.tsx && grep -n "Calendar" src/components/dashboard/sidebar.tsx</automated>
  </verify>
  <done>
    - ADMIN/ACCOUNTANT users see "Lịch trình" in sidebar
    - Calendar icon renders next to the menu item
    - Route protected by requireRole(['ADMIN', 'ACCOUNTANT'])
  </done>
</task>

</tasks>

<verification>
- Prisma schema: `npx prisma validate` passes
- API route: GET returns drivers with assignment rows, PATCH upserts/deletes assignments with per-date limit enforcement
- Calendar grid: Renders 8-column grid with M/A/N color coding
- Sidebar: "Lịch trình" appears for ADMIN/ACCOUNTANT roles only
- Run `npm test -- --run` to confirm no regressions
</verification>

<success_criteria>
1. Prisma schema has Shift enum and DriverShiftAssignment model keyed by driverId + shiftDate
2. GET /api/schedule/drivers returns all drivers for the factory with their shift assignments for the requested week
3. PATCH /api/schedule/drivers assigns or removes one driver/date shift assignment with paidDriverLimit enforcement
4. paidDriverLimit enforcement returns 403 with "Cần nâng cấp subscription để thêm driver" when the target date already has the maximum distinct scheduled drivers
5. /schedule page renders weekly calendar grid with 8 columns (name + 7 days)
6. Shift cells use correct color coding per UI spec (amber M, blue A, violet N)
7. Clicking a cell cycles through M → A → N → empty
8. "Lịch trình" menu item visible in sidebar for ADMIN/ACCOUNTANT roles
</success_criteria>

<output>
After completion, create `.planning/phases/08B-staff-and-driver-scheduling/08B-01-SUMMARY.md`
</output>
