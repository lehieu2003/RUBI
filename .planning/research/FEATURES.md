# Multi-tenant Factory Architecture — Feature Research

**Research date:** 2026-04-17
**Scope:** Factory onboarding, trial subscriptions, Super Admin dashboard, tenant management
**Downstream consumer:** gsd-planner — feature table stakes vs differentiators, complexity, dependencies on existing v1.0 order/customer/product system

---

## Category 1: Factory Management

### Feature 1.1: Factory Registration Flow
**Complexity:** MEDIUM
**Dependencies:** Auth system, Subscription model, User (ADMIN)

**Table stakes behavior (must have):**
- Registration form: Phone + Factory Name + Email + Password (phone/factory-name first per D-01)
- Creates User record with role=ADMIN, isFactoryOwner=true
- Creates Subscription record atomically (TRIAL plan, 14-day endDate, ACTIVE status)
- Factory identified by ADMIN user id (factoryId on User)

**Differentiators (IceFlow-specific):**
- Phone-first UX to feel "business registration" not "personal signup"
- No credit card required for trial (D-01)
- Trial starts on registration date, not first login (D-03)

**Edge cases:**
- Duplicate phone / email → clear error, no partial state
- Registration creates User + Subscription in single Prisma transaction (D-02)

---

### Feature 1.2: Tenant Activation / Deactivation
**Complexity:** LOW
**Dependencies:** Subscription model, User.role, middleware

**Table stakes behavior:**
- Tenant active when Subscription.status = ACTIVE and (planType = PAID OR (planType = TRIAL AND endDate > now))
- Deactivation = Subscription.status set to CANCELLED or EXPIRED
- All write operations blocked when inactive (middleware + per-route check)

**Differentiators:**
- 7-day grace period after cancel (read-only access continues, writes blocked) (D-15)
- Yellow/orange persistent banner on ALL pages during grace / warning period (D-05, D-06)
- 3-day warning modal on login for Admin only (non-dismissible) (D-06)

**Edge cases:**
- Cannot deactivate via UI in v1 — direct DB only
- Cancel triggered by user confirms → data export → 7-day grace → auto-lock

---

### Feature 1.3: Per-customer Pricing (existing, v1.0)
**Complexity:** LOW
**Dependencies:** Customer, Product, CustomerPriceOverride, GlobalPrice

**Existing behavior:**
- GlobalPrice: default price per product across all customers
- CustomerPriceOverride: per-customer, per-product price (takes precedence)
- Order entry reads price per customer dynamically (not stored on Order)

**Integration note for multi-tenant:** CustomerPriceOverride and GlobalPrice are per-factory-scoped via customer.fatoryId link. Need factoryId on Customer model or scope queries by ADMIN factory.

---

## Category 2: Subscription Management

### Feature 2.1: Trial Subscription Creation
**Complexity:** LOW
**Dependencies:** Subscription model (already in schema.prisma), User, registration flow

**Table stakes behavior:**
- Created atomically with User on registration
- planType = TRIAL, status = ACTIVE, endDate = now + 14 days
- No payment info collected

**Implementation notes:**
- Subscription.factoryId = ADMIN User.id
- Subscription.driverCount = 0 initially
- Subscription.pricePerDriver = null until PAID plan set

---

### Feature 2.2: Subscription Plan Management (Basic / Premium)
**Complexity:** MEDIUM
**Dependencies:** Subscription model, SubscriptionPlan/SubscriptionStatus enums, Driver model

**Table stakes behavior:**
- Plan types: TRIAL (14-day), PAID (monthly)
- PAID plan has: driverCount (active drivers), pricePerDriver (monthly rate)
- Per-driver pricing: 1 admin always free, charge only for drivers (D-08, D-09)
- Single price per driver/month — no tier complexity (D-10)

**Differentiators:**
- Payment recording: Admin manually confirms payment to extend subscription +30 days (D-11)
- VietQR content template: `THANH TOAN ICEFLOW [FACTORY_NAME] [MONTH/YEAR]`
- No actual payment gateway integration in v1 — manual confirmation only

**Edge cases:**
- Driver count changes mid-period → recalculate at next billing cycle
- Trial expires → all writes blocked, read-only banner shown
- Subscription unique by factoryId (one active subscription per factory at a time)

---

### Feature 2.3: Subscription Status Transitions
**Complexity:** MEDIUM
**Dependencies:** Subscription model, middleware, read-only enforcement

**Valid transitions:**
- TRIAL (ACTIVE) → PAID (ACTIVE): on payment confirmation
- TRIAL (ACTIVE) → EXPIRED: trial endDate passed, no payment
- PAID (ACTIVE) → CANCELLED: user-initiated cancel
- CANCELLED → (grace period) → locked: 7 days read-only, then account locked

**Implementation requirements:**
- Middleware checks subscription on every write request → 403 if inactive
- Per-route subscription check as defense-in-depth (D-04)
- Subscription status helpers: isSubscriptionActive(), getDaysRemaining()

---

## Category 3: Super Admin Dashboard

### Feature 3.1: Super Admin Role
**Complexity:** LOW
**Dependencies:** User model, UserRole enum

**Table stakes behavior:**
- New role: SUPER_ADMIN (above ADMIN) — system-wide access
- Can view all factories, all tenants
- Can activate/deactivate any tenant's subscription

**Differentiators:**
- IceFlow is solo-dev; Super Admin = developer operations only
- Not a user-facing role in v1 — backend-only for tenant management

**Schema implications:**
- UserRole enum needs SUPER_ADMIN value added
- Middleware checks: SUPER_ADMIN bypasses factory-scoped access controls

---

### Feature 3.2: Tenant Management Dashboard
**Complexity:** HIGH
**Dependencies:** Subscription, User, Customer, Order, Driver, Super Admin role

**Table stakes behavior:**
- List all factories (Tenant list with: factory name, subscription status, plan, days remaining/expired, driver count, created date)
- View per-tenant: order volume, revenue (if PAID), usage stats
- Activate / deactivate tenant subscription
- Extend trial or subscription period (admin override)
- View all users per tenant

**Differentiators:**
- Factory owner info linked via isFactoryOwner=true, role=ADMIN User
- Subscription status banner per tenant (active trial, active paid, grace period, expired)
- Per-tenant QuickBooks-style usage dashboard

**Edge cases:**
- Tenant with no Subscription record (orphaned) → show warning
- Tenant with cancelled subscription attempting to login → show grace period or locked

---

### Feature 3.3: Subscription Plan Management (Super Admin)
**Complexity:** MEDIUM
**Dependencies:** SubscriptionPlan, SubscriptionStatus enums, pricing config

**Table stakes behavior:**
- Set/change pricing: pricePerDriver per month
- Define plan types (Basic, Premium — though IceFlow may use single PAID tier)
- View payment history per tenant (manual payment records)

**Differentiators:**
- Manual payment confirmation: Admin records payment → subscription extended +30 days
- VietQR content displayed on billing page for tenant to scan
- No automatic payment collection in v1

---

## Cross-Cutting Concerns

### Factory Scoping
**All existing v1.0 entities must be factory-scoped:**
- Customer: needs factoryId field (or scoped by ADMIN User)
- Order: scoped via customer.factoryId
- Product: may be global or factory-scoped (TBD — if ice bag sizes are universal, global is fine)
- Driver: needs factoryId field
- User: already has factoryId field

**Current schema gap:** Customer, Order, Driver, Product do NOT have factoryId. They are currently shared across all tenants (single-tenant). Multi-tenant requires:
- Add factoryId to Customer, Order, Driver (User already has it)
- Add factoryId to Product (if per-factory products)
- Scope ALL queries by factoryId

### RBAC (existing v1.0)
- ADMIN, ACCOUNTANT, STAFF within a factory
- SUPER_ADMIN for system-wide operations
- Middleware + adaptive sidebar already implemented

### Dependencies on Existing v1.0 Features

| Existing Feature | Multi-tenant Dependency | Change Required |
|-----------------|------------------------|-----------------|
| Order entry | Orders must be factory-scoped | Add factoryId to Order, scope queries |
| Customer management | Customers must be factory-scoped | Add factoryId to Customer, scope queries |
| Per-customer pricing | CustomerPriceOverride scoped correctly | Scope by customer.factoryId |
| Driver assignment | Drivers must be factory-scoped | Add factoryId to Driver, scope queries |
| Delivery slips | Must filter by factory | Already filtered via order.customer.factoryId |
| Inventory | May be factory-scoped | Add factoryId to Inventory or keep global |
| RBAC (middleware, sidebar) | Super Admin role needs adding | Add SUPER_ADMIN to UserRole enum |

---

## Complexity Summary

| Feature | Complexity | Reason |
|---------|------------|--------|
| Factory registration flow | MEDIUM | Atomic User + Subscription creation, phone-first UX |
| Tenant activation/deactivation | LOW | Status flag + middleware |
| Trial subscription creation | LOW | Schema already has Subscription model |
| Subscription plan management | MEDIUM | Per-driver pricing, manual payment recording |
| Subscription status transitions | MEDIUM | Middleware + per-route enforcement |
| Super Admin role | LOW | New enum value + middleware bypass |
| Tenant management dashboard | HIGH | Full CRUD on all tenants, usage stats |
| Super Admin plan management | MEDIUM | Pricing config, payment records |
| Factory scoping (all entities) | HIGH | Cross-cutting schema change on 5+ models |

---

## Key Findings

1. **Schema changes required for multi-tenancy:** Customer, Order, Driver need factoryId. Product may need factoryId. All queries must be factory-scoped.

2. **Subscription model already exists** with planType (TRIAL/PAID), status (ACTIVE/CANCELLED/EXPIRED), startDate, endDate, driverCount, pricePerDriver — sufficient for v1.

3. **Read-only enforcement** uses dual-layer: middleware blocks writes on inactive subscriptions + per-route defense-in-depth checks.

4. **Super Admin is backend-only** in v1 — not user-facing, used for operational tenant management.

5. **No payment gateway integration** in v1 — manual payment confirmation extends subscription +30 days. VietQR displayed as payment reference string.

6. **Trial expiration → 7-day grace period → locked** (not immediate deletion).

7. **Excel export on cancel** — two-sheet (customer debt + order history) via xlsx library — already researched in Phase 6.