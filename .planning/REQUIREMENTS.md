# Requirements: IceFlow SaaS

**Defined:** 2026-04-14
**Core Value:** Speed over everything — staff must enter orders faster than writing by hand (30 seconds), or they reject the system and return to pen-and-paper.

---

## v1 Requirements (Shipped in v1.0)

### Order Entry

- [x] **ORD-01**: Office staff can look up wholesale customer by code and see name instantly — Phase 1
- [x] **ORD-02**: Office staff can add products (ice bags by size) to an order with minimal keystrokes — Phase 1
- [x] **ORD-03**: Order total calculates automatically using customer's negotiated price list — Phase 1
- [x] **ORD-04**: Office staff can save and retrieve orders by customer or date — Phase 1

### Delivery

- [x] **DLVR-01**: Office staff can print a delivery slip from any order with one click — Phase 2
- [x] **DLVR-02**: Printed slip shows customer name, address, products, quantities, and total — Phase 2
- [x] **DLVR-03**: Printed slip includes a signature line for customer acknowledgment — Phase 2
- [x] **DLVR-04**: Slip prints correctly on A5 paper and thermal printers (80mm) — Phase 2
- [x] **DLVR-05**: Driver can open a URL on their phone and see today's delivery list — Phase 3
- [x] **DLVR-06**: Driver delivery list shows customer name, address, products, quantities — Phase 3
- [x] **DLVR-07**: Driver delivery list updates as new orders are added (refresh-based) — Phase 3
- [x] **DLVR-08**: Interface is dead simple — suitable for drivers with minimal tech literacy — Phase 3

### Inventory & Debt

- [x] **INVD-01**: Accountant can view a list of delivered slips returned by drivers at day end — Phase 5
- [x] **INVD-02**: Accountant can enter actual delivered quantity for each line item (handwritten notes from driver) — Phase 5
- [x] **INVD-03**: System auto-deducts confirmed quantities from cold inventory after confirmation — Phase 5
- [x] **INVD-04**: Customer debt balance updates automatically after delivery confirmation — Phase 5
- [x] **INVD-05**: Owner can view daily debt report showing all outstanding customer balances — Phase 5
- [x] **INVD-06**: System tracks shell/bag deposits owed by each customer separately — Phase 5
- [x] **INVD-07**: Owner can see which customers owe deposits and how much — Phase 5

### Configuration

- [x] **CFG-01**: Products (ice types and bag sizes) can be configured in the system — Phase 1
- [x] **CFG-02**: Each customer has a price list with negotiated rates per product — Phase 1
- [x] **CFG-03**: Customer records include name, code, address, phone, and price list reference — Phase 1

---

## v2 Requirements (Multi-tenant Factory Architecture — v2.0)

Requirements for milestone v2.0 — Multi-tenant Factory Architecture.

### Factory Management

- [ ] **FACT-01**: Factory can register with phone, name, email, password
- [ ] **FACT-02**: Registration atomically creates User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days)
- [ ] **FACT-03**: Tenant activation/deactivation via subscription status
- [ ] **FACT-04**: 7-day grace period after cancellation (read-only), then locked

### Subscription

- [ ] **SUB-01**: Trial subscription auto-created on factory registration (14 days)
- [ ] **SUB-02**: Subscription enforcement — write operations blocked when TRIAL expired or PAID cancelled
- [ ] **SUB-03**: Per-driver pricing — 1 admin free, paid per driver per month
- [ ] **SUB-04**: Manual payment confirmation — Admin records payment → extends +30 days
- [ ] **SUB-05**: VietQR content template for payment reference

### Super Admin

- [ ] **SADM-01**: SUPER_ADMIN role above ADMIN — system-wide access, no factory filter
- [ ] **SADM-02**: Tenant list dashboard — all factories, subscription status, driver count, days remaining
- [ ] **SADM-03**: Activate/deactivate tenant subscription from dashboard
- [ ] **SADM-04**: Extend trial or subscription period (admin override)
- [ ] **SADM-05**: Set price per driver

### Data Layer (Cross-cutting)

- [x] **DATA-01**: Add factoryId to Customer, Driver, Order, Product (and backfill existing records)
- [ ] **DATA-02**: Prisma tenant middleware auto-injects factoryId into all queries via `$extends` + AsyncLocalStorage
- [ ] **DATA-03**: Super Admin queries bypass factoryId filter (SUPER_ADMIN role flag)
- [ ] **DATA-04**: Middleware enforces subscription status on every write request (403 if inactive)
- [x] **DATA-05**: Unique constraints are factory-scoped — e.g. Customer.code is unique only within a Factory (use `@@unique([code, factoryId])` in Prisma). Factory A's KH01 and Factory B's KH01 are distinct records.

### Integration (v1.0 existing features)

- [ ] **INT-01**: All v1.0 entities (Customer, Order, Driver, Product) properly factory-scoped
- [ ] **INT-02**: Per-customer pricing works within factory scope (CustomerPriceOverride scoped via customer.factoryId)
- [ ] **INT-03**: RBAC middleware extended with SUPER_ADMIN bypass
- [ ] **INT-04**: Delivery slips filtered by factory (via order.factoryId)
- [ ] **INT-05**: Driver web-view scoped to factory (via driver.factoryId)

---

## v2 Future (Deferred)

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

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payment gateway integration (Stripe, VNPay, etc.) | Manual payment confirmation sufficient for v2.0 |
| Automatic billing or subscription renewal | Admin manually records payment and extends |
| Multi-warehouse support | Single factory, single warehouse |
| Real-time GPS tracking | Not required for delivery workflow |
| Native mobile apps | Web-only sufficient for drivers |
| Schema-per-tenant database | Operational complexity too high for solo dev |
| Native mobile app (iOS/Android) | Web-only sufficient for driver web-view; solo dev can't maintain multiple codebases |
| Real-time GPS tracking of trucks | Not required for v1; adds complexity without solving core problems |
| Offline support | Always-online operation is acceptable; ice factories have stable power/internet |
| Hot inventory tracking | Refrigerated inventory only; non-refrigerated supplies in v2 |
| Automatic reorder suggestions | Staff can manually decide when to produce more |
| Employee timekeeping/payroll | Separate from core order flow; defer to v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FACT-01 | 02 | Pending |
| FACT-02 | 02 | Pending |
| FACT-03 | 01 | Pending |
| FACT-04 | 04 | Pending |
| SUB-01 | 02 | Pending |
| SUB-02 | 02 | Pending |
| SUB-03 | 02 | Pending |
| SUB-04 | 03 | Pending |
| SUB-05 | 03 | Pending |
| SADM-01 | 01 | Pending |
| SADM-02 | 03 | Pending |
| SADM-03 | 03 | Pending |
| SADM-04 | 03 | Pending |
| SADM-05 | 03 | Pending |
| DATA-01 | 01 | Complete |
| DATA-02 | 01 | Pending |
| DATA-03 | 01 | Pending |
| DATA-04 | 01 | Pending |
| DATA-05 | 01 | Complete |
| INT-01 | 04 | Pending |
| INT-02 | 04 | Pending |
| INT-03 | 04 | Pending |
| INT-04 | 04 | Pending |
| INT-05 | 04 | Pending |

**Coverage:**

- v1 requirements: 20 total — all mapped, all complete
- v2 requirements: 24 total — all mapped to phases 01–04

---

*Requirements defined: 2026-04-14*
*Last updated: 2026-04-17 after v2.0 milestone definition (multi-tenant)*