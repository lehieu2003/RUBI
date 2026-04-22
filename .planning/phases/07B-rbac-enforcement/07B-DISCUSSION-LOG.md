# Phase 7B: RBAC Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 07B-rbac-enforcement
**Areas discussed:** Route access matrix, API role enforcement strategy, SUPER_ADMIN behavior, Sidebar vs middleware source of truth

---

## Route Access Matrix

| Option | Description | Selected |
|--------|-------------|----------|
| ACCOUNTANT + ADMIN | Reporting/support routes are reconciliation/ops tools. | yes |
| ADMIN only | More restrictive, but accountants lose debt/shell visibility. | |
| Decide per route | More precise, but more planning detail. | |

**User's choice:** defaults.
**Notes:** `/reports/debt`, `/deposits/shells`, and `/dashboard/map` should be available to `ADMIN` and `ACCOUNTANT`.

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN only | Tenant owner/admin manages billing. | yes |
| ADMIN + ACCOUNTANT | Accountant can see billing, but may expose subscription controls. | |
| SUPER_ADMIN only | Too restrictive for tenant self-service. | |

**User's choice:** defaults.
**Notes:** Billing/subscription tenant routes should be `ADMIN` only.

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to `/dashboard?error=unauthorized` | Matches roadmap. | yes |
| Redirect to first allowed page | Better UX for STAFF, but more logic. | |
| Show a 403 page | Clearer, but adds UI work. | |

**User's choice:** defaults.
**Notes:** Unauthorized page access should redirect to `/dashboard?error=unauthorized`.

---

## API Role Enforcement Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| All write routes in Phase 7B scope | Convert relevant `POST`, `PATCH`, and `DELETE` routes to shared auth helpers. | yes |
| High-risk routes only | Faster, but leaves inconsistent auth patterns. | |
| All routes including GET | Strongest consistency, but bigger blast radius. | |

**User's choice:** defaults.
**Notes:** Focus helper migration on write routes in Phase 7B scope.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep GET routes mostly as-is unless role access is explicitly wrong | Keeps scope focused on RBAC/write enforcement. | yes |
| Convert all GET routes to helpers too | More consistent, but larger phase. | |
| Only touch page middleware, not API GETs | Smallest scope, but misses some role leaks. | |

**User's choice:** defaults.
**Notes:** GET routes are touched only where access is wrong or leaking.

| Option | Description | Selected |
|--------|-------------|----------|
| `403 Forbidden` | Correct semantic match for authenticated-but-wrong-role and matches `requireRole`. | yes |
| Keep existing mixed `401/403` behavior | Less churn, but inconsistent. | |
| Hide permission failures as `404` | Not needed for this internal app. | |

**User's choice:** defaults.
**Notes:** Wrong-role API failures should return `403`.

---

## SUPER_ADMIN Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Only `/admin/*` directly; tenant routes only through impersonation/read flows | Keeps the admin surface clean. | yes |
| Allow direct access to tenant app routes too | Convenient, but easier to mix system and tenant context. | |
| Allow direct API reads but not pages | Useful for admin tools, but needs careful route rules. | |

**User's choice:** defaults.
**Notes:** `SUPER_ADMIN` should operate directly in `/admin/*`.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, impersonation is read-only | Existing middleware already enforces this; safest for auditability. | yes |
| Allow writes with audit log | More powerful, but out of scope unless audit logging is fixed. | |
| Allow only selected writes | Complex and risky for this phase. | |

**User's choice:** defaults.
**Notes:** Impersonation remains read-only.

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit admin routes use unscoped/system access; normal tenant APIs require impersonation context | Keeps broad access explicit. | yes |
| Any `SUPER_ADMIN` session can bypass tenant filters anywhere | Matches `$extends`, but increases accidental all-tenant query risk. | |
| No bypass except admin dashboard stats | Too restrictive for planned admin tools. | |

**User's choice:** defaults.
**Notes:** Avoid accidental all-tenant reads from normal tenant APIs.

---

## Sidebar vs Middleware Source of Truth

| Option | Description | Selected |
|--------|-------------|----------|
| Create one shared permission map for app routes and reuse it in middleware/sidebar | Prevents drift. | yes |
| Keep separate maps but update both carefully | Less refactor, but repeats this problem. | |
| Middleware only as source of truth; sidebar can stay best-effort | Secure, but users may see links they cannot open. | |

**User's choice:** defaults.
**Notes:** Route permissions should be centralized.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, sidebar visibility should match allowed route access | Keeps UX and enforcement aligned. | yes |
| Mostly, but allow some links to be visible and fail on click | Poor UX for low-tech users. | |
| Sidebar is independent UX; middleware is security | More flexible, but risky drift. | |

**User's choice:** defaults.
**Notes:** Sidebar and middleware should agree exactly for tenant navigation.

| Option | Description | Selected |
|--------|-------------|----------|
| Role matrix tests for middleware + sidebar filtering + key API write guards | Covers the core RBAC contract. | yes |
| Middleware tests only | Security first, but misses UX drift. | |
| E2E browser role walkthroughs only | More realistic, but heavier. | |

**User's choice:** defaults.
**Notes:** Tests should verify middleware, sidebar filtering, and key write guards.

---

## the agent's Discretion

- Exact shared permission map shape and filename.
- Exact split between unit and integration-style tests.
- Route-by-route sequencing for helper migration.

## Deferred Ideas

- SUPER_ADMIN writes during impersonation with audit logging — future phase after audit logging gaps are fixed.
