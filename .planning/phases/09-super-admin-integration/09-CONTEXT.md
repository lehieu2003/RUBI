# Phase 09: Super Admin + Integration - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Super Admin can manage all factories via admin panel; all v1.0 entities properly factory-scoped; RBAC with correct SUPER_ADMIN bypass; subscription management (extend, activate/deactivate, price per driver). Phase 9 does NOT add new features — it validates and fixes gaps in existing admin infrastructure.
</domain>

<decisions>
## Implementation Decisions

### Super Admin Read Path (INT-03, INT-05)
- **D-01:** SUPER_ADMIN reads tenant data via **admin panel only** (prismaAuth directly, no $extends tenant filtering). Tenant API routes (/api/orders, /api/customers, /api/drivers) are NOT used for SUPER_ADMIN reads.
- **D-02:** Impersonation uses separate `impersonate_token` httpOnly cookie — not the auth JWT. This is correct security isolation. No changes needed.
- **D-03:** Driver web-view uses static driver token (?token=), not session — impersonation has no effect on driver view. This is correct. Leave as-is.

### RBAC Permissions Fix (RBAC-01, RBAC-04, RBAC-05)
- **D-04:** `canAccessPath` in `src/lib/rbac/permissions.ts` returns `false` for SUPER_ADMIN — blocks all tenant routes. This is intentional (SUPER_ADMIN uses admin panel only). No change needed.
- **D-05:** Route-level auth helpers (`requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF'])`) should be reviewed — but since SUPER_ADMIN reads via admin panel (not tenant APIs), the requireRole arrays are acceptable as-is. Downstream agent should verify this during planning.

### Entity Factory Scoping (INT-01, INT-02, INT-04)
- **D-06:** All v1.0 entities (Customer, Order, Driver, Product) have factoryId in schema.
- **D-07:** All tenant API routes filter by `session.factoryId` from Phase 6/8 work. No additional scoping changes needed — downstream agent should verify and confirm.
- **D-08:** Per-customer pricing works within factory scope — confirmed via CustomerPriceOverride model keyed by customerId+productId within factory.

### Subscription Management (SADM-02, SADM-03, SADM-04, SADM-05)
- **D-09:** Tenant list with subscription/driver/days remaining already exists in `/admin/tenants` via `GET /api/admin/factories`.
- **D-10:** Extend trial/subscription, activate/deactivate, set price per driver already exist via PATCH `/api/admin/subscriptions/[id]`.
- **D-11:** No changes to subscription management infrastructure needed — Phase 9 validates it works end-to-end.

### Impersonation Flow
- **D-12:** Impersonation sets `impersonate_token` cookie only — auth_token JWT remains unchanged (role= SUPER_ADMIN, factoryId=null). The impersonated factory context lives in the separate cookie, checked by `isImpersonating()` in middleware.
- **D-13:** Read-only during impersonation enforced via middleware blocking non-GET writes.

### Integration Verification Scope
- **D-14:** Phase 9 is primarily a verification and gap-fill phase. Success criteria validate existing functionality rather than implementing new features.
- **D-15:** Downstream agent should audit all tenant API routes for correct factoryId filtering and confirm SUPER_ADMIN bypass behavior works via admin panel.

### Claude's Discretion
- Specific RBAC route matrix updates if any are missing from tenantRoutePermissions
- How to structure the admin panel tenant detail view
- Test approach for verifying end-to-end SUPER_ADMIN impersonation flow
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 9 — Phase goal, success criteria, requirements mapping
- `.planning/REQUIREMENTS.md` §SADM-02, §SADM-03, §SADM-04, §SADM-05, §INT-01, §INT-02, §INT-03, §INT-04, §INT-05

### Prior Phase Context
- `.planning/phases/07B-rbac-enforcement/07B-CONTEXT.md` — RBAC route matrix, SUPER_ADMIN behavior
- `.planning/phases/08-api-route-hardening/08-CONTEXT.md` — Auth helper migration, subscription enforcement
- `.planning/phases/08B-staff-and-driver-scheduling/08B-CONTEXT.md` — Driver scheduling, paidDriverLimit

### Existing Implementation
- `src/lib/rbac/permissions.ts` — tenantRoutePermissions, canAccessPath, getVisibleTenantRoutes
- `src/middleware.ts` — SUPER_ADMIN redirect to /admin/dashboard, impersonation cookie check
- `src/app/api/admin/factories/route.ts` — Tenant list (prismaAuth, no $extends)
- `src/app/api/admin/subscriptions/[id]/route.ts` — Extend, activate/deactivate, set price
- `src/app/api/admin/impersonate/[factoryId]/route.ts` — Impersonation sets separate cookie
- `src/app/admin/tenants/page.tsx` — Super Admin tenant management UI (TenantTable component)
- `src/components/admin/tenant-table.tsx` — Full tenant management UI with actions
- `prisma/schema.prisma` — All v1.0 entities (Customer, Order, Driver, Product) have factoryId

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- TenantTable component in `src/components/admin/tenant-table.tsx` — full CRUD UI already exists
- `/api/admin/factories` route uses prismaAuth directly — bypasses $extends, reads all factories
- Impersonation flow already works with separate cookie approach
- StatusBadge, formatDate, formatCurrency helpers in tenant-table.tsx

### Established Patterns
- Admin panel reads via prismaAuth directly — no $extends tenant filter
- Tenant API routes use `prisma` (with $extends) for factoryId scoping
- Impersonation uses separate httpOnly cookie with 15-minute maxAge
- SUPER_ADMIN redirect to /admin/dashboard in middleware

### Integration Points
- TenantTable calls `/api/admin/factories` for list, `/api/admin/subscriptions/[id]` for PATCH
- Impersonation sets `/api/admin/impersonate/[factoryId]` POST, ends via `/api/admin/impersonate/end`
- Super Admin can activate/deactivate/extend subscription and set price per driver

</codebase_context>

<specifics>
## Specific Ideas

- Driver web-view (?token=) is separate from impersonation — correct design for driver phone use case
- Impersonation read-only enforced in middleware — correct security principle
- Admin panel uses prismaAuth directly — SUPER_ADMIN bypasses $extends for admin reads

</specifics>

<deferred>
## Deferred Ideas

- Vehicle scheduling (which truck each driver uses) — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Custom shift time configuration — hardcoded M/A/N in Phase 8B
- Payment gateway integration (Stripe, VNPay) — manual confirmation sufficient for v2.0

</deferred>

---

*Phase: 09-super-admin-integration*
*Context gathered: 2026-04-23*