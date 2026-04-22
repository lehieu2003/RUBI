---
phase: 07B-rbac-enforcement
plan: "02"
type: execute
wave: 2
depends_on: ["07B-01"]
files_modified:
  - src/app/api/customers/route.ts
  - src/app/api/drivers/route.ts
  - src/app/api/customers/import/route.ts
  - src/app/api/deposits/shells/route.ts
  - src/app/api/orders/[id]/status/route.ts
  - src/app/api/orders/[id]/reconcile/route.ts
  - src/app/api/orders/bulk-assign/route.ts
  - src/app/api/staff/route.ts
  - src/app/api/staff/[id]/route.ts
  - src/app/api/subscriptions/[id]/route.ts
  - src/app/api/subscriptions/cancel/route.ts
  - src/app/api/payments/confirm/route.ts
  - src/app/api/prices/global/route.ts
  - src/app/api/prices/customer/override/route.ts
autonomous: true
requirements:
  - AUTH-05
  - AUTH-06
  - RBAC-05
requirements_addressed: [AUTH-05, AUTH-06, RBAC-05]
must_haves:
  truths:
    - "All in-scope tenant write API endpoints call shared auth helpers before processing request bodies or mutating data"
    - "Wrong-role authenticated API users receive 403 Forbidden"
    - "factoryId checks and explicit factoryId filters remain in place after helper migration"
    - "GET routes are not broadened except where Phase 7B explicitly requires it"
---

<objective>
Migrate in-scope write API route authorization from ad hoc `getSession()` role checks to shared auth helpers, preserving tenant factory scoping and existing validation behavior.
</objective>

<execution_context>
@D:/IceFlow SaaS/.codex/get-shit-done/workflows/execute-plan.md
@D:/IceFlow SaaS/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/07B-rbac-enforcement/07B-CONTEXT.md
@.planning/phases/07B-rbac-enforcement/07B-RESEARCH.md
@src/lib/auth/helpers.ts
</context>

<interfaces>
Shared helper contract from `src/lib/auth/helpers.ts`:

```typescript
export async function requireSession(): Promise<JWTPayload>;
export async function requireRole(roles: string[]): Promise<JWTPayload>;
export async function requireFactoryId(): Promise<JWTPayload>;
export async function requireActiveSubscription(): Promise<JWTPayload>;
```

Current helper behavior: `requireRole(...)` throws `NextResponse.json({ error: 'Forbidden' }, { status: 403 })` for authenticated wrong-role users.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Migrate ADMIN-only tenant write routes</name>
  <files>src/app/api/customers/route.ts, src/app/api/drivers/route.ts, src/app/api/staff/route.ts, src/app/api/staff/[id]/route.ts, src/app/api/subscriptions/[id]/route.ts, src/app/api/subscriptions/cancel/route.ts, src/app/api/payments/confirm/route.ts, src/app/api/prices/global/route.ts, src/app/api/prices/customer/override/route.ts</files>
  <action>
For each ADMIN-only write handler, replace manual `getSession()` + `session.role !== 'ADMIN'` checks with `const session = await requireRole(['ADMIN']);`.

Preserve:

- Existing `session.factoryId` checks where the route needs tenant scope.
- Existing explicit `factoryId: session.factoryId` query filters.
- Existing request body parsing and validation.
- Existing response shapes.

For routes using `prismaAuth` for global uniqueness checks, keep `prismaAuth`; only change authorization.

Routes to include:

- `POST /api/customers`
- `POST /api/drivers`
- `POST /api/staff`
- `PATCH /api/staff/[id]`
- `DELETE /api/staff/[id]`
- `PATCH /api/subscriptions/[id]`
- `POST /api/subscriptions/cancel`
- `POST /api/payments/confirm`
- `POST /api/prices/global`
- `POST /api/prices/customer/override`
- `DELETE /api/prices/customer/override`
  </action>
  <verify>
    <automated>rg "requireRole\\(\\['ADMIN'\\]\\)" src/app/api/customers/route.ts src/app/api/drivers/route.ts src/app/api/staff/route.ts src/app/api/staff/[id]/route.ts src/app/api/subscriptions/[id]/route.ts src/app/api/subscriptions/cancel/route.ts src/app/api/payments/confirm/route.ts src/app/api/prices/global/route.ts src/app/api/prices/customer/override/route.ts</automated>
  </verify>
  <done>ADMIN-only write routes use `requireRole(['ADMIN'])` before mutation logic.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate ADMIN/ACCOUNTANT operational write routes</name>
  <files>src/app/api/customers/import/route.ts, src/app/api/deposits/shells/route.ts, src/app/api/orders/[id]/status/route.ts, src/app/api/orders/[id]/reconcile/route.ts, src/app/api/orders/bulk-assign/route.ts</files>
  <action>
For each operational write handler that should allow ADMIN and ACCOUNTANT, replace manual role checks with `const session = await requireRole(['ADMIN', 'ACCOUNTANT']);`.

Preserve explicit tenant guards:

- Keep `session.factoryId` validation where present.
- Add `session.factoryId` validation where absent but tenant data is mutated.
- Ensure order/customer/driver/subscription queries still include `factoryId: session.factoryId` where the model is tenant scoped.

Routes to include:

- `POST /api/customers/import`
- `PATCH /api/deposits/shells`
- `PATCH /api/orders/[id]/status`
- `PATCH /api/orders/[id]/reconcile`
- `PATCH /api/orders/bulk-assign`
  </action>
  <verify>
    <automated>rg "requireRole\\(\\['ADMIN', 'ACCOUNTANT'\\]\\)" src/app/api/customers/import/route.ts src/app/api/deposits/shells/route.ts src/app/api/orders/[id]/status/route.ts src/app/api/orders/[id]/reconcile/route.ts src/app/api/orders/bulk-assign/route.ts</automated>
    <automated>rg "factoryId: session\\.factoryId" src/app/api/customers/import/route.ts src/app/api/deposits/shells/route.ts src/app/api/orders/[id]/status/route.ts src/app/api/orders/[id]/reconcile/route.ts src/app/api/orders/bulk-assign/route.ts</automated>
  </verify>
  <done>ADMIN/ACCOUNTANT write routes use shared role helpers and retain explicit tenant scoping.</done>
</task>

<task type="auto">
  <name>Task 3: Normalize wrong-role API status to 403</name>
  <files>same files as Tasks 1-2</files>
  <action>
After helper migration, ensure wrong-role users receive 403 via `requireRole(...)`. Do not leave local wrong-role returns with 401 in write paths.

Do not change unauthenticated behavior: missing auth remains 401 through `requireSession()`.
  </action>
  <verify>
    <automated>rg "session\\.role !==|session\\.role !== 'ADMIN'|session\\.role !== 'ACCOUNTANT'" src/app/api/customers/route.ts src/app/api/drivers/route.ts src/app/api/customers/import/route.ts src/app/api/deposits/shells/route.ts src/app/api/orders/[id]/status/route.ts src/app/api/orders/[id]/reconcile/route.ts src/app/api/orders/bulk-assign/route.ts src/app/api/staff/route.ts src/app/api/staff/[id]/route.ts src/app/api/subscriptions/[id]/route.ts src/app/api/subscriptions/cancel/route.ts src/app/api/payments/confirm/route.ts src/app/api/prices/global/route.ts src/app/api/prices/customer/override/route.ts; if ($LASTEXITCODE -eq 0) { exit 1 } else { exit 0 }</automated>
  </verify>
  <done>No in-scope write route uses manual role comparison after migration.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client -> tenant write API | User may attempt mutations outside assigned role |
| API handler -> database | Mutations must retain explicit factoryId scoping |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07B-04 | Elevation of Privilege | write API routes | mitigate | Every in-scope write handler calls `requireRole(...)` before mutation |
| T-07B-05 | Information Disclosure | wrong-role API errors | mitigate | Wrong-role users receive consistent 403, unauthenticated users receive 401 |
| T-07B-06 | Tampering | tenant mutations | mitigate | Preserve explicit `factoryId: session.factoryId` filters on all tenant mutations |
</threat_model>

<verification>
1. `rg "requireRole" src/app/api` confirms helper usage in in-scope write routes
2. `rg "session.role !==" ...` returns no matches in migrated write routes
3. `npx tsc --noEmit -p tsconfig.json`
</verification>

<success_criteria>
- [ ] ADMIN-only write routes use `requireRole(['ADMIN'])`
- [ ] ADMIN/ACCOUNTANT write routes use `requireRole(['ADMIN', 'ACCOUNTANT'])`
- [ ] In-scope write routes no longer use manual role comparisons
- [ ] Existing factoryId checks and explicit tenant filters remain
- [ ] TypeScript compile passes
</success_criteria>

<output>
After completion, create `.planning/phases/07B-rbac-enforcement/07B-02-SUMMARY.md`.
</output>

