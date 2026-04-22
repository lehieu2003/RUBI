# Phase 7B: RBAC Enforcement - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Correct role-based access control for tenant routes and write APIs. This phase locks the ADMIN/ACCOUNTANT/STAFF route matrix, enforces route-level authorization, fixes SUPER_ADMIN access boundaries, and keeps sidebar visibility aligned with middleware permissions.

</domain>

<decisions>
## Implementation Decisions

### Route Access Matrix
- **D-01:** `/dashboard`, `/orders`, and `/customers` are available to `ADMIN`, `ACCOUNTANT`, and `STAFF`.
- **D-02:** `/settle`, `/inventory`, `/vehicles`, `/reports/debt`, `/deposits/shells`, and `/dashboard/map` are available to `ADMIN` and `ACCOUNTANT`.
- **D-03:** `/settings`, `/settings/billing`, `/billing`, and `/config/prices` are `ADMIN` tenant routes unless an existing route is explicitly a `SUPER_ADMIN` admin route.
- **D-04:** Unauthorized tenant page access redirects to `/dashboard?error=unauthorized`, matching the roadmap.

### API Role Enforcement Strategy
- **D-05:** Phase 7B should convert every relevant `POST`, `PATCH`, and `DELETE` API route in scope to shared auth helpers such as `requireRole(...)`, not leave ad hoc role checks in write paths.
- **D-06:** `GET` routes may stay mostly as-is unless role access is explicitly wrong or leaks data. This keeps the phase focused on RBAC/write enforcement.
- **D-07:** Authenticated users with the wrong role receive `403 Forbidden`, not `401 Unauthorized`.

### SUPER_ADMIN Behavior
- **D-08:** `SUPER_ADMIN` operates directly through `/admin/*`. Normal tenant routes should be accessed through impersonation/read flows, not direct tenant app navigation.
- **D-09:** Impersonation stays read-only. Writes while impersonating remain blocked.
- **D-10:** Explicit admin routes use unscoped/system access. Normal tenant APIs should require impersonation context instead of allowing accidental broad `SUPER_ADMIN` reads through tenant routes.

### Sidebar and Middleware Source of Truth
- **D-11:** Create one shared permission map for app routes and reuse it in middleware and sidebar filtering to prevent drift.
- **D-12:** Sidebar visibility should match middleware access exactly for tenant navigation.
- **D-13:** Tests should cover the role matrix across middleware, sidebar filtering, and key API write guards.

### the agent's Discretion
- Exact shape and filename for the shared route-permission map.
- Whether helper migration happens route-by-route or by small grouped clusters, as long as all in-scope write routes are covered.
- Exact test framework split between unit tests and integration-style route tests, as long as the RBAC contract is verified.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 7B — Phase goal and success criteria.
- `.planning/REQUIREMENTS.md` §AUTH-05, §AUTH-06, §SEC-01 to §SEC-03, §RBAC-01 to §RBAC-05 — RBAC and auth enforcement requirements.
- `.planning/PROJECT.md` §User Roles & Permissions — Role hierarchy and allowed page access.

### Prior Phase Context
- `.planning/phases/06-data-layer-hardening/06-CONTEXT.md` — SUPER_ADMIN tenant-filter bypass and fail-closed tenant query behavior.
- `.planning/phases/07-auth-infra/07-CONTEXT.md` — Shared auth helper decisions and expected helper behavior.

### Current Implementation
- `src/middleware.ts` — Current route guard, role map, impersonation write block, and subscription write check.
- `src/components/dashboard/sidebar.tsx` — Current sidebar role filtering and route list.
- `src/lib/auth/helpers.ts` — Shared `requireSession`, `requireRole`, `requireFactoryId`, and `requireActiveSubscription` helpers.
- `src/lib/db.ts` — Prisma tenant scoping and `SUPER_ADMIN` bypass behavior.
- `src/lib/auth.ts` — Session payload, JWT verification, and tenant context propagation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth/helpers.ts` already provides `requireRole(...)` for write-route enforcement.
- `src/middleware.ts` already redirects unauthorized page users to `/dashboard?error=unauthorized`.
- `src/components/dashboard/sidebar.tsx` already filters menu items by role, but has its own separate permission list.

### Established Patterns
- `ADMIN`, `ACCOUNTANT`, `STAFF`, and `SUPER_ADMIN` are the role vocabulary across auth, middleware, tenant context, and sidebar code.
- Tenant app routes are protected by middleware; many API routes still manually call `getSession()` and check `session.role`.
- Impersonation writes are already blocked in middleware for non-GET API requests.
- Prisma tenant scoping bypasses filters when tenant context role is `SUPER_ADMIN`.

### Integration Points
- Shared permission map should replace duplicated `roleRoutes` in `src/middleware.ts` and `allMenuItems` role lists in `src/components/dashboard/sidebar.tsx`.
- API route hardening should focus on tenant write endpoints and admin write endpoints that currently use manual role checks.
- SUPER_ADMIN direct routes should remain under `/admin/*`; tenant-route reads should be mediated by explicit impersonation context or admin APIs.

### Current Risks to Address
- `src/middleware.ts` role lookup has fragile parent-path logic and does not clearly cover every route listed in the sidebar.
- `src/components/dashboard/sidebar.tsx` can drift from middleware because it maintains a separate route/role list.
- Multiple API routes still use manual `getSession()` role checks instead of shared helpers, which can lead to inconsistent 401/403 behavior.
- Known project-state issue: `SUPER_ADMIN` being blocked from `/api/orders` breaks impersonation read workflows.

</code_context>

<specifics>
## Specific Ideas

Use the recommended defaults from discussion: centralized route permissions, strict write-route helper enforcement, read-only impersonation, and exact sidebar/middleware alignment.

</specifics>

<deferred>
## Deferred Ideas

Allowing SUPER_ADMIN writes during impersonation with audit logging is out of scope for Phase 7B. It depends on fixing payment/audit logging gaps and should be considered separately.

</deferred>

---

*Phase: 07B-rbac-enforcement*
*Context gathered: 2026-04-22*
