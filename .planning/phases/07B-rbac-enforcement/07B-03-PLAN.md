---
phase: 07B-rbac-enforcement
plan: "03"
type: execute
wave: 3
depends_on: ["07B-01", "07B-02"]
files_modified:
  - src/app/api/orders/route.ts
  - src/middleware.ts
  - src/lib/rbac/permissions.ts
  - tests/rbac/permissions.test.ts
  - tests/rbac/api-guards.test.ts
autonomous: true
requirements:
  - AUTH-05
  - AUTH-06
  - SEC-01
  - SEC-02
  - SEC-03
  - RBAC-01
  - RBAC-02
  - RBAC-03
  - RBAC-04
  - RBAC-05
requirements_addressed: [AUTH-05, AUTH-06, SEC-01, SEC-02, SEC-03, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05]
must_haves:
  truths:
    - "STAFF can access order/customer workflows without gaining accountant/admin operations"
    - "SUPER_ADMIN direct access remains under /admin/*, with tenant reads mediated by explicit admin APIs or impersonation context"
    - "Impersonation writes remain blocked"
    - "Phase 6 security baseline does not regress: no hardcoded JWT secret fallback and no seed JWT token printing"
    - "Automated tests cover middleware/sidebar matrix and key API write guards"
---

<objective>
Close RBAC edge cases and add regression tests: allow STAFF order reads where required, keep SUPER_ADMIN tenant access explicit, verify impersonation remains read-only, and validate the Phase 6 security baseline still holds.
</objective>

<execution_context>
@D:/IceFlow SaaS/.codex/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07B-rbac-enforcement/07B-CONTEXT.md
@.planning/phases/07B-rbac-enforcement/07B-RESEARCH.md
@src/app/api/orders/route.ts
@src/middleware.ts
@src/lib/db.ts
@src/lib/auth.ts
@prisma/seed-system-factory.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix STAFF order read access without broadening write access</name>
  <files>src/app/api/orders/route.ts</files>
  <action>
Update `GET /api/orders` so `STAFF` can read orders for their own factory, matching Phase 7B route matrix and STAFF access to `/orders`.

Preserve:

- `session.factoryId` required.
- `where: { factoryId: session.factoryId }` defense-in-depth.
- ACCOUNTANT and ADMIN access.

Do not grant STAFF access to settlement, inventory, vehicle, billing, staff, driver creation, or order reconciliation writes.
  </action>
  <verify>
    <automated>rg "STAFF" src/app/api/orders/route.ts</automated>
    <automated>rg "factoryId: session\\.factoryId" src/app/api/orders/route.ts</automated>
  </verify>
  <done>STAFF can read `/api/orders` for their factory while write and operational routes remain restricted.</done>
</task>

<task type="auto">
  <name>Task 2: Verify SUPER_ADMIN direct tenant route boundaries</name>
  <files>src/middleware.ts, src/lib/rbac/permissions.ts, tests/rbac/permissions.test.ts</files>
  <action>
Ensure direct `SUPER_ADMIN` access is constrained to `/admin/*` and not granted through tenant route permissions.

Expected behavior:

- `/admin/*` remains outside tenant app route permissions and is checked by admin API/page logic.
- `canAccessPath('SUPER_ADMIN', '/orders')` returns false.
- `canAccessPath('SUPER_ADMIN', '/settings')` returns false.
- Tenant data read access for SUPER_ADMIN should happen via admin APIs or impersonation context, not broad tenant route access.
  </action>
  <verify>
    <automated>npx tsx --test tests/rbac/permissions.test.ts</automated>
  </verify>
  <done>SUPER_ADMIN does not gain direct tenant route access through the shared tenant permission map.</done>
</task>

<task type="auto">
  <name>Task 3: Add API guard regression tests</name>
  <files>tests/rbac/api-guards.test.ts</files>
  <action>
Create focused tests that catch regressions in the Phase 7B contract without requiring a browser.

Minimum coverage:

- In-scope write route source files import `requireRole`.
- In-scope write route source files no longer contain manual `session.role !== ...` checks.
- `src/app/api/orders/route.ts` allows STAFF in GET role logic.
- Middleware source still contains the impersonation write block and `READ_ONLY_IMPERSONATION` response code.
- `src/lib/auth.ts` contains no hardcoded fallback secret.
- `prisma/seed-system-factory.ts` does not print JWT tokens.

Use Node's built-in test runner with `tsx`, matching existing project tooling.
  </action>
  <verify>
    <automated>npx tsx --test tests/rbac/api-guards.test.ts</automated>
  </verify>
  <done>Automated guard tests cover API helper migration, STAFF read access, impersonation read-only behavior, and security baseline regression checks.</done>
</task>

<task type="auto">
  <name>Task 4: Run final phase verification</name>
  <files>all files touched in Phase 7B</files>
  <action>
Run final checks after all code changes:

1. `npx tsx --test tests/rbac/*.test.ts`
2. `npx tsc --noEmit -p tsconfig.json`

If `npx tsc` fails from pre-existing Phase 10 build debt, record the exact errors in the summary and verify that the RBAC tests still pass.
  </action>
  <verify>
    <automated>npx tsx --test tests/rbac/*.test.ts</automated>
    <automated>npx tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <done>RBAC tests pass; TypeScript status is recorded honestly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| tenant app -> order API | STAFF should read only factory-scoped orders |
| SUPER_ADMIN -> tenant app | Direct tenant navigation must not imply all-tenant access |
| impersonation -> write APIs | Read-only guarantee must remain intact |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07B-07 | Elevation of Privilege | STAFF API access | mitigate | Allow STAFF only on order/customer read paths, not operational writes |
| T-07B-08 | Information Disclosure | SUPER_ADMIN tenant routes | mitigate | Shared tenant permission map denies SUPER_ADMIN direct tenant app access |
| T-07B-09 | Tampering | impersonation writes | mitigate | Middleware write block remains and is covered by regression tests |
| T-07B-10 | Spoofing | JWT secret config | mitigate | Regression test verifies no hardcoded JWT fallback returns |
</threat_model>

<verification>
1. `npx tsx --test tests/rbac/*.test.ts`
2. `npx tsc --noEmit -p tsconfig.json`
3. `rg "READ_ONLY_IMPERSONATION" src/middleware.ts`
4. `rg "iceflow-secret-key-change-in-production" src/lib/auth.ts; if ($LASTEXITCODE -eq 0) { exit 1 } else { exit 0 }`
</verification>

<success_criteria>
- [ ] STAFF can read `/api/orders` for their own factory
- [ ] SUPER_ADMIN is not granted direct tenant route access by the tenant permission map
- [ ] Impersonation writes remain blocked
- [ ] Tests verify helper migration and permission matrix behavior
- [ ] Security baseline checks for JWT fallback and token printing pass
</success_criteria>

<output>
After completion, create `.planning/phases/07B-rbac-enforcement/07B-03-SUMMARY.md`.
</output>

