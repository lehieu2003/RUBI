---
phase: 07B-rbac-enforcement
status: passed
verified: 2026-04-22
requirements:
  completed: [AUTH-05, AUTH-06, SEC-01, SEC-02, SEC-03, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05]
  deferred: [BUILD-01, BUILD-03, BUILD-04]
test_status:
  auth_rbac_tests: passed
  typescript: failed_known_phase_10_debt
post_verification_hotfix:
  - login-staff-accountant-stuck
---

# Phase 7B Verification: RBAC Enforcement

## Verdict

**PASSED with non-RBAC build debt noted.**

Phase 7B achieved its goal: tenant route permissions now share a single RBAC matrix, middleware and sidebar consume that matrix, write APIs use shared role helpers, STAFF order-entry reads are allowed, and SUPER_ADMIN direct tenant access remains constrained to the admin surface.

## Must-Haves

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All in-scope write API endpoints use auth helpers before processing requests | Passed | `requireRole(...)` added across customer, driver, staff, subscription, payment, price, deposit, and operational order write routes. |
| STAFF users can only access `/orders` and `/customers` tenant workflows plus `/dashboard` | Passed | `src/lib/rbac/permissions.ts`; `tests/rbac/permissions.test.ts`. |
| ACCOUNTANT users can access dashboard/order/customer/settlement/inventory/vehicle/debt/deposit/map routes | Passed | Shared permission matrix and route visibility tests. |
| ADMIN users have full tenant admin access including `/settings` | Passed | Shared permission matrix and tests. |
| SUPER_ADMIN does not gain accidental direct tenant app access | Passed | `canAccessPath('SUPER_ADMIN', ...)` denies tenant routes; unauthorized SUPER_ADMIN tenant navigation redirects to `/admin/dashboard`. |
| Unauthorized tenant page access redirects with `error=unauthorized` | Passed | `src/middleware.ts`; source regression test covers SUPER_ADMIN branch. |
| Adaptive sidebar filters menu items by role from the same source of truth as middleware | Passed | `src/components/dashboard/sidebar.tsx` uses `getVisibleTenantRoutes(...)`; no local `roles:` arrays remain. |

## Automated Checks

- `npx tsx --test tests/auth/*.test.ts tests/rbac/*.test.ts` passed: 16 tests, 3 suites.
- `npx tsc --noEmit -p tsconfig.json` failed only on already-known Phase 10 build-correctness debt:
  - `src/app/dashboard/page.tsx`: `session.role` may be undefined for `DashboardClient`.
  - `src/components/dashboard/dashboard-client.tsx`: Prisma `Decimal` passed where client `Order.total` expects `string | number`.
  - `src/db/seed.ts`: seed Product, Customer, and Order creates are missing required factory relation / `factoryId`.

## Requirement Traceability

- **AUTH-05:** Auth helpers are used successfully in API Route Handlers in this phase.
- **AUTH-06:** In-scope write endpoints use shared helpers before mutation logic.
- **SEC-01, SEC-02, SEC-03:** Regression tests confirm the JWT secret baseline and seed-token logging baseline remain hardened.
- **RBAC-01, RBAC-02, RBAC-03:** Middleware and sidebar route behavior are driven by the shared RBAC matrix and covered by tests.
- **RBAC-04:** SUPER_ADMIN remains outside tenant route permissions; direct admin work stays under `/admin/*`.
- **RBAC-05:** In-scope write APIs enforce role checks via `requireRole`.

## Human Verification

No manual UAT is required for Phase 7B beyond normal smoke testing because this phase is security/control-flow heavy and covered by deterministic source and helper tests.

## Follow-Up

Phase 10 should resolve the existing TypeScript failures. Phase 8 should consider adding route-handler integration tests if API hardening expands beyond source-level guard checks.

## Post-Verification Hotfix

After manual login testing, STAFF/ACCOUNTANT local accounts were found with `factoryId: null`. This produced a confusing flow: login succeeded, `/api/auth/me` returned 200, then `/dashboard` redirected back to `/login` because tenant pages require `factoryId`.

Fix applied:

- Backfilled local orphan STAFF/ACCOUNTANT users to the active `Phương Loan` factory.
- `POST /api/auth/login` now rejects non-SUPER_ADMIN users missing `factoryId`.
- `GET /api/auth/me` now rejects tenant sessions without an effective factoryId and refreshes legacy JWT cookies after a DB backfill.
- Added `tests/auth/tenant-session.test.ts`.
