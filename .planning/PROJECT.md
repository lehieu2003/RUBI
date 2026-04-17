# IceFlow SaaS

## What This Is

Web-based order and inventory management system for ice factories. Replaces pen-and-paper/Zalo workflows with fast digital order entry, printed delivery slips, and automated inventory/debt tracking for 10-15 person operations with 2-4 delivery trucks handling 50-100 orders/day.

**Target users:**
- Office staff (order entry + phone) — primary power users
- Drivers (view delivery list on phone) — read-only web-view
- Accountants (confirm deliveries + track debt) — reconciliation
- Factory owner (reports + debt overview) — decision-maker

## Core Value

**Speed over everything.** Staff taking phone calls under pressure must enter orders faster than writing by hand (30 seconds). If the system is slower than pen-and-paper, staff rejects it and returns to chaos.

## Context

**Current pain points:**
- Orders tracked on paper + Zalo photos → no central source of truth
- End-of-day reconciliation often mismatches (unknown where errors occur)
- Ice bag deposits (shells) owed by customers = hidden cost often larger than the ice itself
- Manual calculation of daily profit impossible during peak season
- 2+ trucks = "who delivered what, who owes what" becomes chaotic

**Existing tools:** Pen + paper + Zalo. No existing software.

**Scale assumptions:**
- ~50-100 orders/day (can spike 2x during summer peak)
- 2-4 delivery trucks, 4-6 drivers
- 10-15 total staff
- Products: Ice cubes in 5kg/10kg/20kg bags, Ice blocks (various sizes)

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Office staff can enter wholesale orders faster than writing by hand
- [ ] Printed delivery slips (A5 or thermal) with customer signature line
- [ ] Drivers can view daily delivery list on phone (web-view, no app install)
- [ ] Accountant can confirm actual delivered quantity from paper slips
- [ ] System auto-deducts inventory when delivery is confirmed
- [ ] Customer debt balance updates automatically after each delivery
- [ ] Each customer has their own price list (negotiated rates per product)
- [ ] Owner can see daily debt report and outstanding balances
- [ ] System tracks shell/bag inventory (deposit owed by customer)

### Out of Scope

- Customer mobile app (drivers view on web, no install needed)
- Android/iOS native apps — web-only is sufficient
- Real-time GPS tracking of trucks
- Inventory forecasting or auto-reorder suggestions
- Employee scheduling/timekeeping (Phase 2+)
- Cost/asset management (Phase 2+)
- P&L reports (Phase 2+)
- Multi-warehouse support
- Hot (non-refrigerated) inventory tracking

## Constraints

- **Solo developer**: One codebase (Next.js/React), no native mobile
- **Staff tech literacy**: Office staff comfortable with web; drivers minimal tech — web-view must be dead simple
- **Peak season load**: System must handle 2x normal order volume without slowdown
- **Print reliability**: Delivery slips must print consistently from Chrome on office thermal printer
- **No offline support needed**: Always-online operation acceptable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-only (no native apps) | Solo dev, web-view sufficient for drivers | ✓ Proceeding |
| Speed-first order entry | If slower than pen, staff rejects system | ✓ Core constraint |
| Shell deposit tracking as core feature | Hidden cost often exceeds ice value | ✓ Included in v1 |
| Confirm deliveries via accountant (not driver) | Drivers have no app; paper slips returned daily | ✓ Realistic for v1 |
| Per-customer price lists | Each wholesaler has negotiated rates | ✓ Included in v1 |
| No offline support | Always-online operation is acceptable | ✓ Accepted |

## User Roles & Permissions

### Role Hierarchy

**ADMIN (Chủ lò)**
- 100% access: analytics, staff management, system settings
- Can create/lock/reset passwords for ACCOUNTANT and STAFF
- Can delete orders or adjust customer debt for error correction
- Access: `/dashboard`, `/orders`, `/customers`, `/settle`, `/inventory`, `/vehicles`, `/settings`

**ACCOUNTANT (Kế toán)**
- Focus on cash flow, debt tracking, and cold storage
- Settlement screen: confirm paper slips, cash input, shell recovery
- Customer & debt management: track and follow up on outstanding balances
- Cold storage management: adjust inventory for damage/loss
- Access: `/dashboard`, `/orders`, `/customers`, `/settle`, `/inventory`, `/vehicles` (no `/settings`)

**STAFF (Nhân viên)**
- Order entry focus — speed is critical
- Sees only: `/orders`, `/customers` (order entry is primary task)
- Print delivery slips
- Cannot see total factory debt, revenue reports, or settlement screens
- Cannot modify customer prices

### RBAC Implementation

- **Adaptive Sidebar**: Menu items filtered by role — STAFF sees minimal menu
- **Route Middleware**: Unauthorized route access → redirect to `/dashboard?error=unauthorized`
- Admin is the only source of truth for account creation (direct assignment workflow)

---

*Last updated: 2026-04-17 after Phase 06 complete (trial-pricing-onboarding)*