# Phase 8: API Route Hardening + Subscription Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 8-api-route-hardening
**Areas discussed:** Subscription enforcement scope, Subscription check failure behavior, Auth helper migration scope, VietQR payment scope

---

## Subscription Enforcement Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both middleware + helper | Defense-in-depth: middleware catches Edge calls, API-level catches direct server-side calls | ✓ |
| Middleware only | Simpler but Server Actions bypass middleware | |
| Route-level only | Only in high-risk routes — payments, subscriptions, critical writes | |

**User's choice:** Both middleware + helper (Recommended)
**Notes:** Defense-in-depth approach — catches all bypass paths. Middleware handles Edge runtime, requireActiveSubscription() helper handles Server runtime.

---

## Subscription Check Failure Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fail closed (block writes) | Block all writes when subscription can't be verified — fail secure. Safe but risks locking out valid users during infrastructure issues. | ✓ |
| Fail open (allow writes) | Allow writes if subscription check fails — fail open. Less disruption but leaves inactive tenants writable. | |
| Conditional fail open | Only block writes for TRIAL/CANCELLED subscriptions — ACTIVE/PAID users proceed regardless | |

**User's choice:** Fail closed (block writes) [Recommended]
**Notes:** Consistent with current middleware behavior — 503 + CHECK_FAILED code when subscription check fails.

---

## Auth Helper Migration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full migration — all write routes | All write APIs use helpers. Consistency matters for security. Routes: /customers, /orders/*, /drivers, /deposits/shells, /prices, /staff, /subscriptions, /payments/* | ✓ |
| High-risk routes only | Focus on high-risk routes: /payments/confirm, /orders/*, /customers | |
| Complete replacement | Replace manual getSession+roleCheck with requireRole() in every write API | |

**User's choice:** Full migration — all write routes [Recommended]
**Notes:** User asked for recommendation before selecting. Recommended full migration based on: (1) Phase 8 goal is AUTH-06: all write APIs use auth helpers; (2) consistency matters for security; (3) manual getSession() checks already present in customers, drivers routes.

---

## VietQR Payment Scope

| Option | Description | Selected |
|--------|-------------|----------|
| VietQR template only | VietQR template only — display bank account for manual transfer, confirmation is a manual DB update by admin. Simpler, keeps scope focused on API hardening. | ✓ |
| VietQR template + payment API | VietQR template + API endpoints for recording VietQR payment transactions | |

**User's choice:** VietQR template only [Recommended]
**Notes:** Simpler approach keeps scope focused on API hardening. Manual confirmation via admin panel or direct DB update.

---

## Claude's Discretion

All other implementation decisions delegated to planner/Claude discretion:
- Exact order and grouping of route migrations
- Whether to add requireActiveSubscription() to all write routes or only high-risk ones (full coverage is default)
- Specific VietQR template UI location and styling
- Test approach for subscription enforcement

## Deferred Ideas

None — discussion stayed within phase scope.