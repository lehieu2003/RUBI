# Phase 09: Super Admin + Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 09-super-admin-integration
**Areas discussed:** Impersonation mechanism, Entity factory scoping audit, RBAC permissions fix, SUPER_ADMIN read tenant data

---

## Impersonation Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as-is | impersonate_token httpOnly cookie approach — separate from auth JWT, correct security isolation | ✓ |
| Inject factoryId into JWT | Impersonate writes factoryId into auth_token directly | |

**User's choice:** Leave as-is — impersonation separate cookie approach is correct security design
**Notes:** SUPER_ADMIN reads tenant data via admin panel (prismaAuth), not tenant APIs. Separate cookie provides security isolation.

---

## Entity Factory Scoping Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Already scoped (confirm) | All v1.0 entities have factoryId in schema; API routes filter by session.factoryId | ✓ |
| Audit all routes | Need to verify each GET route filters correctly | |

**User's choice:** Already scoped (confirm) — Phase 6/8 work already applied factoryId filtering
**Notes:** Customer, Order, Driver, Product all have factoryId. Routes already filter by session.factoryId.

---

## RBAC Permissions Fix

| Option | Description | Selected |
|--------|-------------|----------|
| Leave as-is | canAccessPath returns false for SUPER_ADMIN — intentional, SUPER_ADMIN uses admin panel only | ✓ |
| Add to tenantRoutePermissions | Add /admin/* to tenantRoutePermissions | |

**User's choice:** Leave as-is — SUPER_ADMIN correctly uses admin panel only, not tenant app routes
**Notes:** canAccessPath blocking SUPER_ADMIN from tenant routes is intentional.

---

## SUPER_ADMIN Read Tenant Data

| Option | Description | Selected |
|--------|-------------|----------|
| Admin panel only | All SUPER_ADMIN tenant reads go through admin panel (prismaAuth) — no tenant API access needed | ✓ |
| Route-level bypass | Add SUPER_ADMIN to requireRole arrays + skip factoryId filter when role==SUPER_ADMIN | |
| Both | Admin panel + route-level bypass | |

**User's choice:** Admin panel only — SUPER_ADMIN reads via admin panel for all tenant data needs
**Notes:** PrismaAuth bypasses $extends entirely, so admin panel can read all tenant data without factoryId filter.

---

## Deferred Ideas

- Vehicle scheduling (which truck each driver uses) — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Custom shift time configuration — hardcoded M/A/N in Phase 8B
- Payment gateway integration (Stripe, VNPay) — manual confirmation sufficient for v2.0