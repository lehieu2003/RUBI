---
phase: 03x-super-admin-extensions
plan: "03"
subsystem: impersonation
tags: [prisma, next.js, admin, impersonation, audit]

# Dependency graph
requires:
  - phase: 03x-02
    provides: Super Admin audit log system
provides:
  - ImpersonationLog model for Super Admin audit trail
  - Impersonation start/end API endpoints
  - "Xem" button in TenantTable for one-click factory viewing
  - ImpersonationDrawer slide-out panel for factory data overview
affects:
  - none

# Tech tracking
tech-stack:
  added:
    - ImpersonationLog prisma model
  patterns:
    - Super Admin impersonation via session token (not separate login)
    - Read-only factory viewing with 15-minute auto-timeout
    - Slide-out drawer panel for factory data overview

key-files:
  created:
    - prisma/schema.prisma (ImpersonationLog model added)
    - src/app/api/admin/impersonate/[factoryId]/route.ts
    - src/app/api/admin/impersonate/end/route.ts
    - src/app/api/admin/factories/[factoryId]/route.ts
    - src/components/admin/impersonation-drawer.tsx
    - src/app/admin/layout.tsx
  modified:
    - src/components/admin/tenant-table.tsx

key-decisions:
  - "Super Admin stays logged in as themselves, uses ?impersonating=&factoryId= URL params to track impersonation state"
  - "Drawer shows factory details (subscription, drivers, orders, quick nav links) to give context during impersonation"
  - "15-minute auto-timeout enforced via cookie maxAge, with manual 'Kết thúc' button to end early"
  - "ImpersonationLog stores token for audit trail, startedAt/endedAt for session tracking"

patterns-established:
  - "Admin layout uses useSearchParams + URL params for impersonation state (client-side)"
  - "ImpersonationDrawer renders as fixed slide-out panel from right edge"
  - "Factory stats API aggregates orders by status for pending count"

requirements-completed: []

# Metrics
duration: ~8min
completed: 2026-04-18
---

# Phase 03x Plan 03 Summary

**Impersonation / Support Tool allowing SUPER_ADMIN to view any factory as read-only with drawer interface**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-18T03:31:16Z
- **Completed:** 2026-04-18T10:15:00Z
- **Tasks:** 5 (including drawer implementation)
- **Files modified:** 7

## Accomplishments
- ImpersonationLog model in Prisma schema for Super Admin audit trail
- Impersonation start endpoint: POST /api/admin/impersonate/[factoryId] with 15-min cookie
- Impersonation end endpoint: POST /api/admin/impersonate/end (clears cookie, marks endedAt)
- Factory stats API: GET /api/admin/factories/[factoryId] returns subscription, drivers, orders
- "Xem" button in TenantTable rows triggers impersonation and opens drawer
- ImpersonationDrawer slide-out panel showing factory overview with quick nav links

## Task Commits

Each task was committed atomically:

1. **Task 0: ImpersonationLog model** - `10cc9ba` (feat)
2. **Task 1: Impersonation start/end API** - `4547c6f` (feat)
3. **Task 2: Xem button in TenantTable** - `51c823b` (feat)
4. **Task 3: Admin layout with badge** - `2936524` (feat)
5. **Checkpoint (drawer implementation): ImpersonationDrawer** - `5a65f84` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added ImpersonationLog model with token-based session tracking
- `src/app/api/admin/impersonate/[factoryId]/route.ts` - Start impersonation, returns token + factoryId
- `src/app/api/admin/impersonate/end/route.ts` - End impersonation, clears cookie, sets endedAt
- `src/app/api/admin/factories/[factoryId]/route.ts` - Factory stats API for drawer (subscription, drivers, orders)
- `src/app/admin/layout.tsx` - Detects ?impersonating=&factoryId= URL params, renders ImpersonationDrawer
- `src/components/admin/impersonation-drawer.tsx` - Slide-out panel with factory overview and quick nav
- `src/components/admin/tenant-table.tsx` - "Xem" button now redirects with impersonation URL params

## Decisions Made
- Super Admin stays logged in as themselves during impersonation (not separate login)
- Impersonation state tracked via URL params (?impersonating=&factoryId=) rather than additional auth token
- Drawer interface chosen over floating badge per user feedback request
- Factory stats API aggregates order counts by status for pending/total breakdown

## Impersonation Flow

1. Super Admin clicks "Xem" on factory row in TenantTable
2. POST /api/admin/impersonate/[factoryId] creates ImpersonationLog + sets httpOnly cookie
3. Redirect to /admin/dashboard?impersonating=FactoryName&factoryId=xxx
4. AdminLayout detects params and renders ImpersonationDrawer from right edge
5. Drawer shows subscription info, active drivers count, order stats, quick nav links
6. "Kết thúc" button calls /api/admin/impersonate/end, closes drawer, returns to admin view

## Verification

1. Visit /admin/dashboard as SUPER_ADMIN
2. Click "Xem" on any factory row
3. Verify drawer opens from right with factory name header
4. Verify drawer shows: subscription details, active drivers count, order summary, factory info, quick nav links
5. Click "Kết thúc" in drawer
6. Verify drawer closes, no impersonation params in URL

## Deviations from Plan

**None** - plan executed exactly as written. User feedback prompted enhancement from badge to drawer, which was implemented as checkpoint resolution.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| none | - | No new security surface introduced |

## Issues Encountered
- None

## Next Phase Readiness
- Impersonation tool complete and ready for use
- Drawer provides verification point for Super Admin to confirm they are viewing correct factory data
- Could extend to actual factory dashboard navigation (not just stats drawer) in future phase

---
*Phase: 03x-super-admin-extensions*
*Completed: 2026-04-18*