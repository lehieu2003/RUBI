# Milestones

## v2.0 — Multi-tenant Factory Architecture

**Shipped:** 2026-04-21
**Timeline:** 7 days
**Phases:** 5 | **Plans:** 13 | **Files:** 14 (+411/-11 LOC)

### Accomplishments

1. factoryId data layer on all tenant entities (Customer, Driver, Order, Product)
2. Tenant middleware via AsyncLocalStorage + Prisma $extends auto-injects factoryId filter
3. SUPER_ADMIN role with system-wide access, no factory filter
4. Subscription management (TRIAL → PAID/ACTIVE/CANCELLED) with 7-day grace period
5. Super Admin dashboard with tenant list, activate/deactivate, extend, impersonation
6. System overview, audit log with CSV export, impersonation tool with 15-min timeout
7. v1.0 features factory-scoped: entity creation fixed, GET routes filtered, PATCH ownership checked

### Known Gaps

- Payment audit log (SADM-04): no Payment records created (POST /api/payments/confirm doesn't write Payment)
- SUPER_ADMIN blocked from /api/orders GET — breaks impersonation read
- factoryId fallback pattern wrong: `session.factoryId || session.userId`

### Tech Debt

3 items flagged for future cleanup

### Archive

- [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)
- [v2.0-MILESTONE-AUDIT.md](v2.0-MILESTONE-AUDIT.md)

---

## v1.0 — MVP (Initial Release)

**Shipped:** 2026-04-16

### Accomplishments

1. Order entry faster than pen-and-paper (30-second target)
2. Customer lookup by code with fuzzy search
3. Printed delivery slips (A5/thermal) with signature line
4. Driver web-view on mobile (read-only)
5. Inventory auto-deduction on delivery confirmation
6. Customer debt tracking with shell deposits
7. RBAC: ADMIN, ACCOUNTANT, STAFF roles with adaptive sidebar

### Archive

Archived in previous session. ROADMAP.md references v1.0 milestone archive.