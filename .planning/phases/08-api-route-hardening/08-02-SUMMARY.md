---
phase: 08-api-route-hardening
plan: '02'
subsystem: api-routes
tags:
  - customers
  - drivers
  - staff
  - auth
  - subscriptions
key-files:
  modified:
    - src/app/api/customers/route.ts
    - src/app/api/drivers/route.ts
    - src/app/api/staff/route.ts
    - src/app/api/staff/[id]/route.ts
requirements-completed:
  - SUBS-03
  - SUB-02
completed: 2026-04-22
---

# Phase 08 Plan 02: Customers, Drivers, and Staff Hardening Summary

Migrated customer and driver reads to shared role enforcement and added subscription checks to staff/customer/driver write operations.

## Changes

- `GET /api/customers` and `GET /api/drivers` now use `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])`.
- Customer and driver POST handlers now call `requireActiveSubscription()`.
- Staff create/update/delete handlers now call `requireActiveSubscription()`.

## Verification

- Confirmed target handlers use shared auth helpers.
- Confirmed `getSession` no longer appears in customer, driver, or billing subscription routes covered by this plan set.

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
