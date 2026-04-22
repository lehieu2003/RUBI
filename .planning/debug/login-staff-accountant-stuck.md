---
status: resolved
trigger: "STAFF and ACCOUNTANT login gets /api/auth/me 200 but stays on login screen"
created: 2026-04-22
updated: 2026-04-22
---

# Debug Session: Login Staff Accountant Stuck

## Symptoms

- Expected: STAFF and ACCOUNTANT users should leave the login page after successful login.
- Actual: `/api/auth/me` returned 200, but navigation ended back on the login screen.
- Reproduction: Login with local STAFF/ACCOUNTANT accounts.

## Evidence

- `src/app/(auth)/login/page.tsx` pushes tenant users to `/dashboard` after login.
- `src/app/dashboard/page.tsx` redirects to `/login` when `getSession()` has no `factoryId`.
- Local DB showed `nv-a@gmail.com`, `nv-b@gmail.com`, and one test STAFF account had `factoryId: null`.

## Root Cause

Tenant users without `factoryId` could still authenticate and receive a JWT. The client observed `/api/auth/me` success, then pushed to `/dashboard`; the dashboard server page rejected the session because tenant pages require `factoryId`, so it redirected back to `/login`.

## Fix

- Backfilled local orphan STAFF/ACCOUNTANT users to the active `Phương Loan` tenant factory.
- `POST /api/auth/login` now rejects non-SUPER_ADMIN users missing `factoryId`.
- `GET /api/auth/me` now computes an effective DB/JWT `factoryId`, rejects tenant sessions without one, and refreshes legacy JWT cookies after a DB backfill.

## Verification

- `tests/auth/tenant-session.test.ts` covers the login guard, `/api/auth/me` guard, and JWT refresh path.
