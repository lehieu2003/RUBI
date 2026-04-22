---
phase: 07B-rbac-enforcement
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/rbac/permissions.ts
  - src/middleware.ts
  - src/components/dashboard/sidebar.tsx
  - tests/rbac/permissions.test.ts
autonomous: true
requirements:
  - AUTH-05
  - RBAC-01
  - RBAC-02
  - RBAC-03
requirements_addressed: [AUTH-05, RBAC-01, RBAC-02, RBAC-03]
must_haves:
  truths:
    - "STAFF users can access only /dashboard, /orders, and /customers in tenant navigation"
    - "ACCOUNTANT users can access dashboard, orders, customers, settle, inventory, vehicles, reports/debt, deposits/shells, and dashboard/map"
    - "ADMIN users can access all tenant app routes including settings and billing/config routes"
    - "Unauthorized tenant page access redirects to /dashboard?error=unauthorized"
    - "Sidebar filtering and middleware route access use one shared permission source"
  artifacts:
    - path: "src/lib/rbac/permissions.ts"
      provides: "shared app route permission map and helper functions"
    - path: "src/middleware.ts"
      provides: "middleware consumes shared route permissions"
    - path: "src/components/dashboard/sidebar.tsx"
      provides: "sidebar consumes shared route permissions"
---

<objective>
Create a single source of truth for tenant route permissions and wire it into middleware and sidebar filtering so UI navigation and security enforcement cannot drift.
</objective>

<execution_context>
@D:/IceFlow SaaS/.codex/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07B-rbac-enforcement/07B-CONTEXT.md
@.planning/phases/07B-rbac-enforcement/07B-RESEARCH.md
@src/middleware.ts
@src/components/dashboard/sidebar.tsx
@src/lib/auth.ts
</context>

<interfaces>
Suggested shared module:

```typescript
export type TenantRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF';
export type AppRole = TenantRole | 'SUPER_ADMIN';

export type AppRoutePermission = {
  href: string;
  label?: string;
  roles: TenantRole[];
  match?: 'exact' | 'prefix';
};

export const tenantRoutePermissions: AppRoutePermission[];
export function getAllowedRolesForPath(pathname: string): TenantRole[] | null;
export function canAccessPath(role: AppRole | undefined, pathname: string): boolean;
export function getVisibleTenantRoutes(role: TenantRole | undefined): AppRoutePermission[];
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add shared tenant route permission map</name>
  <files>src/lib/rbac/permissions.ts</files>
  <action>
Create `src/lib/rbac/permissions.ts`.

Include these route decisions from `07B-CONTEXT.md`:

- `ADMIN`, `ACCOUNTANT`, `STAFF`: `/dashboard`, `/orders`, `/customers`
- `ADMIN`, `ACCOUNTANT`: `/settle`, `/inventory`, `/vehicles`, `/reports/debt`, `/deposits/shells`, `/dashboard/map`
- `ADMIN`: `/settings`, `/settings/billing`, `/billing`, `/config/prices`

Use prefix matching for child routes such as `/orders/[id]`, `/customers/[id]`, and `/settings/billing`. Make matching deterministic: longest route prefix wins, exact matches are valid, and unrelated paths return `null`.
  </action>
  <verify>
    <automated>rg "tenantRoutePermissions|getAllowedRolesForPath|canAccessPath|getVisibleTenantRoutes" src/lib/rbac/permissions.ts</automated>
  </verify>
  <done>Shared permission map and helper functions exist with all Phase 7B route decisions represented.</done>
</task>

<task type="auto">
  <name>Task 2: Refactor middleware to use shared permissions</name>
  <files>src/middleware.ts</files>
  <action>
Replace the local `roleRoutes` map in `src/middleware.ts` with imports from `src/lib/rbac/permissions.ts`.

Behavior to preserve or enforce:

- Unauthenticated tenant app routes redirect to `/login?redirect={pathname}`.
- Authenticated wrong-role tenant app routes redirect to `/dashboard?error=unauthorized`.
- `/admin/*` remains the direct SUPER_ADMIN surface.
- `SUPER_ADMIN` does not get direct tenant app route access through this map.
- Existing impersonation write block remains unchanged.
- Existing subscription write check remains in place for Phase 8 to refine.

Fix the fragile path-parent logic. Use the helper to decide whether a path is protected and whether the current role can access it.
  </action>
  <verify>
    <automated>rg "roleRoutes" src/middleware.ts; if ($LASTEXITCODE -eq 0) { exit 1 } else { exit 0 }</automated>
    <automated>rg "canAccessPath|getAllowedRolesForPath" src/middleware.ts</automated>
    <automated>rg "error', 'unauthorized'|error=unauthorized" src/middleware.ts</automated>
  </verify>
  <done>Middleware uses the shared permission map and still redirects wrong-role users to `/dashboard?error=unauthorized`.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor sidebar to use shared permissions</name>
  <files>src/components/dashboard/sidebar.tsx</files>
  <action>
Update `src/components/dashboard/sidebar.tsx` so menu filtering uses the shared permission source rather than a duplicate role list.

Keep the current labels/icons/order unless a route is missing from the Phase 7B matrix. It is acceptable for sidebar UI metadata to live in the component, but role visibility must come from the shared permission helper.
  </action>
  <verify>
    <automated>rg "getVisibleTenantRoutes|canAccessPath|tenantRoutePermissions" src/components/dashboard/sidebar.tsx</automated>
    <automated>rg "roles:" src/components/dashboard/sidebar.tsx; if ($LASTEXITCODE -eq 0) { exit 1 } else { exit 0 }</automated>
  </verify>
  <done>Sidebar route visibility is derived from the same permission source used by middleware.</done>
</task>

<task type="auto">
  <name>Task 4: Add permission matrix tests</name>
  <files>tests/rbac/permissions.test.ts</files>
  <action>
Create tests for the shared permission helpers.

Minimum cases:

- STAFF allowed: `/dashboard`, `/orders`, `/orders/123`, `/customers`, `/customers/123`
- STAFF denied: `/settle`, `/inventory`, `/vehicles`, `/settings`, `/reports/debt`, `/deposits/shells`
- ACCOUNTANT allowed: dashboard/orders/customers/settle/inventory/vehicles/reports/debt/deposits/shells/dashboard/map
- ACCOUNTANT denied: `/settings`, `/settings/billing`, `/billing`, `/config/prices`
- ADMIN allowed: every tenant route in the matrix
- SUPER_ADMIN denied on tenant app routes by `canAccessPath`, because direct access belongs under `/admin/*`
  </action>
  <verify>
    <automated>npx tsx --test tests/rbac/permissions.test.ts</automated>
  </verify>
  <done>Route permission matrix is covered by automated tests.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> tenant app route | User may request pages outside their role |
| sidebar -> navigation | User-visible links must not advertise unauthorized workflows |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07B-01 | Elevation of Privilege | middleware route matching | mitigate | Shared `canAccessPath()` checks every tenant route with deterministic longest-prefix matching |
| T-07B-02 | Tampering | duplicated role maps | mitigate | Sidebar and middleware consume one permission source |
| T-07B-03 | Information Disclosure | unauthorized tenant pages | mitigate | Wrong-role users redirect to `/dashboard?error=unauthorized` |
</threat_model>

<verification>
1. `npx tsx --test tests/rbac/permissions.test.ts`
2. `npx tsc --noEmit -p tsconfig.json`
3. Manual grep: no local `roleRoutes` map remains in `src/middleware.ts`
</verification>

<success_criteria>
- [ ] Shared route permission map exists and includes all routes from `07B-CONTEXT.md`
- [ ] Middleware uses shared permissions for tenant route authorization
- [ ] Sidebar visibility uses the same permission source
- [ ] Unauthorized page access redirects to `/dashboard?error=unauthorized`
- [ ] Permission helper tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/07B-rbac-enforcement/07B-01-SUMMARY.md`.
</output>

