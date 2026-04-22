---
phase: 07B-rbac-enforcement
status: clean
review_type: manual-advisory
reviewed: 2026-04-22
scope:
  - src/lib/rbac/permissions.ts
  - src/middleware.ts
  - src/components/dashboard/sidebar.tsx
  - src/app/api/**/route.ts RBAC changes
  - tests/rbac/*.test.ts
---

# Phase 7B Code Review

## Result

No blocking issues remain after post-verification auth hotfix.

## Finding Resolved During Review

### SUPER_ADMIN tenant-route redirect loop

- **Severity:** medium
- **File:** `src/middleware.ts`
- **Issue:** `SUPER_ADMIN` is intentionally denied direct tenant app route access, but the generic unauthorized redirect sent all denied users to `/dashboard?error=unauthorized`. Because `SUPER_ADMIN` is also denied `/dashboard`, this could create a redirect loop.
- **Fix:** Unauthorized `SUPER_ADMIN` tenant navigation now redirects to `/admin/dashboard?error=unauthorized`.
- **Regression coverage:** `tests/rbac/api-guards.test.ts` checks this branch.

## Checks

- `npx tsx --test tests/auth/*.test.ts tests/rbac/*.test.ts` passed: 16 tests, 3 suites.
- `npx tsc --noEmit -p tsconfig.json` still fails on existing Phase 10 build-correctness debt outside the RBAC changes.

## Post-Verification Issue Resolved

### Tenant login accepted users without factoryId

- **Severity:** high
- **Files:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`
- **Issue:** STAFF/ACCOUNTANT users with `factoryId: null` could authenticate, then `/dashboard` redirected back to `/login`.
- **Fix:** Tenant login now fails closed without `factoryId`; `/api/auth/me` uses an effective DB/JWT `factoryId`, refreshes legacy JWT cookies after backfill, and rejects tenant sessions that still lack a factory.
- **Data repair:** Local orphan STAFF/ACCOUNTANT users were assigned to the active `Phương Loan` tenant factory.
- **Regression coverage:** `tests/auth/tenant-session.test.ts`.

## Residual Risk

Route-handler authorization coverage is source-level rather than full request/response integration testing. This is acceptable for Phase 7B because the project does not yet have an API route integration test harness, but Phase 8 should avoid expanding this pattern too far without adding one.
