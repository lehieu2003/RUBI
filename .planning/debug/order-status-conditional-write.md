---
status: awaiting_human_verify
trigger: "H4 + #5 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: order settlement (src/app/api/orders/[id]/reconcile/route.ts) and status change (src/app/api/orders/[id]/status/route.ts) check order status on a separate read, then write with no status condition. Overlapping requests can book DEBT and deduct stock twice, overwrite CANCELLED with COMPLETED, reopen a COMPLETED order, or erase a driver's DELIVERED status. Fix by making the write conditional (updateMany with status in the where clause, 409 when count is 0), following src/app/api/orders/[id]/confirm/route.ts:50-51. Add regression tests that run only on a throwaway local Postgres, never the Supabase DB in .env. Work on branch fix/order-status-conditional-write off dev and open a PR into dev."
created: 2026-10-15
updated: 2026-10-15
branch: fix/order-status-conditional-write
---

# Debug Session: Order Status Conditional Write

## Symptoms

Source: audit-reviewer-verified findings H4 and #5 in `.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md` (raw: `.planning/audits/2026-10-15-raw/02-race-condition-auditor.md` RACE-1, RACE-2, RACE-3). Not reproduced at runtime yet.

- **Expected:**
  - A DELIVERED order is settled exactly once: one DEBT ledger row and one stock deduction per line. A second settlement gets 409.
  - Settlement must not complete an order that was CANCELLED in the meantime.
  - The status endpoint must not change a COMPLETED or CANCELLED order, and must not overwrite a status that changed since the client loaded it (e.g. driver confirmed DELIVERED) — 409 instead.
- **Actual (from code reading):**
  - `reconcile/route.ts:37-46` checks `order.status !== 'DELIVERED'` on a plain `findFirst`; the write at `:62-65` is `tx.order.update({ where: { id } ... })` with no status condition; DEBT insert `:76-83`; `changeStock` `:91`. No isolationLevel (Postgres READ COMMITTED), no FOR UPDATE, no unique ledger↔order key (`prisma/schema.prisma:216-226`).
  - `status/route.ts:47-63` reads `existing.status` and rejects COMPLETED/CANCELLED at `:55`, but the write at `:67-81` is `prisma.order.update({ where: { id, factoryId } })`; `StatusSchema` (`:12-15`) carries no expected status; `deliveredAt` is reset to null at `:76`.
- **Error messages:** none — failures are silent data corruption.
- **Timeline:** present since these routes were written; tests only check source text (`tests/api/order-status.test.ts:37-39`).
- **Reproduction (proposed):**
  1. Two concurrent `PATCH /api/orders/{id}/reconcile` for one DELIVERED order → both 200, two DEBT rows, stock deducted twice.
  2. Reconcile reads DELIVERED; status PATCH cancels; reconcile writes COMPLETED + DEBT on a cancelled order.
  3. Reconcile commits COMPLETED; a status PATCH that read DELIVERED earlier writes PENDING/SHIPPING over it.
  4. Driver confirms DELIVERED; staff with a stale screen PATCHes SHIPPING/PENDING → delivery and `deliveredAt` erased.
- **Reference pattern:** `src/app/api/orders/[id]/confirm/route.ts:50-51` (conditional `updateMany`, 409 on count 0).

## Constraints

- Regression tests must run only against a throwaway local Postgres. Never the Supabase DB configured in `.env` (production). Reuse/mirror the guard in `e2e/support/env.ts:5-20`.
- No schema change expected; if one becomes necessary it must go through Prisma Migrate (`npm run db:migrate`), never `prisma db push`.
- Web and mobile clients call these endpoints (`src/app/settle/page.tsx`, `src/app/orders/page.tsx`, `mobile/lib/features/orders/...`). Any request-shape change (e.g. an expected-status field) must stay backward compatible or update both clients and `api/openapi/order.yaml`.
- Keep the fix surgical: match surrounding code style; one logical change per commit (Conventional Commits).

## Current Focus

reasoning_checkpoint:
  hypothesis: "reconcile and status routes check status on a read, then write with `where: { id }` only. Under READ COMMITTED, a writer blocked on the order row lock re-applies its update to the committed newer row version, so it settles twice, completes a CANCELLED order, or reopens a COMPLETED one. The status PATCH also carries no client-seen status, so a stale screen overwrites DELIVERED."
  confirming_evidence:
    - "e2e/order-races.spec.ts RED on local Docker Postgres: two concurrent reconciles both 200 (expected 200+409)"
    - "reconcile on an order cancelled under it returns 200 (expected 409)"
    - "status PATCH PENDING on an order settled under it returns 200 (expected 409)"
    - "status PATCH with expectedStatus SHIPPING on a DELIVERED order returns 200 (field ignored)"
  falsification_test: "With conditional updateMany (status in WHERE), Postgres re-evaluates WHERE after the lock wait; if tests still see double 200 / overwrites, the hypothesis is wrong"
  fix_rationale: "Status predicate in the write itself makes check and write atomic per row (same as confirm/route.ts:50-51); count 0 -> 409"
  blind_spots: "mobile client does not send expectedStatus (optional field, backward compatible) so stale-screen protection on mobile only covers the status read at request time"

tdd_checkpoint:
  test_file: "e2e/order-races.spec.ts"
  test_name: "settlement racing another change / status change racing another change (4 RED, 1 positive control green)"
  status: "green"
  run: "E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- order-races"
  failure_output: "two settlements: received [200,200] expected [200,409]; cancelled-while-settling: 409 expected, 200 received; reopen-settled: 409 expected, 200 received; stale screen: 409 expected, 200 received"

planned_fix (green phase):
  - reconcile/route.ts: move order write first, `tx.order.updateMany({ where: { id, factoryId: session.factoryId, status: 'DELIVERED' }, data: { status: 'COMPLETED', completedAt: new Date() } })`; count 0 -> 409 ORDER_NOT_DELIVERED before any other write
  - status/route.ts: optional `expectedStatus` (PENDING|SHIPPING|DELIVERED) in StatusSchema; interactive tx with updateMany where `status: expectedStatus ?? existing.status`; count 0 -> 409 ORDER_STATUS_CHANGED; audit only on success; return re-read order
  - update tests/api/order-status.test.ts:38 (asserts `prisma.order.update(`) and tests/api/settle-page.test.ts:41 if text changes
  - src/lib/contracts/orders.ts body + notes, `npm run contract:docs` -> api/openapi/order.yaml, add 409 note to reconcile
  - src/app/orders/page.tsx: send expectedStatus = selectedOrder.status
next_action: hand back DEBUG COMPLETE; orchestrator opens PR into dev. Follow-up: mobile client should send expectedStatus (stale-screen gap on mobile).

## Evidence

- timestamp: 2026-10-15
  checked: reconcile/route.ts, status/route.ts, confirm/route.ts, CI workflow, e2e infra
  found: Code matches symptoms. CI already runs Playwright e2e on a service Postgres (iceflow_e2e); `npm test` (tsx tests/run-tests.ts) is source-text only. e2e/support/env.ts refuses non-local URLs. Docker is available locally.
  implication: DB-backed regression tests belong in e2e/ (local-only guard + already in CI), not in `npm test`.

- timestamp: 2026-10-15
  checked: RED run of e2e/order-races.spec.ts (local Docker Postgres iceflow-e2e-pg, port 55433)
  found: 4 of 4 race tests fail as predicted; positive control passes. Bugs reproduced deterministically via row lock held by the test.
  implication: root cause confirmed

- timestamp: 2026-10-15
  checked: GREEN run after fix (commits d8d606d, bb6f762, 7bcc1ef)
  found: e2e order-races 5/5 pass; full e2e suite 45/45 pass (one earlier full run had audit-log order-entry toast timeout before any status/reconcile call; passed alone 5/5 and on full rerun 45/45 — flaky, unrelated); npm test 299/299; lint 0 errors (65 pre-existing warnings); typecheck exit 0; build exit 0; contract:verify 58/58 in 192 calls on a local seeded server (port 3200, Docker Postgres 55434)
  implication: fix verified; no regressions

## Eliminated

## Resolution

- root_cause: check-then-act. reconcile and status routes checked the status on a plain read, then wrote with `where: { id }` (no status predicate). Under READ COMMITTED a writer blocked on the row lock re-applies its update to the newer committed row, so a second settlement booked debt/stock again, a cancelled order got completed, a settled order got reopened. The status PATCH also carried no client-seen status, so a stale screen overwrote DELIVERED.
- fix: reconcile marks the order COMPLETED first with `tx.order.updateMany({ where: { id, factoryId, status: 'DELIVERED' } })`, 409 ORDER_NOT_DELIVERED on count 0 before any other write. Status route: optional `expectedStatus` (PENDING|SHIPPING|DELIVERED), pre-check against the read, then interactive transaction with `updateMany` where `status: existing.status`, audit only on success, re-read order; 409 ORDER_STATUS_CHANGED on mismatch/count 0. Web orders drawer sends expectedStatus and invalidates the orders query on 409. Contract + OpenAPI updated; source-text tests updated.
- verification: e2e order-races 5/5 GREEN (was 4 RED); full e2e 45/45; npm test 299/299; lint 0 errors; typecheck ok; build ok; contract:verify 58/58. All DB runs on throwaway local Docker Postgres only.
- files_changed: [src/app/api/orders/[id]/reconcile/route.ts, src/app/api/orders/[id]/status/route.ts, src/app/orders/page.tsx, src/lib/contracts/orders.ts, api/openapi/order.yaml, tests/api/contracts.test.ts, tests/api/order-status.test.ts, tests/lib/audit.test.ts]
- follow_up: mobile (mobile/lib/features/orders/...) does not send expectedStatus yet; it still gets the race protection (status re-checked in the write) but not stale-screen protection.
