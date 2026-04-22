---
phase: 08-api-route-hardening
plan: '03'
subsystem: api-routes
tags:
  - prices
  - subscriptions
  - deposits
  - factory
key-files:
  modified:
    - src/app/api/prices/global/route.ts
    - src/app/api/prices/customer/override/route.ts
    - src/app/api/subscriptions/[id]/route.ts
    - src/app/api/subscriptions/cancel/route.ts
    - src/app/api/deposits/shells/route.ts
    - src/app/api/factory/onboarding/route.ts
requirements-completed:
  - SUBS-03
  - SUB-02
completed: 2026-04-22
---

# Phase 08 Plan 03: Price, Subscription, Deposit, and Factory Route Hardening Summary

Added defense-in-depth subscription enforcement to price, subscription, shell deposit, and onboarding write routes.

## Changes

- Global price POST now calls `requireActiveSubscription()`.
- Customer price override POST and DELETE now call `requireActiveSubscription()`.
- Subscription PATCH and cancel POST now call `requireActiveSubscription()`.
- Shell deposit PATCH and factory onboarding PATCH now call `requireActiveSubscription()`.

## Verification

- Confirmed `requireActiveSubscription` appears in each planned write handler.

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
