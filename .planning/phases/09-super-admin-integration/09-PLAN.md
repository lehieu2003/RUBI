---
gsd_phase: 09
wave: 1
depends_on: []
files_modified:
  - src/components/admin/tenant-table.tsx
autonomous: true
requirements:
  - SADM-02
  - SADM-03
  - SADM-04
  - SADM-05
  - INT-01
  - INT-02
  - INT-03
  - INT-04
  - INT-05
must_haves:
  truths:
    - Super Admin reads all factories via prismaAuth (unextended Prisma), not via tenant API routes
    - Impersonation uses separate httpOnly cookie (impersonate_token), not the auth JWT
    - Driver web-view uses static token (?token=), not session/impersonation
    - canAccessPath returns false for SUPER_ADMIN (blocks all tenant routes)
    - All tenant API routes filter by session.factoryId via explicit where clause
    - CustomerPriceOverride access goes through customer-scoped routes (defense-in-depth)
  artifacts:
    - TenantTable component at src/components/admin/tenant-table.tsx
    - GET /api/admin/factories route
    - PATCH /api/admin/subscriptions/[id] route
    - Impersonate routes at src/app/api/admin/impersonate/
    - RBAC permissions at src/lib/rbac/permissions.ts
    - Driver orders route at src/app/api/driver/orders/route.ts
  key_links:
    - src/app/admin/tenants/page.tsx
    - src/app/admin/tenants/[factoryId]/page.tsx
    - src/app/api/admin/factories/route.ts
    - src/app/api/admin/subscriptions/[id]/route.ts
    - src/app/api/admin/impersonate/[factoryId]/route.ts
    - src/app/api/admin/impersonate/status/route.ts
    - src/app/api/admin/impersonate/end/route.ts
    - src/lib/rbac/permissions.ts
    - src/middleware.ts
    - src/app/api/driver/orders/route.ts
    - prisma/schema.prisma
---

## Phase 9: Super Admin + Integration - Execution Plan

**Phase goal:** Super Admin can manage all factories; all v1.0 entities properly factory-scoped
**Downstream consumer:** /gsd-execute-phase

---

## Verification Goals

Phase 9 is primarily a **verification and gap-fill phase**. The Super Admin infrastructure is largely implemented from prior phases. The primary work is:
1. Verifying each success criterion against actual code
2. Fixing gaps found during audit

**Key findings from planning research:**
- All four SADM capabilities (list, activate/deactivate, extend, set price) are already implemented
- All v1.0 entity routes correctly filter by `session.factoryId` via explicit `where` clauses
- RBAC middleware correctly blocks SUPER_ADMIN from tenant routes (intentional design)
- Driver web-view correctly uses `driver.factoryId` from token lookup
- **One gap identified:** `CustomerPriceOverride` is NOT in `factoryIdModels`, meaning direct queries on that model bypass factoryId filtering via `$extends`

---

## Success Criteria Mapping

| # | Criterion | Tasks | Requirement |
|---|-----------|-------|-------------|
| 1 | Super Admin sees factory list with subscription/driver/days | 09-01 | SADM-02 |
| 2 | Super Admin can activate/deactivate subscription | 09-02 | SADM-03 |
| 3 | Super Admin can extend trial/subscription | 09-02 | SADM-04 |
| 4 | Super Admin can set price per driver | 09-02 | SADM-05 |
| 5 | All v1.0 entities (Customer, Order, Driver, Product) have factoryId | 09-04 | INT-01 |
| 6 | Per-customer pricing works within factory scope | 09-05 | INT-02 |
| 7 | RBAC middleware has SUPER_ADMIN bypass (uses admin panel) | 09-03 | INT-03 |
| 8 | Driver web-view filtered by driver.factoryId | 09-04 | INT-04, INT-05 |

---

## Tasks

<task type="auto">
<id>09-01</id>
<name>Verify Super Admin tenant list (SADM-02)</name>
<files>
- src/app/api/admin/factories/route.ts
- src/components/admin/tenant-table.tsx
- src/app/admin/tenants/page.tsx
</files>
<action>
Verification only — no code changes expected. Confirm via grep/read:
1. `GET /api/admin/factories` includes `_count: { drivers: { where: { isActive: true } } }` in include
2. `getDaysRemaining` computes `(endDate - now) / ms_per_day`
3. TenantTable sort handler covers all 6 sort fields
</action>
<verify>
grep -n "_count.*drivers" src/app/api/admin/factories/route.ts && grep -n "getDaysRemaining" src/app/api/admin/factories/route.ts && grep -n "sortField" src/components/admin/tenant-table.tsx | head -20
</verify>
<done>
Confirmed: GET /api/admin/factories returns factory list with subscription/driver/days data. TenantTable renders all required columns and action buttons.
</done>
</task>

<task type="auto">
<id>09-02</id>
<name>Verify subscription management actions (SADM-03, SADM-04, SADM-05)</name>
<files>
- src/app/api/admin/subscriptions/[id]/route.ts
- src/components/admin/tenant-table.tsx
- src/app/admin/tenants/[factoryId]/page.tsx
</files>
<action>
Verification only — no code changes expected. Confirm via grep/read:
1. PATCH /api/admin/subscriptions/[id] handles status, extendDays, pricePerDriver, recordPayment fields
2. TenantTable ActionModal has three modes: extend, price, status
3. Tenant detail page has Gia han, Luu gia, Kich hoat/Tat buttons and pricePerDriver input
</action>
<verify>
grep -n "extendDays\|pricePerDriver\|status" src/app/api/admin/subscriptions/[id]/route.ts && grep -n "ActionModal\|mode.*extend\|mode.*price\|mode.*status" src/components/admin/tenant-table.tsx | head -15
</verify>
<done>
Confirmed: PATCH /api/admin/subscriptions/[id] handles status/extendDays/pricePerDriver. TenantTable action modal and tenant detail page have all required controls.
</done>
</task>

<task type="auto">
<id>09-03</id>
<name>Verify RBAC SUPER_ADMIN bypass behavior (INT-03)</name>
<files>
- src/lib/rbac/permissions.ts
- src/middleware.ts
- src/app/api/orders/route.ts
- src/app/api/customers/route.ts
- src/app/api/drivers/route.ts
</files>
<action>
Verification only. Confirm via grep:
- canAccessPath returns false for SUPER_ADMIN role
- Middleware redirects SUPER_ADMIN to /admin/dashboard for tenant routes
- No tenant API route has SUPER_ADMIN in role arrays
</action>
<verify>
grep -n "SUPER_ADMIN" src/lib/rbac/permissions.ts src/middleware.ts && grep -n "requireRole" src/app/api/orders/route.ts src/app/api/customers/route.ts src/app/api/drivers/route.ts
</verify>
<done>
Confirmed: canAccessPath blocks SUPER_ADMIN. No tenant API route includes SUPER_ADMIN in requireRole arrays. SUPER_ADMIN uses admin panel only.
</done>
</task>

<task type="auto">
<id>09-04</id>
<name>Verify all v1.0 entity routes are factory-scoped (INT-01, INT-04, INT-05)</name>
<files>
- src/app/api/orders/route.ts
- src/app/api/customers/route.ts
- src/app/api/drivers/route.ts
- src/app/api/products/route.ts
- src/app/api/schedule/assignments/route.ts
- src/app/api/driver/orders/route.ts
</files>
<action>
Verification only. Confirm all routes have explicit factoryId filter in WHERE clause:
- /api/orders GET has where: { factoryId: session.factoryId }
- /api/customers GET/POST has factoryId filter
- /api/drivers GET has factoryId filter
- /api/products GET has factoryId filter
- /api/schedule/assignments GET/PATCH has factoryId filter
- /api/driver/orders GET has where: { factoryId: driver.factoryId } (not session.factoryId)
</action>
<verify>
grep -n "factoryId" src/app/api/orders/route.ts src/app/api/customers/route.ts src/app/api/drivers/route.ts src/app/api/products/route.ts src/app/api/schedule/assignments/route.ts src/app/api/driver/orders/route.ts | grep -E "where.*factoryId|factoryId.*where"
</verify>
<done>
Confirmed: All v1.0 entity routes have explicit factoryId filtering. Driver web-view uses driver.factoryId from token lookup.
</done>
</task>

<task type="auto">
<id>09-05</id>
<name>Audit CustomerPriceOverride factory-scoping (INT-02 gap)</name>
<files>
- src/lib/db.ts
- src/lib/pricing.ts
- src/app/api/prices/customer/override/route.ts
- src/app/customers/[id]/page.tsx
</files>
<action>
Verification only. Audit CustomerPriceOverride access patterns:
1. Confirm CustomerPriceOverride is NOT in factoryIdModels (known gap)
2. Confirm all override writes go through routes that validate customer.factoryId first
3. Confirm all override reads go through customer-scoped fetch first
4. Verify no direct prisma.customerPriceOverride.findMany() without customerId filter
</action>
<verify>
grep -n "customerPriceOverride" src/lib/db.ts src/lib/pricing.ts src/app/api/prices/customer/override/route.ts src/app/customers/\[id\]/page.tsx
</verify>
<done>
Confirmed gap is acceptable: CustomerPriceOverride access goes through customer-scoped routes. No direct unscoped queries found.
</done>
</task>

<task type="auto">
<id>09-06</id>
<name>Verify impersonation flow end-to-end</name>
<files>
- src/app/api/admin/impersonate/[factoryId]/route.ts
- src/app/api/admin/impersonate/status/route.ts
- src/app/api/admin/impersonate/end/route.ts
- src/middleware.ts
- src/app/admin/tenants/[factoryId]/page.tsx
</files>
<action>
Verification only. Confirm via grep/read:
1. POST /api/admin/impersonate/[factoryId] creates ImpersonationLog and sets impersonate_token cookie (maxAge: 900)
2. GET /api/admin/impersonate/status checks impersonate_token against ImpersonationLog (15-min expiry, endedAt=null)
3. POST /api/admin/impersonate/end updates endedAt and clears cookie
4. Middleware blocks non-GET API requests when impersonating (returns 403 READ_ONLY_IMPERSONATION)
5. Tenant detail page has Impersonate ho tro button
</action>
<verify>
grep -n "impersonate_token\|maxAge.*900\|ImpersonationLog\|endedAt\|READ_ONLY_IMPERSONATION" src/app/api/admin/impersonate/\[factoryId\]/route.ts src/app/api/admin/impersonate/status/route.ts src/app/api/admin/impersonate/end/route.ts src/middleware.ts
</verify>
<done>
Confirmed: Impersonation flow fully implemented with httpOnly cookie isolation and write blocking during impersonation.
</done>
</task>

<task type="auto">
<id>09-07</id>
<name>Fix SortIcon React Compiler warning (BUILD-05)</name>
<files>
- src/components/admin/tenant-table.tsx
</files>
<action>
Move renderSortIcon from inline TenantTable method to module-level helper function to fix React Compiler warning.
</action>
<verify>
grep -n "function SortIcon\|const renderSortIcon" src/components/admin/tenant-table.tsx
</verify>
<done>
Moved SortIcon to module level. Verified no inline function definitions that create new functions on each render.
</done>
</task>

---

## Verification Checklist

| Success Criterion | Verified | Evidence |
|---|---|---|
| 1. Super Admin sees factory list with subscription/driver/days | Task 09-01 | |
| 2. Super Admin can activate/deactivate subscription | Task 09-02 | |
| 3. Super Admin can extend trial/subscription | Task 09-02 | |
| 4. Super Admin can set price per driver | Task 09-02 | |
| 5. All v1.0 entities (Customer, Order, Driver, Product) have factoryId | Task 09-04 | |
| 6. Per-customer pricing works within factory scope | Task 09-05 | |
| 7. RBAC middleware has SUPER_ADMIN bypass (uses admin panel) | Task 09-03 | |
| 8. Driver web-view filtered by driver.factoryId | Task 09-04 | |

---

## Notes

- **Phase is verification-first**: Tasks 09-01 through 09-06 are verification only — no code changes expected
- **Task 09-07 is the only code change**: BUILD-05 (SortIcon React Compiler fix)
- Phase 9 does NOT add new features — only verifies existing infrastructure and fixes gaps
- If any verification finds actual bugs, fix in place and document in task output
