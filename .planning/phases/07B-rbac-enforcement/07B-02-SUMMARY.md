---
phase: 07B-rbac-enforcement
plan: "02"
subsystem: api
tags: [rbac, api-routes, auth-helpers]
requires:
  - phase: 07-auth-infra
    provides: requireRole helper
provides:
  - Shared helper authorization on in-scope write routes
  - Consistent wrong-role 403 behavior through requireRole
  - Preserved explicit tenant factory filters
affects: [api, auth, rbac]
tech-stack:
  added: []
  patterns:
    - Write route authorization through requireRole
key-files:
  created: []
  modified:
    - src/app/api/customers/route.ts
    - src/app/api/drivers/route.ts
    - src/app/api/customers/import/route.ts
    - src/app/api/deposits/shells/route.ts
    - src/app/api/orders/[id]/status/route.ts
    - src/app/api/orders/[id]/reconcile/route.ts
    - src/app/api/orders/bulk-assign/route.ts
    - src/app/api/staff/route.ts
    - src/app/api/staff/[id]/route.ts
    - src/app/api/subscriptions/[id]/route.ts
    - src/app/api/subscriptions/cancel/route.ts
    - src/app/api/payments/confirm/route.ts
    - src/app/api/prices/global/route.ts
    - src/app/api/prices/customer/override/route.ts
key-decisions:
  - "In-scope write routes use requireRole before processing mutations."
  - "Two GET handlers in migrated files were also converted to helpers to keep file-level guard checks clean."
patterns-established:
  - "Route handlers that catch errors rethrow Response from auth helpers before generic 500 handling."
requirements-completed: [AUTH-05, AUTH-06, RBAC-05]
duration: unknown
completed: 2026-04-22
---

# Phase 7B Plan 02: Write Route Helper Migration Summary

**Tenant write APIs now use shared `requireRole(...)` helpers instead of ad hoc role comparisons.**

## Performance

- **Duration:** Not recorded
- **Started:** 2026-04-22
- **Completed:** 2026-04-22
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Converted ADMIN-only write routes to `requireRole(['ADMIN'])`.
- Converted ADMIN/ACCOUNTANT operational write routes to `requireRole(['ADMIN', 'ACCOUNTANT'])`.
- Preserved explicit `session.factoryId` checks and factory-scoped query filters.
- Added `if (error instanceof Response) throw error` where helper-thrown responses could otherwise be swallowed by generic catch blocks.

## Task Commits

No git commits were created during this run.

## Files Created/Modified

- `src/app/api/customers/route.ts` - POST uses `requireRole(['ADMIN'])`.
- `src/app/api/drivers/route.ts` - POST uses `requireRole(['ADMIN'])`.
- `src/app/api/customers/import/route.ts` - POST uses `requireRole(['ADMIN', 'ACCOUNTANT'])`.
- `src/app/api/deposits/shells/route.ts` - GET/PATCH use shared helpers.
- `src/app/api/orders/[id]/status/route.ts` - PATCH uses shared helpers.
- `src/app/api/orders/[id]/reconcile/route.ts` - PATCH uses shared helpers and explicit order factory scoping.
- `src/app/api/orders/bulk-assign/route.ts` - PATCH uses shared helpers.
- `src/app/api/staff/route.ts` - GET/POST use shared helpers.
- `src/app/api/staff/[id]/route.ts` - PATCH/DELETE use shared helpers.
- `src/app/api/subscriptions/[id]/route.ts` - PATCH uses shared helpers.
- `src/app/api/subscriptions/cancel/route.ts` - POST uses shared helpers.
- `src/app/api/payments/confirm/route.ts` - POST uses shared helpers.
- `src/app/api/prices/global/route.ts` - POST uses shared helpers.
- `src/app/api/prices/customer/override/route.ts` - POST/DELETE use shared helpers and verify customer factory scope.

## Decisions Made

- Converted `GET /api/deposits/shells` and `GET /api/staff` to shared helpers too because the plan's file-level guard check would otherwise still detect manual role comparisons in migrated files.
- Added customer factory verification before customer price override writes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Rethrow helper responses inside catch blocks**
- **Found during:** Task 1 and Task 2
- **Issue:** `requireRole(...)` throws a `Response`; generic catch blocks would convert that into 500 responses.
- **Fix:** Added `if (error instanceof Response) throw error` before generic error handling in migrated route handlers.
- **Files modified:** Migrated route handlers with catch blocks.
- **Verification:** RBAC API guard tests pass.

---

**Total deviations:** 1 auto-fixed.
**Impact on plan:** Required for correct 401/403 behavior. No scope creep.

## Issues Encountered

None.

## Verification

- `rg "requireRole\\(\\['ADMIN'\\]\\)" ...` found ADMIN-only helper calls.
- `rg "requireRole\\(\\['ADMIN', 'ACCOUNTANT'\\]\\)" ...` found operational helper calls.
- `rg "session\\.role !==" ...` returned no matches for in-scope migrated files.
- RBAC guard tests passed as part of Plan 03 verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Write-route authorization is ready for final RBAC regression checks.

## Self-Check: PASSED

---
*Phase: 07B-rbac-enforcement*
*Completed: 2026-04-22*

