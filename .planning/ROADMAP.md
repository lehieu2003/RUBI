# Roadmap: IceFlow SaaS

## Overview

IceFlow SaaS replaces pen-and-paper/Zalo workflows for ice factories with fast digital order entry, printed delivery slips, driver web-view, and automated inventory/debt tracking. The system must be faster than writing by hand (30-second order entry) to earn staff adoption.

## Phases

- [x] **Phase 1: Foundation & Order Entry** - Fast order entry UI with customer/product data and per-customer pricing ✅
- [x] **Phase 2: Delivery Slips** - Printed A5/thermal slips with customer signature line ✅
- [x] **Phase 3: Driver Delivery View** - Mobile web-view for drivers to see daily delivery list ✅ (completed 2026-04-16)
- [ ] **Phase 4: Status Enum Fixes & API Hardening** - Fix status enum mismatches, add confirm endpoint token validation
- [ ] **Phase 5: Reconciliation & Reporting** - Accountant confirmation, auto-deduct inventory, debt tracking, and owner reports

## Phase Details

### Phase 1: Foundation & Order Entry
**Goal**: Office staff can enter wholesale orders faster than writing by hand, with each customer having their own negotiated price list
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-07
**Success Criteria** (what must be TRUE):
  1. Office staff can look up customer by code and see their name instantly
  2. Office staff can add products to an order with quantity using minimal keystrokes
  3. Order total calculates automatically using customer-specific prices
  4. Office staff can save and retrieve orders by customer or date
  5. Products and customer price lists can be configured in the system
**Plans**: 3 plans

Plans:
- [x] 01-01: Customer and product data models with seed data ✅
- [x] 01-02: Fast order entry UI (30-second target) ✅
- [x] 01-03: Per-customer price list management ✅

### Phase 2: Delivery Slips
**Goal**: Printed delivery slips (A5 or thermal) with customer signature line for drivers to collect
**Depends on**: Phase 1
**Requirements**: REQ-02
**Success Criteria** (what must be TRUE):
  1. Office staff can print a delivery slip from an order with one click
  2. Printed slip shows customer name, products, quantities, and total
  3. Printed slip includes a signature line for customer acknowledgment
  4. Slip prints correctly on A5 paper and thermal printers
**Plans**: 2 plans

Plans:
- [x] 02-01: Delivery slip print template and print integration
- [x] 02-02: Print button on order detail view

### Phase 3: Driver Delivery View
**Goal**: Drivers can view their daily delivery list on phone via web-view (no app install required)
**Depends on**: Phase 2
**Requirements**: REQ-03
**Success Criteria** (what must be TRUE):
  1. Driver can open a URL on their phone and see today's deliveries
  2. Driver sees customer name, address, products, and quantities for each delivery
  3. Delivery list updates as new orders are added (daily refresh)
  4. Interface is dead simple — suitable for drivers with minimal tech literacy
**Plans**: 2 plans

Plans:
- [x] 03-01: Database schema (Driver model, Order.driverId, Order.deliveryGps) + API routes (driver auth, orders fetch, GPS confirm, bulk-assign, admin map data)
- [x] 03-02: Driver web-view UI (token page, DeliveryCard, EmptyState, DriverMap)

### Phase 4: Status Enum Fixes & API Hardening
**Goal**: Fix status enum mismatches in API and components; add driver token validation to confirm endpoint
**Depends on**: Phase 3
**Gaps Closed**: Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. GET /api/orders status filter uses correct enum values (PENDING/SHIPPING/DELIVERED/COMPLETED/CANCELLED)
  2. recent-orders.tsx uses correct status types matching Prisma schema
  3. PATCH /api/orders/[id]/confirm validates driver token before confirming delivery
  4. Phase 1 has VERIFICATION.md documenting requirements coverage

### Phase 5: Reconciliation & Reporting
**Goal**: Accountant confirms delivered quantities, system auto-deducts inventory and updates customer debt; owner sees daily debt report
**Depends on**: Phase 3
**Requirements**: INVD-01, INVD-02, INVD-03, INVD-04, INVD-05, INVD-06, INVD-07
**Success Criteria** (what must be TRUE):
  1. Accountant can view a list of delivered slips returned by drivers at day end
  2. Accountant can enter actual delivered quantity for each line item
  3. System auto-deducts confirmed quantities from inventory records
  4. Customer debt balance updates automatically after confirmation (quantity × price)
  5. Owner can view daily debt report showing all outstanding balances
  6. System tracks shell/bag deposits owed by each customer separately
  7. Owner can see which customers owe deposits and how much
**Plans**: 4 plans

Plans:
- [x] 04-01: Delivery confirmation workflow (slip return → quantity confirm)
- [ ] 04-02: Inventory deduction and debt update logic
- [ ] 04-03: Daily debt report for owner
- [ ] 04-04: Shell/bag deposit tracking per customer

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Order Entry | 3/3 | ✅ Complete | 2026-04-15 |
| 2. Delivery Slips | 2/2 | ✅ Complete | 2026-04-16 |
| 3. Driver Delivery View | 2/2 | ✅ Complete | 2026-04-16 |
| 4. Status Enum Fixes & API Hardening | 0/0 | Not started | - |
| 5. Reconciliation & Reporting | 1/4 | In Progress | - |

### Phase 6: Trial, Pricing & Onboarding
**Goal**: Convert ice factory owners from pen-and-paper to IceFlow SaaS through frictionless 14-day trial + clear, flexible pricing
**Depends on**: Phase 5 (payment-integration)
**Requirements**: REQ-10 (trial), REQ-11 (pricing), REQ-12 (onboarding)
**Success Criteria** (what must be TRUE):
  1. Owner can start free trial with just phone number + factory name — no credit card required
  2. Owner gets full access to all v1 features during trial (order entry, print slips, debt tracking, inventory)
  3. System helps owner import existing customer list and price lists during onboarding
  4. Dashboard shows trial countdown (12 days left) with upgrade CTA before trial expires
  5. Owner can upgrade to paid plan with per-driver pricing (1 admin + N driver accounts)
  6. Owner can cancel anytime — "use month-to-month, pay for what you use"
  7. If owner cancels, system exports all customer data and debt balances to Excel
  8. Payment via bank transfer or VietQR (common in Vietnam)
  9. Trial expiration warning appears 3 days before end date with support contact
**Plans**: 5 plans

Plans:
- [ ] 06-01a: Backend foundation (Subscription model, atomic register API, subscription helpers)
- [ ] 06-01b: Frontend UI (register page reorder, trial banner, warning modal, middleware extension)
- [ ] 06-02: Pricing dashboard + VietQR + payment recording + onboarding wizard + customer import API
- [ ] 06-03: Cancel flow + two-sheet Excel export + grace period enforcement + subscription update API
- [ ] 06-04: Integration (AppShell, /api/auth/me, auth provider subscription, login warning modal, dashboard onboarding prompt)

**Wave Structure:**
- Wave 1: 06-01a (backend schema + API, parallel)
- Wave 2: 06-01b (frontend components, depends on 06-01a prisma push)
- Wave 3: 06-02, 06-03 (both depend on 06-01b, parallel)
- Wave 4: 06-04 (depends on 06-01b and 06-03)
