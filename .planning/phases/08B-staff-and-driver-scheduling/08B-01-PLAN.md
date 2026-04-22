---
phase: "08B"
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/app/api/schedule/drivers/route.ts
  - src/app/schedule/page.tsx
  - src/app/schedule/loading.tsx
  - src/components/schedule/calendar-grid.tsx
  - src/components/dashboard/sidebar.tsx
  - src/lib/rbac/permissions.ts
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
    - "System enforces paidDriverLimit when assigning shifts"
    - "Admin/Accountant can access /schedule via sidebar menu"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Driver shift fields (shift, shiftDate) and Shift enum"
      contains: "enum Shift"
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
      to: "prisma.driver"
      via: "Prisma query with factoryId filter"
      pattern: "prisma\\.driver\\.(findMany|update)"
---

<objective>
Implement driver shift scheduling with weekly calendar grid UI and paidDriverLimit enforcement.

Purpose: Allow ADMIN/ACCOUNTANT to assign drivers to MORNING/AFTERNOON/NIGHT shifts per day, view shift coverage, and enforce subscription driver limits.

Output:
- Prisma schema with Shift enum and driver shift/shiftDate fields
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

## paidDriverLimit enforcement (bulk-assign route.ts lines 49-60)
```typescript
const subscription = await prisma.subscription.findFirst({
  where: { factoryId: session.factoryId },
  orderBy: { createdAt: 'desc' },
});
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const currentDriverCount = await prisma.driver.count({
  where: { factoryId: session.factoryId, isActive: true },
});
if (currentDriverCount >= maxDrivers) {
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
  <name>Task 1: Update Prisma schema with Shift enum and Driver shift fields</name>
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

2. **Driver model fields** (add after `factoryId` field):
```prisma
shift     Shift?    @map("shift") @db.VarChar(20)
shiftDate DateTime? @map("shift_date") @db.Date
```

3. **Add indexes** for shift queries:
```prisma
@@index([shiftDate])
```

The Driver model final state should have:
- Existing: id, name, slug, token, isActive, createdAt, updatedAt, phone, factoryId, factory, orders
- New: shift (Shift?, optional), shiftDate (DateTime?, optional, @db.Date)
- Existing indexes: @@unique([phone, factoryId]), @@index([factoryId])
- New index: @@index([shiftDate])
</action>
  <verify>
    <automated>grep -n "enum Shift" prisma/schema.prisma && grep -n "shift.*Shift" prisma/schema.prisma && grep -n "shiftDate.*DateTime" prisma/schema.prisma</automated>
  </verify>
  <done>
    - Prisma schema updated with Shift enum (MORNING, AFTERNOON, NIGHT)
    - Driver model has shift (Shift?, nullable) and shiftDate (DateTime?, @db.Date, nullable) fields
    - Index on shiftDate added
    - Run `npx prisma validate` confirms schema is valid
  </done>
</task>

<task type="auto">
  <name>Task 2: Create /api/schedule/drivers API route with GET and PATCH handlers</name>
  <read_first>
    - src/app/api/orders/bulk-assign/route.ts (paidDriverLimit enforcement pattern)
    - src/lib/auth/helpers.ts (requireRole, requireActiveSubscription)
    - src/lib/db.ts (prisma export)
  </read_first>
  <action>
    Create file: src/app/api/schedule/drivers/route.ts

**GET handler** — Returns all drivers with their current shift/shiftDate for a given week:
- Accept `?week=2026-04-20` query param (Monday of target week)
- Query all drivers where factoryId matches session.factoryId
- Return array: { id, name, shift, shiftDate } for each driver
- Use requireRole(['ADMIN', 'ACCOUNTANT'])

**PATCH handler** — Assign or remove a driver's shift:
- Accept body: { driverId: string, shift: "MORNING"|"AFTERNOON"|"NIGHT"|null, shiftDate: string }
- Validate inputs with Zod schema
- Check driver exists and belongs to session.factoryId
- **Enforce paidDriverLimit** (reuse bulk-assign pattern exactly):
  - Get subscription, compute maxDrivers = 1 + driverCount
  - Count active drivers
  - If currentActive >= maxDrivers and the driver being assigned is not already active, return 403 with error "Cần nâng cấp subscription để thêm driver"
- If shift is null, clear shift and shiftDate (unassign)
- Otherwise set shift and shiftDate on the driver record
- Return { success: true, driver: { id, name, shift, shiftDate } }

**Import path for prisma:** `@/lib/db`

Use the exact paidDriverLimit pattern from bulk-assign (lines 49-60):
```typescript
const subscription = await prisma.subscription.findFirst({
  where: { factoryId: session.factoryId },
  orderBy: { createdAt: 'desc' },
});
const maxDrivers = 1 + (subscription?.driverCount ?? 0);
const currentDriverCount = await prisma.driver.count({
  where: { factoryId: session.factoryId, isActive: true },
});
if (currentDriverCount >= maxDrivers) {
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
    - GET /api/schedule/drivers returns { id, name, shift, shiftDate }[] for all factory drivers
    - PATCH /api/schedule/drivers assigns or removes shift with paidDriverLimit enforcement
    - 403 returned with exact error message when limit exceeded
    - requireRole(['ADMIN', 'ACCOUNTANT']) enforced on both handlers
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    After Task 2 completes, the API route exists at src/app/api/schedule/drivers/route.ts with GET and PATCH handlers. The schema has been updated in Task 1.
  </what-built>
  <how-to-verify>
    1. Ensure prisma/schema.prisma changes are committed (run `npx prisma migrate dev --name add_driver_shift` to generate migration and apply)
    2. Run `npm run dev` and test the API:
       - GET http://localhost:3000/api/schedule/drivers?week=2026-04-20 (as ADMIN)
       - PATCH with body { driverId: "...", shift: "MORNING", shiftDate: "2026-04-20" }
    3. Expected: GET returns drivers array, PATCH updates shift
    4. If paidDriverLimit exceeded: PATCH returns 403 with "Cần nâng cấp subscription để thêm driver"
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
- Store drivers with their shift assignments in React state

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
- On cycle, PATCH /api/schedule/drivers with new shift value
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
- API route: GET returns drivers, PATCH updates shifts with limit enforcement
- Calendar grid: Renders 8-column grid with M/A/N color coding
- Sidebar: "Lịch trình" appears for ADMIN/ACCOUNTANT roles only
- Run `npm test -- --run` to confirm no regressions
</verification>

<success_criteria>
1. Driver model has shift (MORNING/AFTERNOON/NIGHT/null) and shiftDate (Date) fields in Prisma schema
2. GET /api/schedule/drivers returns all drivers for the factory with their shift data
3. PATCH /api/schedule/drivers assigns or removes shifts with paidDriverLimit enforcement
4. paidDriverLimit enforcement returns 403 with "Cần nâng cấp subscription để thêm driver" when limit exceeded
5. /schedule page renders weekly calendar grid with 8 columns (name + 7 days)
6. Shift cells use correct color coding per UI spec (amber M, blue A, violet N)
7. Clicking a cell cycles through M → A → N → empty
8. "Lịch trình" menu item visible in sidebar for ADMIN/ACCOUNTANT roles
</success_criteria>

<output>
After completion, create `.planning/phases/08B-staff-and-driver-scheduling/08B-01-SUMMARY.md`
</output>