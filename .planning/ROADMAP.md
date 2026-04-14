# Roadmap: IceFlow SaaS

## Overview

IceFlow SaaS replaces pen-and-paper/Zalo workflows for ice factories with fast digital order entry, printed delivery slips, driver web-view, and automated inventory/debt tracking. The system must be faster than writing by hand (30-second order entry) to earn staff adoption.

## Phases

- [ ] **Phase 1: Foundation & Order Entry** - Fast order entry UI with customer/product data and per-customer pricing
- [ ] **Phase 2: Delivery Slips** - Printed A5/thermal slips with customer signature line
- [ ] **Phase 3: Driver Delivery View** - Mobile web-view for drivers to see daily delivery list
- [ ] **Phase 4: Reconciliation & Reporting** - Accountant confirmation, auto-deduct inventory, debt tracking, and owner reports

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
**Plans**: TBD

Plans:
- [ ] 01-01: Customer and product data models with seed data
- [ ] 01-02: Fast order entry UI (30-second target)
- [ ] 01-03: Per-customer price list management

### Phase 2: Delivery Slips
**Goal**: Printed delivery slips (A5 or thermal) with customer signature line for drivers to collect
**Depends on**: Phase 1
**Requirements**: REQ-02
**Success Criteria** (what must be TRUE):
  1. Office staff can print a delivery slip from an order with one click
  2. Printed slip shows customer name, products, quantities, and total
  3. Printed slip includes a signature line for customer acknowledgment
  4. Slip prints correctly on A5 paper and thermal printers
**Plans**: TBD

Plans:
- [ ] 02-01: Delivery slip print template and print integration
- [ ] 02-02: Print button on order detail view

### Phase 3: Driver Delivery View
**Goal**: Drivers can view their daily delivery list on phone via web-view (no app install required)
**Depends on**: Phase 2
**Requirements**: REQ-03
**Success Criteria** (what must be TRUE):
  1. Driver can open a URL on their phone and see today's deliveries
  2. Driver sees customer name, address, products, and quantities for each delivery
  3. Delivery list updates as new orders are added (daily refresh)
  4. Interface is dead simple — suitable for drivers with minimal tech literacy
**Plans**: TBD

Plans:
- [ ] 03-01: Driver web-view page with daily delivery list
- [ ] 03-02: Simple mobile-first layout for phone screens

### Phase 4: Reconciliation & Reporting
**Goal**: Accountant confirms delivered quantities, system auto-deducts inventory and updates customer debt; owner sees daily debt report
**Depends on**: Phase 3
**Requirements**: REQ-04, REQ-05, REQ-06, REQ-08, REQ-09
**Success Criteria** (what must be TRUE):
  1. Accountant can view a list of delivered slips returned by drivers at day end
  2. Accountant can enter actual delivered quantity for each line item
  3. System auto-deducts confirmed quantities from inventory records
  4. Customer debt balance updates automatically after confirmation (quantity × price)
  5. Owner can view daily debt report showing all outstanding balances
  6. System tracks shell/bag deposits owed by each customer separately
  7. Owner can see which customers owe deposits and how much
**Plans**: TBD

Plans:
- [ ] 04-01: Delivery confirmation workflow (slip return → quantity confirm)
- [ ] 04-02: Inventory deduction and debt update logic
- [ ] 04-03: Daily debt report for owner
- [ ] 04-04: Shell/bag deposit tracking per customer

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Order Entry | 0/3 | Not started | - |
| 2. Delivery Slips | 0/2 | Not started | - |
| 3. Driver Delivery View | 0/2 | Not started | - |
| 4. Reconciliation & Reporting | 0/4 | Not started | - |
