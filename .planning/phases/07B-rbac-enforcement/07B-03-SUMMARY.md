---
phase: 07B-rbac-enforcement
plan: "03"
subsystem: rbac
tags: [staff, super-admin, impersonation, tests, security]
requires:
  - phase: 07B-rbac-enforcement
    provides: shared permissions and helper-migrated routes
provides:
  - STAFF order read access
  - SUPER_ADMIN tenant route boundary tests
  - SUPER_ADMIN unauthorized tenant-route redirect to admin dashboard
  - API guard regression tests
  - Security baseline regression checks
affects: [orders, middleware, rbac, security]
tech-stack:
  added: []
  patterns:
    - Source-level guard tests for security-sensitive route contracts
key-files:
  created:
    - tests/rbac/api-guards.test.ts
  modified:
    - src/app/api/orders/route.ts
    - tests/rbac/permissions.test.ts
key-decisions:
  - "STAFF can read /api/orders for order-entry workflows while operational writes stay restricted."
  - "Regression tests verify no SUPER_ADMIN direct tenant route access through shared permissions."
  - "Unauthorized SUPER_ADMIN tenant-route navigation redirects to /admin/dashboard to avoid a /dashboard redirect loop."
patterns-established:
  - "Security baseline checks can be covered with source-level tests until a fuller integration test harness exists."
requirements-completed: [AUTH-05, AUTH-06, SEC-01, SEC-02, SEC-03, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05]
duration: unknown
completed: 2026-04-22
---

# Phase 7B Plan 03: RBAC Edge Cases and Regression Tests Summary

**STAFF order reads, SUPER_ADMIN tenant-route boundaries, impersonation write blocking, and security baselines are covered by RBAC regression tests.**

## Performance

- **Duration:** Not recorded
- **Started:** 2026-04-22
- **Completed:** 2026-04-22
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments

- Updated `GET /api/orders` to allow STAFF reads while preserving `factoryId: session.factoryId`.
- Added `tests/rbac/api-guards.test.ts` covering helper migration, STAFF order access, impersonation read-only behavior, JWT secret baseline, and seed token logging baseline.
- Fixed unauthorized SUPER_ADMIN tenant-route redirects to return to `/admin/dashboard` instead of looping through `/dashboard`.
- Re-ran the full RBAC test suite successfully.
- Ran TypeScript verification and documented pre-existing Phase 10 build debt.

## Task Commits

No git commits were created during this run.

## Files Created/Modified

- `src/app/api/orders/route.ts` - STAFF can read factory-scoped orders.
- `src/middleware.ts` - SUPER_ADMIN unauthorized tenant routes redirect to `/admin/dashboard`.
- `tests/rbac/api-guards.test.ts` - API/source guard regression tests.
- `tests/rbac/permissions.test.ts` - Existing permission matrix tests also cover SUPER_ADMIN denial.

## Decisions Made

- Used source-level tests for API guard migration because the project does not yet have a route-handler integration test harness.
- Treated TypeScript failures in dashboard serialization and seed data as existing Phase 10 build debt, consistent with the roadmap.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

`npx tsc --noEmit -p tsconfig.json` fails on known build-correctness debt outside Phase 7B:

- `src/app/dashboard/page.tsx`: `session.role` may be undefined for `DashboardClient` props.
- `src/components/dashboard/dashboard-client.tsx`: Prisma `Decimal` is passed where `Order.total` expects `string | number`.
- `src/db/seed.ts`: seed Product, Customer, and Order creates are missing required `factoryId` / factory relation data.

RBAC test verification passed.

## Verification

- `npx tsx --test tests/rbac/*.test.ts` passed: 13 tests, 2 suites.
- `npx tsc --noEmit -p tsconfig.json` failed only on the build debt listed above.
- `rg "READ_ONLY_IMPERSONATION" src/middleware.ts` passes through API guard test.
- `src/lib/auth.ts` has no hardcoded JWT fallback per API guard test.
- `prisma/seed-system-factory.ts` has no SUPER_ADMIN JWT token logging per API guard test.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 7B implementation is ready for phase-level verification. Remaining TypeScript failures should be handled in Phase 10 Build Correctness unless they become blockers earlier.

## Self-Check: PASSED

---
*Phase: 07B-rbac-enforcement*
*Completed: 2026-04-22*
