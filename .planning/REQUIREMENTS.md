# Requirements: IceFlow SaaS

**Defined:** 2026-04-14
**Core Value:** Speed over everything — staff must enter orders faster than writing by hand (30 seconds), or they reject the system and return to pen-and-paper.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Order Entry

- [ ] **ORD-01**: Office staff can look up wholesale customer by code and see name instantly
- [ ] **ORD-02**: Office staff can add products (ice bags by size) to an order with minimal keystrokes
- [ ] **ORD-03**: Order total calculates automatically using customer's negotiated price list
- [ ] **ORD-04**: Office staff can save and retrieve orders by customer or date

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

- [ ] **INVD-01**: Accountant can view a list of delivered slips returned by drivers at day end
- [ ] **INVD-02**: Accountant can enter actual delivered quantity for each line item (handwritten notes from driver)
- [ ] **INVD-03**: System auto-deducts confirmed quantities from cold inventory after confirmation
- [ ] **INVD-04**: Customer debt balance updates automatically after delivery confirmation
- [ ] **INVD-05**: Owner can view daily debt report showing all outstanding customer balances
- [ ] **INVD-06**: System tracks shell/bag deposits owed by each customer separately
- [ ] **INVD-07**: Owner can see which customers owe deposits and how much

### Configuration

- [ ] **CFG-01**: Products (ice types and bag sizes) can be configured in the system
- [ ] **CFG-02**: Each customer has a price list with negotiated rates per product
- [ ] **CFG-03**: Customer records include name, code, address, phone, and price list reference

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Employee Management

- **EMP-01**: Employee records (drivers, factory workers) with contact info
- **EMP-02**: Work shift scheduling and assignment
- **EMP-03**: Daily production input (bags packed per shift per worker)
- **EMP-04**: Performance tracking (deliveries completed, bags packed per person)

### Vehicle & Asset

- **VEH-01**: Vehicle records with fuel log
- **VEH-02**: Maintenance scheduling and reminders
- **VEH-03**: Daily electricity consumption tracking for cold storage
- **VEH-04**: Consumables inventory (packaging materials, ties, cleaning chemicals)

### Financial

- **FIN-01**: Cash flow tracking (daily collections by driver)
- **FIN-02**: P&L report (revenue - cost of goods - operating expenses = profit)
- **FIN-03**: Monthly profit analysis by product category
- **FIN-04**: Seasonal sales comparison (year-over-year, weather correlation)

### Customer Management

- **CUST-01**: Customer-level sales history and analytics
- **CUST-02**: Automatic debt reminder notifications
- **CUST-03**: Customer credit limit and overdue lockout

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile app (iOS/Android) | Web-only sufficient for driver web-view; solo dev can't maintain multiple codebases |
| Real-time GPS tracking of trucks | Not required for v1; adds complexity without solving core problems |
| Offline support | Always-online operation is acceptable; ice factories have stable power/internet |
| Multi-warehouse support | Single factory operation in v1 scope |
| Hot inventory tracking | Refrigerated inventory only; non-refrigerated supplies in v2 |
| Automatic reorder suggestions | Staff can manually decide when to produce more |
| Employee timekeeping/payroll | Separate from core order flow; defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ORD-01 | Phase 1 | Pending |
| ORD-02 | Phase 1 | Pending |
| ORD-03 | Phase 1 | Pending |
| ORD-04 | Phase 1 | Pending |
| CFG-01 | Phase 1 | Pending |
| CFG-02 | Phase 1 | Pending |
| CFG-03 | Phase 1 | Pending |
| DLVR-01 | Phase 2 | Complete |
| DLVR-02 | Phase 2 | Complete |
| DLVR-03 | Phase 2 | Complete |
| DLVR-04 | Phase 2 | Complete |
| DLVR-05 | Phase 3 | Complete |
| DLVR-06 | Phase 3 | Complete |
| DLVR-07 | Phase 3 | Complete |
| DLVR-08 | Phase 3 | Complete |
| INVD-01 | Phase 4 | Pending |
| INVD-02 | Phase 4 | Pending |
| INVD-03 | Phase 4 | Pending |
| INVD-04 | Phase 4 | Pending |
| INVD-05 | Phase 4 | Pending |
| INVD-06 | Phase 4 | Pending |
| INVD-07 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*