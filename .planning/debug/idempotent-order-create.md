---
status: resolved
trigger: "Follow-ups of PR #102 (Idempotency-Key for payments, shells ADD, inventory; helper src/lib/idempotency.ts, table idempotency_keys, web hook src/lib/submission-key.ts, mobile mobile/lib/core/network/idempotency.dart; see .planning/debug/idempotent-writes.md): (1) order creation is not idempotent; (2) old idempotency keys are never pruned."
created: 2026-10-17
updated: 2026-10-17
branch: fix/idempotent-order-create
---

# Debug Session: Idempotent Order Create (+ key pruning)

## Symptoms

### Item 1 — Order creation is not covered by Idempotency-Key

- **Where:** `POST /api/orders` (used by the Flutter app) reuses the server action `saveOrder` in `src/lib/actions/orders.ts`; the web order drawer calls `saveOrder` directly.
- **Actual:** a resend of the same order (retry after a lost response, double submit from a second path) creates two orders. Today only mitigated in the UI (web `isSaving` guard; mobile "unsure" message in `order_entry_cubit.dart`).
- **Expected (same semantics as #102):** resend with the same key → first answer, nothing written again; key reused with another body → 422 `IDEMPOTENCY_KEY_REUSED`; refused (non-2xx) → key released; no key → unchanged behaviour.
- **Fix direction:** HTTP route reads the `Idempotency-Key` header; the web drawer passes one key per submission to the server action (new optional argument, reused until the drawer is reset); the mobile order entry sends the header with one key per submission (kept until the entry is cleared).

### Item 2 — Old idempotency keys are never deleted

- **Actual:** rows in `idempotency_keys` accumulate forever.
- **Expected:** keys older than 30 days are pruned without a scheduler, e.g. an opportunistic bounded delete when a key is claimed (or another simple, justified approach). The `created_at` index exists. Must not noticeably slow the hot path and must be safe under concurrency.

## Constraints

- No schema change expected (reuse `idempotency_keys`). If one becomes necessary, STOP and return a checkpoint.
- Work the items one at a time: a failing-test commit then a fix commit for each (TDD).
- DATABASE SAFETY: `.env` is PRODUCTION Supabase. DB-backed tests only via `scripts/e2e-local.sh` (throwaway Docker Postgres, guard `e2e/support/env.ts`). For `npm run build` outside that script, point BOTH `DATABASE_URL` and `DIRECT_URL` at a local throwaway URL. If a build over `.next` crashes in webpack ("reading 'hash'"), delete `.next` and retry. Use `openPage()` from `e2e/support/app.ts` for specs that open a page.
- Do not commit the untracked `.codegraph/` or `graph.dot`. Do not push, do not open the PR, do not switch branches.
- Commits: Conventional Commits (scope `api`, `web`, `mobile`), one logical change each, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Tests (TDD — write failing first)

- e2e (modelled on `e2e/idempotent-writes.spec.ts`) for POST /api/orders: sequential resend, concurrent resend, different keys, no key, reused key with other body.
- Web drawer test: a resubmission with the same key does not create a second order.
- Pruning test: seed an old key row, claim a new key, old one gone.
- Flutter tests: order entry sends the header and reuses it for the same submission.

## Gates

- Web: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, new specs + FULL e2e suite with counts, `npm run contract:docs` + `npm run contract:verify` on a LOCAL server (contract gains the header).
- Mobile (from `mobile/`): `flutter analyze`, `flutter test`.
- Report real outputs only.

## Current Focus

hypothesis: confirmed (item 1: saveOrder / POST /api/orders never used the #102 helper; item 2: nothing deleted idempotency_keys rows).
tdd_checkpoint (item 1): green — e2e/idempotent-order-create.spec.ts 8/8, unit 331/331, flutter orders +114.
tdd_checkpoint (item 2): green — e2e/idempotency-key-pruning.spec.ts 1/1 (was red).
next_action: none — session resolved; branch ready for PR into dev (not pushed).

## Evidence

- timestamp: 2026-10-17
  checked: src/lib/idempotency.ts, src/lib/actions/orders.ts, src/app/api/orders/route.ts, src/components/order/order-entry-drawer.tsx, mobile order entry repository + cubit
  found: The helper only works with a Request + NextResponse (from/run/finish). saveOrder is a server action returning SaveOrderResult; POST /api/orders never reads Idempotency-Key and calls saveOrder; the drawer calls saveOrder(input) with no key and has no try/catch, so a server action whose answer is lost rejects and leaves isSaving true (the drawer cannot be confirmed again). Mobile createOrder has no key parameter. Business refusals of an order (404 customer, 400 product/price) are thrown BEFORE saveOrderInternal's $transaction, so a key claimed inside the transaction is never kept for a refusal. No code deletes idempotency_keys rows; index on created_at exists.
  implication: Root cause confirmed by reading. Needs a non-HTTP entry to the helper (key string + plain status/body) usable by the server action.

- timestamp: 2026-10-17
  checked: RED for item 1 (before any fix)
  found: |
    e2e (scripts/e2e-local.sh idempotent-order-create, E2E_BROWSER_CHANNEL=chrome; first build hit the known webpack "reading 'hash'" crash, .next removed and rerun): 5 failed, 3 passed (25.4s).
      1) same key sequential: second answer is a different order (id cmvbql83c... vs cmvbql83y...) -> written twice
      2) same key concurrent: two different order ids -> written twice
      3) key reused with other quantities: Expected 422, Received 201
      4) drawer, same save delivered twice: Expected 1 order, Received 2
      5) drawer, answer lost: no "chưa rõ đơn đã lưu" message (the rejected server action leaves the drawer stuck in isSaving)
      passed (guards): own keys -> 2 orders; no key -> 2 orders; refused order then resend with same key -> taken.
    npm test: 331 tests, 327 pass, 4 fail (the 3 new wiring checks in tests/lib/idempotency.test.ts + the updated saveOrder call in tests/api/create-order.test.ts).
    flutter test test/features/orders: +50 -4, compile errors "No named parameter with the name 'idempotencyKey'" in order_entry_repository_impl_test, order_entry_cubit_test, order_entry_screen_test, orders_tab_test (the parameter does not exist yet).
  implication: every failure is the bug itself (double write, no 422, no way to resend), not a setup error. Proceed to GREEN.

- timestamp: 2026-10-17
  checked: GREEN for item 1 (reviewed uncommitted fix: Idempotency.forKey/runWith/keep added to the helper, saveOrder(input, key) claims the key first in its $transaction and keeps the 201 answer, route passes the header and the error code, drawer sends useSubmissionKey().key(...) and catches a rejected server action, mobile createOrder(idempotencyKey) + cubit SubmissionKey reset on customer change / success)
  found: |
    npm test: 331 tests, 331 pass, 0 fail.
    flutter test test/features/orders: +114, All tests passed.
    scripts/e2e-local.sh idempotent-order-create (E2E_BROWSER_CHANNEL=chrome, fresh .next): 8 passed (9.5s).
  implication: item 1 fixed; refusals are thrown before the transaction so the key is never kept for them.

- timestamp: 2026-10-17
  checked: RED for item 2 — e2e/idempotency-key-pruning.spec.ts (seed keys 31 and 29 days old, claim a new key via POST /api/orders, expect the 31-day one gone, the 29-day one and the new one kept)
  found: |
    scripts/e2e-local.sh idempotency-key-pruning: first build hit the webpack "reading 'hash'" crash, .next removed, rerun: 1 failed.
      expect(received).toBeNull() at line 38 — Received the 31-day-old row (createdAt 2026-09-16, factory-mien-dong): nothing deletes old keys.
  implication: item 2 confirmed. Fix: after a write that claimed a key, delete up to N keys older than 30 days in its own statement (outside the write's transaction, which may be Serializable for payments), FOR UPDATE SKIP LOCKED so concurrent claims never wait on each other, errors swallowed so the write's answer is never affected. No schema change: created_at index exists.

- timestamp: 2026-10-17
  checked: GREEN for item 2 and all gates (after commit 086464e)
  found: |
    scripts/e2e-local.sh idempot payment-serialization (fresh .next): 26 passed (10.0s) — pruning 1/1, order create 8/8, idempotent-writes 16/16, payment serialization retry 1/1.
    npm run lint: 0 errors, 65 warnings (none in files touched here; e.g. pre-existing unused apiError in src/app/api/auth/logout/route.ts).
    npm run typecheck: tsc --noEmit clean.
    npm test: 331 tests, 331 pass, 0 fail.
    npm run build (DATABASE_URL and DIRECT_URL = local throwaway URL, fresh .next): exit 0, "Compiled successfully", 52/52 static pages.
    FULL e2e (scripts/e2e-local.sh, E2E_BROWSER_CHANNEL=chrome, fresh .next): 104 passed (1.6m), 0 failed.
    npm run contract:docs: wrote 21 files to api/openapi/, no diff against the committed docs.
    npm run contract:verify against a local standalone server (throwaway Postgres 55434, seeded, port 3200): 58/58 contracts verified in 192 calls.
    mobile: flutter analyze "No issues found!"; flutter test +685 "All tests passed!".
  implication: both items fixed, no regression. Throwaway containers and the local server were stopped.

## Eliminated

## Resolution

root_cause: |
  (1) Order creation never used the #102 idempotency helper: POST /api/orders ignored the Idempotency-Key header and the web drawer called the saveOrder server action without a key, so every resend wrote a new order. The helper only spoke Request/NextResponse, so a server action could not use it; the drawer also had no try/catch, so a rejected server action left it stuck in isSaving.
  (2) No code ever deleted rows from idempotency_keys.
fix: |
  (1) Helper gains Idempotency.forKey (key passed directly), runWith (run for non-NextResponse results) and keep (store a success answer). saveOrder(input, idempotencyKey?) claims the key as the first statement of its $transaction and keeps the 201 order as the last; refusals (404/400) are thrown before the transaction so no key is kept; a reused key answers 422 IDEMPOTENCY_KEY_REUSED. POST /api/orders passes the header and the error code. The drawer sends useSubmissionKey().key(JSON.stringify(input)), reset with the entry, and on a rejected action shows "chưa rõ đơn đã lưu chưa" so the same key can be resent. Mobile createOrder(idempotencyKey) sends the header; the cubit keeps one SubmissionKey per (customer, lines, notes), dropped on customer change or success. Contract + OpenAPI docs gain the header and 422.
  (2) After a write that claimed a key, runWith deletes up to 100 keys with created_at older than 30 days (indexed), via the main client outside the write's (possibly Serializable) transaction, errors logged and swallowed. Concurrent prunes at worst target the same rows; no scheduler, no schema change.
verification: e2e new specs 9/9 (were 5 failed + 1 failed), full e2e 104/104, npm test 331/331, typecheck clean, lint 0 errors, build ok, contract:verify 58/58 on local server, flutter analyze clean, flutter test +685.
files_changed:
  - src/lib/idempotency.ts
  - src/lib/actions/orders.ts
  - src/app/api/orders/route.ts
  - src/lib/order-entry-error.ts
  - src/lib/submission-key.ts
  - src/components/order/order-entry-drawer.tsx
  - src/lib/contracts/orders.ts
  - scripts/generate-api-docs.ts
  - api/openapi/README.md
  - api/openapi/order.yaml
  - mobile/lib/features/orders/data/order_entry_repository_impl.dart
  - mobile/lib/features/orders/domain/repositories/order_entry_repository.dart
  - mobile/lib/features/orders/presentation/cubit/order_entry_cubit.dart
  - e2e/idempotent-order-create.spec.ts (test)
  - e2e/idempotency-key-pruning.spec.ts (test)
  - tests/lib/idempotency.test.ts, tests/api/create-order.test.ts (test)
  - mobile/test/features/orders/** (test)
