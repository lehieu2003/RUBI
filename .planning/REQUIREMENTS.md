# Requirements: IceFlow SaaS v3.0

**Defined:** 2026-04-22
**Core Value:** Speed over everything — staff must enter orders faster than writing by hand (30 seconds), or they reject the system and return to pen-and-paper.

---

## v3.0 Requirements

Requirements for v3.0 Security Hardening + SaaS Readiness. Each maps to roadmap phases.

### Tenant Isolation (DATA)

- [ ] **DATA-01**: All tenant-scoped queries explicitly filter by `session.factoryId` — no reliance on AsyncLocalStorage auto-injection as sole mechanism
- [ ] **DATA-02**: Dashboard page reads only `factoryId`-scoped data — customers, products, orders, drivers all filtered by session.factoryId
- [ ] **DATA-03**: All customer/order/product/driver API GET routes filter by `factoryId` from session
- [ ] **DATA-04**: All customer/order/product/driver API POST/PATCH/DELETE routes set `factoryId` from session on created/updated entities
- [ ] **DATA-05**: Prisma $extends auto-inject fails-closed when `ctx.factoryId` is absent (no silent all-tenant queries)

### Auth Infrastructure (AUTH)

- [ ] **AUTH-01**: Shared `requireSession()` helper — returns session or throws 401 Unauthorized
- [ ] **AUTH-02**: Shared `requireFactoryId()` helper — extracts factoryId from session or throws 400 Bad Request
- [ ] **AUTH-03**: Shared `requireRole(roles[])` helper — checks session role against allowed roles or throws 403 Forbidden
- [ ] **AUTH-04**: Shared `requireActiveSubscription()` helper — verifies subscription is ACTIVE/PAID or throws 403 Subscription Required
- [x] **AUTH-05**: Auth helpers work across API Route Handlers and Server Actions
- [x] **AUTH-06**: All write API endpoints use auth helpers before processing requests

### Input Validation (VALI)

- [ ] **VALI-01**: Registration endpoint validates input with Zod v4 schema (name, phone, managerName, email, password)
- [ ] **VALI-02**: Email is normalized: `trim().toLowerCase()` before storage
- [ ] **VALI-03**: Password strength enforced: minimum 8 characters
- [ ] **VALI-04**: Login endpoint validates input with Zod v4 schema
- [ ] **VALI-05**: All API endpoints return 400 with Zod validation errors on invalid input

### Registration + Onboarding (REG)

- [ ] **REG-01**: Registration API returns `nextUrl` in response body (e.g., `/onboarding` for new factory owners)
- [ ] **REG-02**: Registration client redirects to `nextUrl` from response instead of hardcoded `/dashboard`
- [ ] **REG-03**: Factory model has `onboardingCompleted: boolean` field
- [ ] **REG-04**: Onboarding state updated to `onboardingCompleted: true` when CSV import succeeds
- [ ] **REG-05**: Dashboard shows onboarding prompt for ADMIN users when `onboardingCompleted === false`

### Rate Limiting (RATEL)

- [ ] **RATEL-01**: Login endpoint enforces rate limit: 5 attempts per IP per minute
- [ ] **RATEL-02**: Registration endpoint enforces rate limit: 3 attempts per IP per minute
- [ ] **RATEL-03**: Rate limit exceeded returns 429 Too Many Requests with retry-after header

### Build Correctness (BUILD)

- [ ] **BUILD-01**: `npx tsc --noEmit -p tsconfig.json` passes with no errors
- [ ] **BUILD-02**: `npm run build` completes successfully
- [ ] **BUILD-03**: Prisma Decimal fields serialized to string before passing to client components
- [ ] **BUILD-04**: Seed scripts create entities with proper `factoryId` field values
- [ ] **BUILD-05**: `tenant-table.tsx` SortIcon moved out of render (no React Compiler errors)

### Subscription Enforcement (SUBS)

- [ ] **SUBS-01**: Middleware reads `data.subscription` correctly from `/api/billing/subscription` response
- [ ] **SUBS-02**: Middleware fails closed (blocks request) when subscription endpoint returns non-OK
- [ ] **SUBS-03**: Subscription enforcement available as route-level helper for write operations

### Security Hardening (SEC)

- [x] **SEC-01**: JWT_SECRET env var is required — app fails to start if missing in production
- [x] **SEC-02**: No seed scripts print SUPER_ADMIN JWT tokens to console
- [x] **SEC-03**: No hardcoded JWT secret fallbacks in production code

### Role-Based Access Control (RBAC)

- [x] **RBAC-01**: Route middleware correctly enforces ADMIN/ACCOUNTANT/STAFF role access patterns
- [x] **RBAC-02**: Route middleware redirects unauthorized access to `/dashboard?error=unauthorized`
- [x] **RBAC-03**: Adaptive sidebar filters menu items by role (STAFF sees minimal menu)
- [x] **RBAC-04**: SUPER_ADMIN bypasses factoryId filter only on explicitly needed operations
- [x] **RBAC-05**: All write API endpoints enforce role checks via auth helpers

---

## v2.0 Requirements (from previous milestone — in progress)

### Factory Management

- [ ] **FACT-01**: Factory can register with phone, name, email, password
- [ ] **FACT-02**: Registration atomically creates User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days)
- [x] **FACT-03**: Tenant activation/deactivation via subscription status
- [ ] **FACT-04**: 7-day grace period after cancellation (read-only), then locked

### Subscription

- [ ] **SUB-01**: Trial subscription auto-created on factory registration (14 days)
- [ ] **SUB-02**: Subscription enforcement — write operations blocked when TRIAL expired or PAID cancelled
- [ ] **SUB-03**: Per-driver pricing — 1 admin free, paid per driver per month
- [ ] **SUB-04**: Manual payment confirmation — Admin records payment extends +30 days
- [ ] **SUB-05**: VietQR content template for payment reference

### Super Admin

- [x] **SADM-01**: SUPER_ADMIN role above ADMIN — system-wide access, no factory filter
- [ ] **SADM-02**: Tenant list dashboard — all factories, subscription status, driver count, days remaining
- [ ] **SADM-03**: Activate/deactivate tenant subscription from dashboard
- [ ] **SADM-04**: Extend trial or subscription period (admin override)
- [ ] **SADM-05**: Set price per driver

### Data Layer (Cross-cutting)

- [x] **DATA-01**: Add factoryId to Customer, Driver, Order, Product (and backfill existing records)
- [x] **DATA-02**: Prisma tenant middleware auto-injects factoryId into all queries via `$extends` + AsyncLocalStorage
- [x] **DATA-03**: Super Admin queries bypass factoryId filter (SUPER_ADMIN role flag)
- [x] **DATA-04**: Middleware enforces subscription status on every write request (403 if inactive)
- [x] **DATA-05**: Unique constraints are factory-scoped — e.g. Customer.code is unique only within a Factory

### Integration (v1.0 existing features)

- [ ] **INT-01**: All v1.0 entities (Customer, Order, Driver, Product) properly factory-scoped
- [ ] **INT-02**: Per-customer pricing works within factory scope
- [ ] **INT-03**: RBAC middleware extended with SUPER_ADMIN bypass
- [ ] **INT-04**: Delivery slips filtered by factory (via order.factoryId)
- [ ] **INT-05**: Driver web-view scoped to factory (via driver.factoryId)

---

## v1.0 Requirements (Shipped)

### Order Entry

- [x] **ORD-01**: Office staff can look up wholesale customer by code and see name instantly
- [x] **ORD-02**: Office staff can add products (ice bags by size) to an order with minimal keystrokes
- [x] **ORD-03**: Order total calculates automatically using customer's negotiated price list
- [x] **ORD-04**: Office staff can save and retrieve orders by customer or date

### Delivery

- [x] **DLVR-01**: Office staff can print a delivery slip from any order with one click
- [x] **DLVR-02**: Printed slip shows customer name, address, products, quantities, and total
- [x] **DLVR-03**: Printed slip includes a signature line for customer acknowledgment
- [x] **DLVR-04**: Slip prints correctly on A5 paper and thermal printers (80mm)
- [x] **DLVR-05**: Driver can open a URL on their phone and see today's delivery list
- [x] **DLVR-06**: Driver delivery list shows customer name, address, products, quantities
- [x] **DLVR-07**: Driver delivery list updates as new orders are added (refresh-based)
- [x] **DLVR-08**: Interface is dead simple — suitable for drivers with minimal tech literacy

### Inventory & Debt

- [x] **INVD-01**: Accountant can view a list of delivered slips returned by drivers at day end
- [x] **INVD-02**: Accountant can enter actual delivered quantity for each line item
- [x] **INVD-03**: System auto-deducts confirmed quantities from cold inventory after confirmation
- [x] **INVD-04**: Customer debt balance updates automatically after delivery confirmation
- [x] **INVD-05**: Owner can view daily debt report showing all outstanding customer balances
- [x] **INVD-06**: System tracks shell/bag deposits owed by each customer separately
- [x] **INVD-07**: Owner can see which customers owe deposits and how much

### Configuration

- [x] **CFG-01**: Products (ice types and bag sizes) can be configured in the system
- [x] **CFG-02**: Each customer has a price list with negotiated rates per product
- [x] **CFG-03**: Customer records include name, code, address, phone, and price list reference

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Onboarding gate (redirect to /onboarding until completed) | Blocks staff during peak season, contradicts "Speed over everything" core value |
| Staff invite flow | Separate milestone — requires invitation email system |
| RLS at PostgreSQL level | Application-layer scoping sufficient for ice factory scale |
| Real-time GPS tracking | Out of scope per PROJECT.md |
| Cost/asset management | Phase 2+ |
| P&L reports | Phase 2+ |
| Payment gateway integration (Stripe, VNPay, etc.) | Manual payment confirmation sufficient for v2.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 6 | Pending |
| DATA-02 | Phase 6 | Pending |
| DATA-03 | Phase 6 | Pending |
| DATA-04 | Phase 6 | Pending |
| DATA-05 | Phase 6 | Pending |
| AUTH-01 | Phase 7 | Pending |
| AUTH-02 | Phase 7 | Pending |
| AUTH-03 | Phase 7 | Pending |
| AUTH-04 | Phase 7 | Pending |
| AUTH-05 | Phase 7B | Complete |
| AUTH-06 | Phase 7B | Complete |
| VALI-01 | Phase 7 | Pending |
| VALI-02 | Phase 7 | Pending |
| VALI-03 | Phase 7 | Pending |
| VALI-04 | Phase 7 | Pending |
| VALI-05 | Phase 7 | Pending |
| REG-01 | Phase 7 | Pending |
| REG-02 | Phase 7 | Pending |
| REG-03 | Phase 6 | Pending |
| REG-04 | Phase 7 | Pending |
| REG-05 | Phase 7 | Pending |
| RATEL-01 | Phase 7 | Pending |
| RATEL-02 | Phase 7 | Pending |
| RATEL-03 | Phase 7 | Pending |
| BUILD-01 | Phase 10 | Pending |
| BUILD-02 | Phase 10 | Pending |
| BUILD-03 | Phase 10 | Pending |
| BUILD-04 | Phase 6 | Pending |
| BUILD-05 | Phase 10 | Pending |
| SUBS-01 | Phase 8 | Pending |
| SUBS-02 | Phase 8 | Pending |
| SUBS-03 | Phase 8 | Pending |
| SEC-01 | Phase 6 / validated Phase 7B | Complete |
| SEC-02 | Phase 6 / validated Phase 7B | Complete |
| SEC-03 | Phase 6 / validated Phase 7B | Complete |
| RBAC-01 | Phase 7B | Complete |
| RBAC-02 | Phase 7B | Complete |
| RBAC-03 | Phase 7B | Complete |
| RBAC-04 | Phase 7B | Complete |
| RBAC-05 | Phase 7B | Complete |
| FACT-01 | Phase 7 | Pending |
| FACT-02 | Phase 7 | Pending |
| FACT-04 | Phase 8 | Pending |
| SUB-01 | Phase 7 | Pending |
| SUB-02 | Phase 8 | Pending |
| SUB-03 | Phase 8 | Pending |
| SUB-04 | Phase 8 | Pending |
| SUB-05 | Phase 8 | Pending |
| SADM-02 | Phase 9 | Pending |
| SADM-03 | Phase 9 | Pending |
| SADM-04 | Phase 9 | Pending |
| SADM-05 | Phase 9 | Pending |
| INT-01 | Phase 9 | Pending |
| INT-02 | Phase 9 | Pending |
| INT-03 | Phase 9 | Pending |
| INT-04 | Phase 9 | Pending |
| INT-05 | Phase 9 | Pending |

**Coverage:**
- v3.0 requirements: 40 total — all mapped (Phases 6-10)
- v2.0 in-progress: 19 total — all mapped (Phases 6-9)
- v1.0 complete: 20 total

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after Phase 7B verification*
