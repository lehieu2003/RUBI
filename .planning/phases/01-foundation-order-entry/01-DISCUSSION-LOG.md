# Phase 01: Foundation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 01-foundation-data-layer
**Areas discussed:** Backfill strategy, Middleware approach, SUPER_ADMIN creation, factoryId propagation

---

## Area 1: Backfill Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Create default factory | Create 'Hệ thống' (System) factory, assign all existing records to it | ✓ |
| NULL = legacy | Allow NULL factoryId for existing records | |
| Onboarding wizard | Force admin to create factory on first login | |

**User's choice:** Create default factory

**Notes:** Simple, works for single-factory migrations. All existing data goes to one "System" factory.

---

## Area 2: Tenant Middleware Approach

| Option | Description | Selected |
|--------|-------------|----------|
| AsyncLocalStorage + $extends | Store factoryId in AsyncLocalStorage per request. Prisma $extends auto-injects filter. | ✓ |
| Query helper function | requireTenant(factoryId) helper wraps every query | |
| Prisma $use middleware | $use() hook inspects queries and auto-injects | |

**User's choice:** AsyncLocalStorage + $extends (Recommended)

**Notes:** Cleanest approach — no query changes needed in API routes.

---

## Area 3: SUPER_ADMIN Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Seed script | One-time seed script creates first SUPER_ADMIN. Run manually after deployment. | ✓ |
| Environment variable flag | CREATE_SUPER_ADMIN=true + credentials in .env on first start | |

**User's choice:** Seed script

**Notes:** Simple, explicit, no credentials in env files.

---

## Area 4: factoryId Field Propagation

| Option | Description | Selected |
|--------|-------------|----------|
| Direct field on each model | Add factoryId String to Customer, Driver, Order, Product | ✓ |
| Inherit via relation | Customer.factoryId = User.factoryId via relation | |

**User's choice:** Direct field on each model (Recommended)

**Notes:** More explicit, simpler constraints, clear @@unique([code, factoryId]) patterns.

---

## Deferred Ideas

- FACT-04 (7-day grace period after cancellation) — Phase 04
- FACT-01/FACT-02 (Factory registration flow) — Phase 02
- SADM-02 to SADM-05 (Super Admin dashboard UI) — Phase 03
