---
status: awaiting_human_verify
trigger: "H2 long-term part from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: payments, shell 'Ghi thêm' (ADD) and production batch 'Nhập mẻ' (inventory ADD) are additive and not idempotent on the server, so any resend of the same request (retry after a lost response, a second client, a future auto-retry) records it twice. Add a client-supplied idempotency key enforced by the database. The short-term client mitigation already shipped in #98."
created: 2026-10-15
updated: 2026-10-15
branch: fix/idempotent-writes
---

# Debug Session: Idempotent Writes

## Symptoms

Source: audit-reviewer-verified H2 (raw: `.planning/audits/2026-10-15-raw/02-race-condition-auditor.md` RACE-4, `04-flutter-auditor.md` FL-1). Reproduced end-to-end on the emulator on 2026-10-15 (PR #98 verification): with the response held past the 15 s timeout the server had already committed; before #98 a second tap recorded it again.

- **Expected:** One user intent = one write, even if the same request reaches the server twice (sequentially or concurrently). The repeat gets the same success response as the first, and nothing is written again.
- **Actual:** `src/app/api/customers/[id]/payments/route.ts:51-53` (creates a PAYMENT ledger row), `src/app/api/deposits/shells/route.ts:97-100` (`increment` shellsOut/shellsIn), `src/app/api/inventory/route.ts` ADD (`changeStock(... { add })`) have no idempotency key; `prisma/schema.prisma` has no unique business key that could catch a repeat.

## Design constraints

- **Mechanism:** the client sends an `Idempotency-Key` HTTP header (a random UUID generated once per user submission and reused on any resend of that same submission). Optional, so old clients keep working unchanged (no key → today's behaviour).
- Shells and inventory ADD are increments on a running balance (no per-write row), so a per-table unique column does not work for them. Prefer one small table, e.g. `IdempotencyKey { factoryId, key, route/scope, response (Json), createdAt }` with a unique index on (factoryId, key) — or justify an alternative in the session file.
- The key record must be written **in the same transaction** as the business write, inserted first, so a concurrent duplicate blocks on the unique index and then fails with P2002; on P2002 return the stored response of the first request. A key reused for a different route/body should be rejected (409/422) rather than silently returning another request's response — decide and record.
- Scope: the three writes above. Order creation is already mitigated in the UI; add it only if it fits the same helper with no extra risk, otherwise list it as a follow-up.
- Retention: record a follow-up (or a trivial cleanup) for pruning old keys; do not build a scheduler.
- **Clients:** mobile (Dio) sends the header for these three writes — one key per sheet submission, generated when the user taps submit and kept until the sheet closes. Web: `src/components/debt/payment-dialogs.tsx`, `src/app/deposits/shells/page.tsx`, `src/app/inventory/page.tsx` send it too. Update `src/lib/contracts/*` (header documented) and regenerate OpenAPI (`npm run contract:docs`).

## Database safety (hard rules)

- The `DATABASE_URL` / `DIRECT_URL` in `.env` point at the **production** Supabase database. Prisma CLI reads `.env` automatically. **Every** prisma command (`migrate dev`, `migrate deploy`, `generate` is fine) and every test run must be given an explicit local throwaway URL in the environment, e.g. a Docker Postgres on a free port, and the command must be checked to use it before running. Never run `npm run db:migrate` / `db:deploy` / `db:seed` without overriding both URLs.
- Schema change only through Prisma Migrate: create the migration with `prisma migrate dev --name <name>` (`npm run db:migrate`) against the throwaway database; never `prisma db push`. Match existing migration folder naming in `prisma/migrations/`.
- Applying the migration to production is NOT part of this task; the PR must call it out.

## Tests

- DB-backed e2e on throwaway Postgres (`e2e/`, guard in `e2e/support/env.ts`, as `e2e/order-races.spec.ts`): for each of the three writes — same key sent twice sequentially → one write, identical responses; same key twice concurrently → one write; different keys → two writes; no key → unchanged behaviour; same key on a different route/body → rejected.
- Mobile: tests that the three repositories/cubits send an `Idempotency-Key` header and reuse it for the same submission.
- Gates: web (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, the relevant e2e, `npm run contract:verify` on a LOCAL server); mobile (`flutter analyze`, `flutter test`).

## Current Focus

- hypothesis: CONFIRMED and fixed. payments POST, shells PATCH ADD and inventory POST ADD wrote with no record of the submission, so any resend wrote again.
- tdd_checkpoint:
    test_file: e2e/idempotent-writes.spec.ts
    test_name: "a repeated submission is written once › {payment|shells added|production batch} › ..." (16 tests)
    status: green (16/16 after the fix; red was 10 failed / 6 passed)
- reasoning_checkpoint:
    hypothesis: "The three routes write with no record of the submission, so a resend (sequential or concurrent) writes again."
    confirming_evidence:
      - "Red e2e: same key sequential -> 2 ledger rows / double increments; concurrent -> double write or 500."
      - "Routes read no request id; schema has nothing unique per submission."
    falsification_test: "With a key row inserted first in the same transaction, same-key resends still write twice -> hypothesis/design wrong. (Did not happen: 16/16 green.)"
    fix_rationale: "The key row is inserted first in the business transaction; the unique (factory_id, key) index makes a duplicate block then fail, and the stored response is replayed. Removes the double write at the database, not only in the UI."
    blind_spots: "Prisma interactive-transaction default timeout (5 s) while a concurrent duplicate waits on the key (fine in tests, ~125-180 ms); SERIALIZABLE may surface 40001 instead of 23505 (handled by lookup-after-failure). Not tested against Supabase/PgBouncer."
- next_action: human verification (web dialogs + mobile sheets on a local server), then PR into dev calling out the migration; apply `prisma migrate deploy` to production separately.

## Decisions

- **Storage:** one table `idempotency_keys` (id, factory_id FK, key, scope, request_hash, status, response Json, created_at), unique (factory_id, key). Shells and stock are running balances with no per-write row, so a per-table unique column cannot work; one table serves all three writes.
- **Scope string:** `METHOD path` with the real ids, e.g. `POST /api/customers/<id>/payments`, `PATCH /api/deposits/shells`, `POST /api/inventory`. `request_hash` = sha256 of the parsed (validated) body JSON.
- **Key reused for a different route or body → 422 `IDEMPOTENCY_KEY_REUSED`**, nothing written (IETF draft-ietf-httpapi-idempotency-key-header uses 422 for "same key, different payload"; 409 is already used by these routes for business conflicts like PAYMENT_EXCEEDS_DEBT, so 422 keeps the meanings apart).
- **Only successful writes are stored.** The key row is inserted first inside the business transaction and the response written at the end of it; a business refusal (409 PAYMENT_EXCEEDS_DEBT) rolls the key back, so the user can correct and resend.
- **Concurrent duplicate:** blocks on the unique index; when the first commits it fails with P2002 (or P2034/40001 under the payment route's SERIALIZABLE). Any failure of the transaction with a key → look the key up; found → replay (or 422 on mismatch); not found → original error.
- **Order creation: out of scope (follow-up).** Already mitigated in the UI; its route is the hot path with pricing/stock logic and a different response shape — wiring it in is a separate change with its own tests.
- **Retention: follow-up.** Keys only need to live as long as a client might retry (minutes). Follow-up: a periodic `DELETE FROM idempotency_keys WHERE created_at < now() - interval '30 days'` (index on created_at added now so that delete is cheap). No scheduler built here.
- No key header → unchanged behaviour (old clients). Header value must be 1..100 chars, else 400.

## Evidence

- timestamp: 2026-10-15
  checked: src/app/api/customers/[id]/payments/route.ts, src/app/api/deposits/shells/route.ts, src/app/api/inventory/route.ts, src/lib/inventory.ts, prisma/schema.prisma
  found: payments create a PAYMENT ledger row in a Serializable tx (only guard: amount <= owed); shells ADD does upsert with `increment`; inventory ADD calls changeStock({add}) which increments today's row. No request id is read or stored anywhere; schema has no table/column that could identify a repeated submission.
  implication: confirmed by reading — every resend is a new write. Needs a key table written in the same transaction.

- timestamp: 2026-10-15
  checked: Postgres behaviour relevant to the design
  found: a concurrent INSERT of the same unique key blocks on the first transaction's xid; when that commits the waiter gets 23505 (P2002). Under SERIALIZABLE (payments route) Postgres may raise 40001 (Prisma P2034) instead of 23505 for a row inserted by a concurrent tx.
  implication: the helper must treat any failure of the transaction as "maybe a duplicate": if the key row now exists, replay it; otherwise rethrow.

## Evidence (green phase)

- timestamp: 2026-10-15
  checked: e2e/idempotent-writes.spec.ts on throwaway Postgres (scripts/e2e-local.sh, E2E_BROWSER_CHANNEL=chrome)
  found: 16/16 pass. Server log shows exactly 3 `Unique constraint failed on (factory_id, key)` prisma:error lines, one per concurrent test: the second request of each pair failing on the key and then being answered from the stored row.
  implication: the concurrent path goes through block -> P2002 -> replay as designed. The log lines are expected noise (Prisma logs errors in production mode).

- timestamp: 2026-10-15
  checked: Postgres jsonb storage of the response
  found: jsonb does not keep key order, so the replayed body has the same content but maybe a different key order. The e2e compares with toEqual (deep equality), clients parse JSON.
  implication: acceptable; no client relies on key order.

## Eliminated

## Resolution

- root_cause: The three additive writes (POST /api/customers/{id}/payments, PATCH /api/deposits/shells with mode ADD, POST /api/inventory with mode ADD) took no identifier of the user submission, and the schema had nothing unique per submission. Shells and stock are running balances (increment), and a payment is a new ledger row, so every request that reached the server was applied: a resend after a lost response, a second device or a future auto-retry wrote twice. A concurrent same-request pair also either wrote twice or (payments, SERIALIZABLE) returned a 500 to one of them.
- fix: New table `idempotency_keys` (factory_id, key, scope, request_hash, status, response jsonb, created_at; unique (factory_id, key), index on created_at) via migration 20261015100000_add_idempotency_keys. Helper `src/lib/idempotency.ts` (`Idempotency.from/run/begin/finish`): the optional `Idempotency-Key` header (1-100 chars, else 400) is claimed first inside the write's own transaction; the successful answer (status + JSON body) is stored before commit; refusals (non-2xx, e.g. 409 PAYMENT_EXCEEDS_DEBT) delete the claim so the user can correct and resend. A later resend is answered from the stored row; a concurrent one blocks on the unique index, fails when the first commits, and is answered from the stored row; a key reused for another scope or body gets 422 IDEMPOTENCY_KEY_REUSED. No header -> unchanged behaviour. Wired into the three routes (inventory: whole POST, so a resent stock count is also kept once). Web: `useSubmissionKey()` (src/lib/submission-key.ts) in the payment dialog, shells entry and production batch form: same body -> same key, changed body -> new key, dropped after a confirmed write. Mobile: `SubmissionKey` + `idempotencyOptions` (mobile/lib/core/network/idempotency.dart); the payment sheet, shells dialog and batch sheet keep one key per submission until they close and pass it via the cubits to the Dio repositories. Header documented in src/lib/contracts (`IDEMPOTENCY_HEADER`, `idempotent: true`, 422 listed) and api/openapi regenerated.
- verification: e2e idempotent-writes 16/16 green (was 10 failed / 6 passed); e2e idempotent-writes + shell-deposits + inventory + low-stock + order-lifecycle 29 passed; `npm run lint` 0 errors (65 pre-existing warnings, none in touched files); `npm run typecheck` clean; `npm test` 307/307; `npm run build` compiled successfully (inside scripts/e2e-local.sh); `npm run contract:docs -- --check` clean; `npm run contract:verify` 58/58 contracts in 192 calls against a local server on a throwaway Postgres; mobile `flutter analyze` no issues, `flutter test` 662/662. All DB work on throwaway Docker Postgres (ports 55433-55435), never on .env.
- files_changed: prisma/schema.prisma, prisma/migrations/20261015100000_add_idempotency_keys/migration.sql, src/lib/idempotency.ts, src/app/api/customers/[id]/payments/route.ts, src/app/api/deposits/shells/route.ts, src/app/api/inventory/route.ts, src/lib/contracts/{common,index,customers,shell-deposits,inventory}.ts, scripts/generate-api-docs.ts, api/openapi/{README.md,customer.yaml,shell_deposit.yaml,inventory.yaml,components/responses/errors.yaml}, src/lib/submission-key.ts, src/components/debt/payment-dialogs.tsx, src/app/deposits/shells/page.tsx, src/app/inventory/page.tsx, tests/lib/idempotency.test.ts, tests/run-tests.ts, tests/api/customer-payments.test.ts, tests/lib/inventory.test.ts, mobile/lib/core/network/{idempotency,network}.dart, mobile/lib/features/{debt,shells,inventory}/** (repositories, cubits, sheets), mobile/test/** (new header/key tests, mocks accept the key)

## Follow-ups

- **Production migration not applied.** `20261015100000_add_idempotency_keys` must be applied with `npm run db:deploy` against production as a separate, explicit step (the PR must call it out). Until then every request that carries the header (all updated web and mobile clients) gets a 500 on production because the table does not exist; requests without the header are unaffected. Apply the migration before or together with the code deploy. Rollback: revert the PR; the table can stay (unused) or be dropped by hand.
- **Order creation** (POST /api/orders) is not covered: it is only mitigated in the UI. Wiring it in is a separate change (hot path, pricing/stock logic, different response) with its own tests.
- **Key retention:** nothing prunes `idempotency_keys`. Keys only need to live for minutes; add a periodic `DELETE FROM idempotency_keys WHERE created_at < now() - interval '30 days'` (index on created_at exists). No scheduler built here.
- Prisma logs the expected unique-constraint failure of a concurrent duplicate as `prisma:error`; harmless, could be silenced later if it bothers log monitoring.
