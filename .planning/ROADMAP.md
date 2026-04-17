# Roadmap: v2.0 Multi-tenant Factory Architecture

**Milestone:** v2.0
**Created:** 2026-04-17
**Phase numbering:** Starts at 01 (fresh reset)

---

## Overview

v2.0 transforms IceFlow SaaS from a single-tenant system into a multi-tenant architecture where each ice factory is a completely isolated tenant. All data is scoped via `factoryId` on every entity. A Super Admin dashboard provides system-wide oversight and subscription management.

**24 requirements** across 5 categories map to **4 phases**.

---

## Phase 01: Foundation — Data Layer + Factory Model + Super Admin Role

**Goal:** Build the cross-cutting data layer that enables multi-tenancy, introduce the Factory model, and add the SUPER_ADMIN role. All subsequent phases depend on this.

**Requirements:**

| ID | Requirement |
|----|-------------|
| DATA-01 | Add factoryId to Customer, Driver, Order, Product (and backfill existing records) |
| DATA-02 | Prisma tenant middleware auto-injects factoryId into all queries via `$extends` + AsyncLocalStorage |
| DATA-03 | Super Admin queries bypass factoryId filter (SUPER_ADMIN role flag) |
| DATA-04 | Middleware enforces subscription status on every write request (403 if inactive) |
| DATA-05 | Unique constraints are factory-scoped — e.g. Customer.code is unique only within a Factory (use `@@unique([code, factoryId])` in Prisma) |
| FACT-03 | Tenant activation/deactivation via subscription status |
| SADM-01 | SUPER_ADMIN role above ADMIN — system-wide access, no factory filter |

**Dependencies:** None (first phase)

**Success Criteria:**
1. All four models (Customer, Driver, Order, Product) have `factoryId` field; existing records backfilled to a default factory
2. Every Prisma query passes through tenant middleware that auto-injects `factoryId` filter for non-SUPER_ADMIN users
3. SUPER_ADMIN role bypasses factoryId filtering and can query across all factories
4. Write requests to inactive tenants return HTTP 403; TRIAL and cancelled PAID subscriptions are flagged inactive
5. `@@unique([code, factoryId])` constraints applied to Customer.code and Driver.phone; composite uniqueness enforced by Prisma

**Plans:**
- [x] 01-01-PLAN.md — Factory model + factoryId fields on tenant entities + composite unique constraints
- [x] 01-02-PLAN.md — Tenant middleware (AsyncLocalStorage + Prisma $extends) + SUPER_ADMIN bypass + subscription enforcement
- [x] 01-03-PLAN.md — Backfill migration + System factory seed + SUPER_ADMIN user creation

---

## Phase 02: Factory Registration + Subscription Core

**Goal:** Enable new factories to self-register with a trial subscription; block write operations when subscription is inactive or expired.

**Requirements:**

| ID | Requirement |
|----|-------------|
| FACT-01 | Factory can register with phone, name, email, password |
| FACT-02 | Registration atomically creates User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) |
| SUB-01 | Trial subscription auto-created on factory registration (14 days) |
| SUB-02 | Subscription enforcement — write operations blocked when TRIAL expired or PAID cancelled |
| SUB-03 | Per-driver pricing — 1 admin free, paid per driver per month |

**Dependencies:** Phase 01 complete (DATA-01, DATA-02, DATA-04, FACT-03 required)

**Success Criteria:**
1. Registration route creates Factory record + ADMIN User + TRIAL Subscription atomically in a Prisma transaction
2. Subscription enforcement middleware reads subscription status; expired TRIAL or cancelled PAID returns 403 on all mutating requests
3. Driver count tracked on Subscription; write operations that add a 2nd+ driver require an active PAID subscription
4. FACT-04 (grace period) is NOT in this phase — that belongs to Phase 04

---

## Phase 03: Subscription Management + Super Admin Dashboard

**Goal:** Complete subscription billing workflow (manual payment confirmation, VietQR) and build the Super Admin dashboard for system-wide tenant management.

**Requirements:**

| ID | Requirement |
|----|-------------|
| SUB-04 | Manual payment confirmation — Admin records payment, extends +30 days |
| SUB-05 | VietQR content template for payment reference |
| SADM-02 | Tenant list dashboard — all factories, subscription status, driver count, days remaining |
| SADM-03 | Activate/deactivate tenant subscription from dashboard |
| SADM-04 | Extend trial or subscription period (admin override) |
| SADM-05 | Set price per driver |

**Dependencies:** Phase 01 (SADM-01), Phase 02 (SUB-01, SUB-02)

**Success Criteria:**
1. Admin can record a payment against a factory's subscription, extending it by 30 days from current expiry
2. VietQR payment slip shows factory name + subscription reference code; template renders correctly on thermal printer
3. Super Admin dashboard lists all factories with subscription status, driver count, trial/subscription days remaining
4. Super Admin can activate/deactivate any tenant's subscription from the dashboard
5. Super Admin can override and extend any tenant's trial or subscription expiry date
6. Super Admin can configure the per-driver monthly price

---

## Phase 04: Integration — Factory-Scoped v1.0 Features + Grace Period

**Goal:** Ensure all v1.0 existing features work correctly within the factory-scoped model; implement the 7-day grace period after cancellation.

**Requirements:**

| ID | Requirement |
|----|-------------|
| INT-01 | All v1.0 entities (Customer, Order, Driver, Product) properly factory-scoped |
| INT-02 | Per-customer pricing works within factory scope (CustomerPriceOverride scoped via customer.factoryId) |
| INT-03 | RBAC middleware extended with SUPER_ADMIN bypass |
| INT-04 | Delivery slips filtered by factory (via order.factoryId) |
| INT-05 | Driver web-view scoped to factory (via driver.factoryId) |
| FACT-04 | 7-day grace period after cancellation (read-only), then locked |

**Dependencies:** Phase 01 (DATA-01 through DATA-05, SADM-01), Phase 02 (FACT-03, SUB-02)

**Success Criteria:**
1. All existing v1.0 queries and mutations use factoryId scoping via tenant middleware; no data leaks across factories
2. CustomerPriceOverride joined through customer.factoryId correctly retrieves factory-scoped price list
3. RBAC middleware allows SUPER_ADMIN to bypass factoryId filter; regular ADMIN/STAFF always scoped
4. Delivery slip endpoint filters by order.factoryId; driver web-view returns only their factory's orders
5. After cancellation, tenant enters 7-day grace period (read-only); after grace period expires, all writes return 403

---

## Summary

| Phase | Requirements | Key Deliverables |
|-------|-------------|-----------------|
| 01 | DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, FACT-03, SADM-01 (7 total) | factoryId data layer, Factory model, SUPER_ADMIN role |
| 02 | FACT-01, FACT-02, SUB-01, SUB-02, SUB-03 (5 total) | Factory registration, trial subscription, subscription enforcement |
| 03 | SUB-04, SUB-05, SADM-02, SADM-03, SADM-04, SADM-05 (6 total) | Payment confirmation, VietQR, Super Admin dashboard |
| 04 | INT-01, INT-02, INT-03, INT-04, INT-05, FACT-04 (6 total) | v1.0 factory-scoped integration, 7-day grace period |
| **Total** | **24 requirements** | |

---

*Last updated: 2026-04-17*