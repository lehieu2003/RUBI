---
phase: 08-api-route-hardening
plan: '01'
subsystem: api-routes
tags:
  - orders
  - auth
  - subscriptions
key-files:
  modified:
    - src/app/api/orders/route.ts
    - src/app/api/orders/bulk-assign/route.ts
    - src/app/api/orders/[id]/status/route.ts
    - src/app/api/orders/[id]/reconcile/route.ts
requirements-completed:
  - SUBS-03
  - SUB-02
  - SUB-03
completed: 2026-04-22
---

# Phase 08 Plan 01: Orders Route Hardening Summary

Migrated the orders cluster to shared auth helpers and added route-level subscription enforcement to write routes.

## Changes

- `GET /api/orders` now uses `requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])`.
- `PATCH /api/orders/bulk-assign` now calls `requireActiveSubscription()`.
- Fixed `bulk-assign` subscription and driver-count lookups to use `session.factoryId` instead of `driver.factoryId`.
- Added `requireActiveSubscription()` to order status and reconcile PATCH handlers.

## Verification

- Confirmed `requireRole` and `requireActiveSubscription` are present in target routes.
- Confirmed `driver.factoryId` and `isSubscriptionActive` no longer remain in `bulk-assign`.

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
