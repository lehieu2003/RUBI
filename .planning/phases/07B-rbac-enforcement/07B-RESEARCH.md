---
phase: 07B-rbac-enforcement
date: 2026-04-22
status: complete
---

# Phase 7B: RBAC Enforcement - Research

## Research Complete

Phase 7B is a codebase-alignment phase, not a new product surface. The main planning risk is drift between multiple permission definitions and ad hoc API route checks.

## Phase Goal

Correct RBAC middleware behavior, enforce route-level authorization for ADMIN/ACCOUNTANT/STAFF, keep SUPER_ADMIN access explicit, and ensure sidebar visibility matches middleware access.

## Relevant Requirements

- AUTH-05: Auth helpers work across API Route Handlers and Server Actions
- AUTH-06: All write API endpoints use auth helpers before processing requests
- RBAC-01: Route middleware correctly enforces ADMIN/ACCOUNTANT/STAFF role access patterns
- RBAC-02: Route middleware redirects unauthorized access to `/dashboard?error=unauthorized`
- RBAC-03: Adaptive sidebar filters menu items by role
- RBAC-04: SUPER_ADMIN bypasses factoryId filter only on explicitly needed operations
- RBAC-05: All write API endpoints enforce role checks via auth helpers
- SEC-01 to SEC-03: Security baseline must not regress from Phase 6

## Current Code Findings

### Middleware and Sidebar Drift

- `src/middleware.ts` contains a local `roleRoutes` map.
- `src/components/dashboard/sidebar.tsx` contains a separate `allMenuItems` role list.
- These two lists overlap but are not one source of truth, and middleware does not clearly cover every sidebar route such as `/reports/debt`, `/deposits/shells`, `/dashboard/map`, `/settings/billing`, `/billing`, and `/config/prices`.

### STAFF Route Access Bug

- `PROJECT.md` and Phase 7B context allow STAFF to use `/orders` and `/customers`.
- `src/middleware.ts` allows STAFF at `/orders` and `/customers`.
- `src/app/api/orders/route.ts` GET currently rejects STAFF because it only allows `ACCOUNTANT` and `ADMIN`.
- This can break the STAFF order-entry screen even though STAFF is supposed to access orders.

### Write API Guard Inconsistency

Phase 7 added `src/lib/auth/helpers.ts`, including `requireRole(...)`, but many write routes still use manual `getSession()` and `session.role` checks.

Representative routes:

- `src/app/api/customers/route.ts` POST
- `src/app/api/drivers/route.ts` POST
- `src/app/api/customers/import/route.ts` POST
- `src/app/api/deposits/shells/route.ts` PATCH
- `src/app/api/orders/[id]/status/route.ts` PATCH
- `src/app/api/orders/[id]/reconcile/route.ts` PATCH
- `src/app/api/orders/bulk-assign/route.ts` PATCH
- `src/app/api/staff/route.ts` POST
- `src/app/api/staff/[id]/route.ts` PATCH and DELETE
- `src/app/api/subscriptions/[id]/route.ts` PATCH
- `src/app/api/subscriptions/cancel/route.ts` POST
- `src/app/api/payments/confirm/route.ts` POST
- `src/app/api/prices/global/route.ts` POST
- `src/app/api/prices/customer/override/route.ts` POST and DELETE

## Recommended Plan Shape

### Plan 01: Shared Route Permissions

Create a shared permission map that both middleware and sidebar consume. This should lock page access behavior before API route cleanup begins.

Key outcome: one source of truth for tenant app route roles.

### Plan 02: Write Route Helper Migration

Convert relevant tenant write API routes from manual `getSession()` role checks to `requireRole(...)`. Preserve `factoryId` checks and explicit `factoryId` query filters after helper migration.

Key outcome: all write paths in Phase 7B scope use shared helpers and return `403` for wrong-role users.

### Plan 03: SUPER_ADMIN and Regression Tests

Fix STAFF order reads and SUPER_ADMIN impersonation/read behavior while keeping direct SUPER_ADMIN access constrained to `/admin/*`. Add tests for middleware/sidebar matrix and key write guards.

Key outcome: role matrix is tested, impersonation remains read-only, and security baseline does not regress.

## Validation Architecture

Use focused tests because the project does not currently have a broad test suite.

- Unit-test the shared route permission helpers.
- Unit-test sidebar filtering through exported pure helpers, avoiding brittle DOM tests.
- Integration-style route tests can be added for auth helper use where direct route testing is practical.
- Always run `npx tsc --noEmit -p tsconfig.json` after execution.

## Research Notes

- No external research is required. The decisions are locked by project docs, Phase 7B context, and existing code patterns.
- Avoid expanding scope into full Phase 8 subscription enforcement. Middleware subscription parsing remains Phase 8 unless required to keep Phase 7B tests passing.

