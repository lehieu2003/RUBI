---
phase: "08B"
plan: "01"
status: "execution_complete"
completed: "2026-04-23"
---

# Phase 08B Plan 01 Summary

## What Changed

- Added Prisma `Shift` enum, account role `DRIVER`, `ScheduleAssignment` model, and optional `Driver.userId` link for account-backed driver profiles.
- Added migration `20260423120000_add_driver_shift_assignments` for the revised account-based schedule model.
- Added tenant scoping for `ScheduleAssignment` in `src/lib/db.ts`.
- Added `/api/schedule/assignments` GET/PATCH route with ADMIN/ACCOUNTANT guard, active subscription check, per-date paidDriverLimit enforcement for scheduled `DRIVER` users, and assignment upsert/delete.
- Added `/schedule` weekly staff/driver schedule UI with Vietnamese day headers, Sáng/Trưa/Chiều/Tối shift rows, week navigation, and per-slot person assignment controls.
- Updated Nhân sự to create/link Driver profiles when role `DRIVER` accounts are created or updated.
- Updated Đội xe to be read-only and list driver profiles backed by active `DRIVER` accounts.
- Updated `/driver` and driver order/confirm APIs so account-based drivers can use the driver view while legacy `/d/[token]` links continue to work.
- Added sidebar and RBAC entry for `/schedule`.
- Added node:test runner and focused source-check tests for schedule API, calendar grid, sidebar, subscription limit behavior, and RBAC updates.

## Files Modified

- `prisma/schema.prisma`
- `prisma/migrations/20260423120000_add_driver_shift_assignments/migration.sql`
- `src/lib/db.ts`
- `src/app/api/schedule/assignments/route.ts`
- `src/app/api/staff/route.ts`
- `src/app/api/staff/[id]/route.ts`
- `src/app/api/drivers/route.ts`
- `src/app/driver/page.tsx`
- `src/app/vehicles/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/schedule/loading.tsx`
- `src/components/schedule/calendar-grid.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/lib/rbac/permissions.ts`
- `package.json`
- `tests/run-tests.ts`
- `tests/api/schedule/assignments.test.ts`
- `tests/api/staff.test.ts`
- `tests/app/vehicles.test.ts`
- `tests/components/schedule/calendar-grid.test.ts`
- `tests/components/sidebar.test.ts`
- `tests/lib/subscription.test.ts`
- `tests/rbac/api-guards.test.ts`
- `tests/rbac/permissions.test.ts`

## Verification

- `npx prisma validate` — passed
- `npx prisma generate --no-engine` — passed
- `npm test -- --run` — passed, 31/31 tests
- `npx tsc --noEmit -p tsconfig.json` — failed on pre-existing Phase 10 build-correctness debt in:
  - `src/app/dashboard/page.tsx`
  - `src/components/dashboard/dashboard-client.tsx`
  - `src/db/seed.ts`

## Notes

- 08B implementation does not store `shift` or `shiftDate` directly on `Driver`; it uses user-based assignment rows to preserve weekly schedule data.
- paidDriverLimit is enforced against distinct scheduled `DRIVER` users for the target date, excluding the current driver account when updating an existing assignment. Staff assignments do not count toward the driver limit.
- Full verification remains pending until existing TypeScript debt is cleared or waived for this phase.
