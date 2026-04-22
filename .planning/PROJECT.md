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

## Current State

**Shipped:** v1.0 MVP + v2.0 Multi-tenant Factory Architecture
**Total LOC:** ~12,853 lines of TypeScript/React
**Architecture:** Multi-tenant with factoryId scoping, AsyncLocalStorage + Prisma $extends, SUPER_ADMIN role with system-wide access

## Requirements

### Validated

- ✓ Office staff can enter wholesale orders faster than writing by hand — v1.0
- ✓ Printed delivery slips (A5 or thermal) with customer signature line — v1.0
- ✓ Drivers can view daily delivery list on phone (web-view, no app install) — v1.0
- ✓ Accountant can confirm actual delivered quantity from paper slips — v1.0
- ✓ System auto-deducts inventory when delivery is confirmed — v1.0
- ✓ Customer debt balance updates automatically after each delivery — v1.0
- ✓ Each customer has their own price list (negotiated rates per product) — v1.0
- ✓ Owner can see daily debt report and outstanding balances — v1.0
- ✓ System tracks shell/bag inventory (deposit owed by customer) — v1.0
- ✓ Factory-scoped multi-tenancy with factoryId on all entities — v2.0
- ✓ Super Admin dashboard with tenant management — v2.0
- ✓ Subscription management with TRIAL/PAID/ACTIVE/CANCELLED states — v2.0
- ✓ 7-day grace period after cancellation — v2.0

### Active

- [ ] Factory self-registration with trial subscription (FACT-01, FACT-02, SUB-01, SUB-02, SUB-03 — Phase 02 implemented but gaps exist)
- [ ] Super Admin impersonation tool (SADM-04 — audit log empty due to no Payment writes)
- [ ] Payment audit log for subscription payments (SADM-04 partial — tech debt)

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
| factoryId on all tenant entities | Direct String field (not relation) for simpler queries | ✓ v2.0 |
| AsyncLocalStorage + Prisma $extends | Auto-inject factoryId filter without manual wrapping | ✓ v2.0 |
| SUPER_ADMIN bypasses factoryId filter | Role check before auto-injecting | ✓ v2.0 |
| @@unique([code, factoryId]) | Factory-scoped uniqueness for customer codes | ✓ v2.0 |

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

**SUPER_ADMIN (Quản trị hệ thống)**
- System-wide access, no factory filter
- Can view all factories, impersonate any tenant
- Manages subscription plans and pricing

### RBAC Implementation

- **Adaptive Sidebar**: Menu items filtered by role — STAFF sees minimal menu
- **Route Middleware**: Unauthorized route access → redirect to `/dashboard?error=unauthorized`
- Admin is the only source of truth for account creation (direct assignment workflow)
- Tenant middleware auto-injects factoryId filter via Prisma $extends

---

## Current Milestone: v3.0 (Planned)

**Goal:** Fix critical tenant data leaks, lock down API auth, improve registration/onboarding, make build green, and correct subscription enforcement.

**Target features:**
- Tenant data isolation — explicit factoryId on all queries, fail-closed on missing factoryId
- API auth hardening — requireSession/requireFactoryId/requireRole helpers on all write endpoints
- Registration + onboarding — Zod validation, email normalization, password policy, nextUrl routing, onboarding state
- Build green — TypeScript errors fixed, Decimal serialization, seed scripts with factoryId
- Subscription correctness — middleware subscription parsing fixed, route-level enforcement

<details>
<summary>Previous Milestone: v2.0 Multi-tenant Factory Architecture</summary>

**Goal:** Transform from single-tenant to multi-tenant architecture — each factory is a completely isolated tenant with data scoped via `factoryId`.

**Achieved:**
- factoryId data layer on all tenant entities (Customer, Driver, Order, Product)
- Tenant middleware via AsyncLocalStorage + Prisma $extends
- SUPER_ADMIN role with system-wide access
- Subscription management (TRIAL → PAID/ACTIVE/CANCELLED)
- Super Admin dashboard with tenant list, activate/deactivate, extend
- 7-day grace period after cancellation
- System overview, audit log, impersonation tool

**Tech debt (known gaps):**
- Payment audit log (SADM-04) has no data — `POST /api/payments/confirm` doesn't create Payment records
- SUPER_ADMIN blocked from `/api/orders` GET — breaks impersonation read
- `factoryId: session.factoryId || session.userId` fallback is semantically wrong

**Archive:** [.planning/milestones/v2.0-ROADMAP.md](.planning/milestones/v2.0-ROADMAP.md)

</details>

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-22 after v2.0 milestone completion*
