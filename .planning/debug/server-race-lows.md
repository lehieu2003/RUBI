---
status: resolved
trigger: "Five server race findings from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md and .planning/audits/2026-10-15-raw/02-race-condition-auditor.md: #17/RACE-8 changeStock daily-row create race, RACE-5 bulk-assign to a driver being deactivated, RACE-6 shift sign-up limit exceeded, RACE-7 payroll month lock check-then-act, RACE-H1 payment serialization failure surfaces as 500."
created: 2026-10-17
updated: 2026-10-17T00:00:00+07:00
branch: fix/server-race-lows
---

# Debug Session: Server Race Lows

## Symptoms

Source: `.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md`; raw report `.planning/audits/2026-10-15-raw/02-race-condition-auditor.md`. Line numbers have moved (PRs #96, #100, #102, #109 touched reconcile/inventory/payments); re-locate by reading the code.

1. **#17 / RACE-8 — daily stock row create race.**
   - Actual: `changeStock` in `src/lib/inventory.ts` reads the latest daily row, then creates today's row. Two writers on a product with no row for today both try to create it; the second hits the unique (productId, date) and its whole transaction rolls back (e.g. "Đối soát thất bại").
   - Expected: upsert on `productId_date` (or catch P2002 and retry the update path) so both writers succeed and the balance equals the sum of both changes.
2. **RACE-5 — bulk assign to a driver being deactivated.**
   - Actual: `src/app/api/orders/bulk-assign/route.ts` checks the driver is active outside the transaction; a concurrent deactivation (`src/app/api/staff/[id]/route.ts` unassigns open orders) can be overtaken, leaving open orders on an inactive driver.
   - Expected: assignment conditional on the driver being active inside the transaction (relation filter or re-check under a lock); answer 404/409 if not.
3. **RACE-6 — shift sign-up limit exceeded.**
   - Actual: `src/app/api/schedule/my/route.ts` counts sign-ups for a shift then upserts in separate statements; concurrent sign-ups exceed the per-shift limit.
   - Expected: count + insert atomically (Serializable transaction with retry, or a Postgres advisory lock keyed on factory+date+shift).
4. **RACE-7 — payroll month lock is check-then-act.**
   - Actual: `src/lib/payroll-lock.ts` `rejectIfMonthLocked`; writes in schedule/my, schedule/assignments, schedule/review; lock in `src/app/api/reports/shifts/lock/route.ts`. A shift can be written into a month being locked.
   - Expected: shift writes and the lock take the same per-factory+month advisory lock (shared vs exclusive, or one exclusive key) inside their transactions.
5. **RACE-H1 — payment serialization failure is a 500.**
   - Actual: `src/app/api/customers/[id]/payments/route.ts` uses a Serializable transaction; a serialization failure (P2034 / 40001) surfaces as a generic 500 although a retry is safe (idempotent since #102).
   - Expected: retry the transaction a few times on serialization failure before answering; #102's Idempotency-Key handling stays correct across retries.

## Constraints

- TDD: failing DB-backed test first per finding (e2e on throwaway Postgres like `e2e/order-races.spec.ts`, forcing interleavings by holding row locks, or `Promise.all` loops; prefer deterministic interleavings). One test commit + one fix commit per finding.
- DATABASE SAFETY: `.env` is PRODUCTION Supabase. DB-backed tests only via `scripts/e2e-local.sh` (throwaway Docker Postgres, guard `e2e/support/env.ts`). `npm run build` outside it: override BOTH `DATABASE_URL` and `DIRECT_URL` to a local throwaway URL. If build over `.next` crashes ("reading 'hash'"), delete `.next` and retry. No schema change expected; if one is needed, stop with a checkpoint.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, new specs + FULL e2e suite (report counts); `npm run contract:verify` on a LOCAL server if contracts/answers change.
- Do not commit `.codegraph/` or `graph.dot`. Do not push, do not open the PR. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Current Focus

hypothesis: "Confirmed for all five: each was a check outside the lock that protects the write (1-4), or a Serializable cancellation not retried (5)."
next_action: "None: resolved. Orchestrator opens the PR from fix/server-race-lows into dev."

reasoning_checkpoint:
  hypothesis: "Each route reads a condition outside the lock/transaction that protects the write (or, for payments, does not retry a cancelled Serializable tx), so a concurrent committed write invalidates it."
  confirming_evidence:
    - "RED run on 02713c3: 5 failed with the predicted answers; server log P2002 on inventory (product_id,date) and P2034 on payments."
    - "Each spec turned GREEN only after its own fix commit (per-finding GREEN runs below)."
  falsification_test: "A spec staying RED after its targeted fix, or turning GREEN without it."
  fix_rationale: "Check and write atomic under one lock (ON CONFLICT upsert, driver row FOR SHARE, advisory locks), or retry the Serializable tx."
  blind_spots: "Advisory keys use hashtext (int4): a collision only adds serialization. Retry cap is 3: a payment cancelled three times in a row still answers 500."

tdd_checkpoint:
  status: "green (all five)"

## Evidence

- timestamp: 2026-10-17
  checked: "Environment for DB-backed runs"
  found: "Docker (OrbStack) had to be started; Playwright's bundled Chromium is not installed, so runs use E2E_BROWSER_CHANNEL=chrome; every `next build` over an existing .next crashes with \"Cannot read properties of null (reading 'hash')\", so .next is deleted before each scripts/e2e-local.sh run."
  implication: "All runs below: rm -rf .next && E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- <specs> (throwaway Docker Postgres, never .env)."

- timestamp: 2026-10-17
  checked: "RED run of the five new specs on unfixed code (02713c3): stock-row-race, bulk-assign-race, shift-signup-race, payroll-lock-race, payment-serialization-retry"
  found: |
    5 failed (5 tests, 1 worker):
    1) stock-row-race (finding 1): Expected 200, Received 500. Server log: [POST /api/inventory] PrismaClientKnownRequestError code 'P2002' Unique constraint failed on the fields: (`product_id`,`date`).
    2) bulk-assign-race (finding 2): Expected 404, Received 200 (order assigned to the driver locked meanwhile).
    3) shift-signup-race (finding 3): statuses Expected [200, 409], Received [200, 200] (limit 1, two PENDING).
    4) payroll-lock-race (finding 4): close Expected 409, Received 200 (month closed with a PENDING request in it).
    5) payment-serialization-retry (finding 5): Expected 201, Received 500. Server log: [POST /api/customers/[id]/payments] PrismaClientKnownRequestError code 'P2034'.
  implication: "All five races reproduce deterministically: each spec forces the interleaving by holding a row lock / a uncommitted unique key from the test's own transaction and waiting on pg_stat_activity wait_event_type='Lock' (no timing luck, no Promise.all loops)."

- timestamp: 2026-10-17
  checked: "GREEN finding 1: changeStock opens today's row with inventory.upsert on productId_date (update = increment/set); unit fake gains upsert"
  found: "npm test: 328 pass, 0 fail. e2e (stock-row-race inventory idempotent-writes order-lifecycle): 27 passed (17.8s); stock-row-race 'both movements are kept' passed: 200, balance 170, rows [100, 170]."
  implication: "Prisma emits a native INSERT ... ON CONFLICT DO UPDATE here (an emulated upsert would have failed with P2002 again). Test commit ffedbd4."

- timestamp: 2026-10-17
  checked: "GREEN finding 2: bulk-assign checks the driver inside its transaction after SELECT ... FROM drivers FOR SHARE (outer check removed); answers 404 when the driver is gone or locked"
  found: "e2e (bulk-assign-race order-lifecycle audit-log staff): 19 passed (29.9s); bulk-assign-race: 404, order driverId null. npm test 328 pass."
  implication: "Every account lock (PATCH/DELETE /api/staff/[id]) updates the driver row before unassigning, so the FOR SHARE serializes the two. Test commit 214b818."

- timestamp: 2026-10-17
  checked: "GREEN finding 3: POST /api/schedule/my runs find + limit count + upsert in one transaction after pg_advisory_xact_lock(hashtext('shift-signup:<factory>:<date>:<shift>'))"
  found: "e2e (shift-signup-race access): 7 passed (12.7s); shift-signup-race: [200, 409], the 409 is SHIFT_FULL, 1 PENDING. npm test 328 pass."
  implication: "Under the fix the second sign-up waits on the advisory lock (counted as wait_event_type='Lock'), then counts the first one's PENDING row. Test commit 80e21ae."

- timestamp: 2026-10-17
  checked: "GREEN finding 4 (first attempt): payroll-lock.ts gains holdMonths (pg_advisory_xact_lock_shared per factory+month, sorted) and holdMonthToClose (exclusive, same key); close route counts pending + upserts the lock in one tx behind it; schedule/my POST+DELETE, schedule/assignments, schedule/review take holdMonths then rejectIfMonthLocked(tx) inside their tx"
  found: "payroll-lock-race and shift-signup-race both failed with 'apiResponse.json: Response has been disposed' AFTER their status assertions passed (close 409; sign-ups [200, 409]). The specs disposed the second request context before reading a body it received; in green3 the refusal happened to land on the first context."
  implication: "Test bug, not a fix bug: dispose moved to the end of both specs (separate test commit)."

- timestamp: 2026-10-17
  checked: "GREEN finding 4 after the spec correction: payroll-lock-race + shift-signup-race --repeat-each=4"
  found: "8 passed (7.5s): sign-up 200, close 409 PENDING_SHIFTS, no payroll lock row, row PENDING; shift sign-ups [200, 409] SHIFT_FULL each repeat. npm test 328 pass (the source check that every shift route calls rejectIfMonthLocked( still holds)."
  implication: "The close now waits for the in-flight shift write (exclusive vs shared advisory lock) and counts its PENDING request. Test commit 5b5f9b0."

- timestamp: 2026-10-17
  checked: "GREEN finding 5: payments route wraps prisma.$transaction (Serializable) in retryIfCancelled: up to 3 attempts on PrismaClientKnownRequestError P2034, other errors rethrown; still inside idempotency.run"
  found: "e2e (payment-serialization-retry idempotent-writes --repeat-each=2): 34 passed (6.8s); payment-serialization-retry: 201, outstandingDebt 800000, 2 PAYMENT rows, key stored with status 201. npm test first 327/1 fail: tests/lib/idempotency.test.ts source regex pinned `run(() => prisma.$transaction(`; regex now allows the optional `retryIfCancelled(() => ` wrapper -> 328 pass."
  implication: "The cancelled attempt rolled back its key claim with it, so the retry claims the key again; a concurrent same-key resend still ends in P2002 on the key and is answered by replay (idempotent-writes 'same moment same key' passes). Test commit 4edbcab."

- timestamp: 2026-10-17
  checked: "Final gates on 3612f80"
  found: "lint: 0 errors, 65 warnings (pre-existing; eslint on the changed files reports only the pre-existing unused NextResponse in bulk-assign). typecheck: clean. npm test: 328 tests, 328 pass, 0 fail. npm run build with local DATABASE_URL/DIRECT_URL: exit 0, 52/52 static pages. Full e2e (scripts/e2e-local.sh, chrome channel): 95 passed (1.7m), 0 failed."
  implication: "Ready for PR into dev."

## Eliminated

## Resolution

root_cause: |
  1) changeStock (src/lib/inventory.ts) read the newest row and then created today's; two first movements of a day both created it, the second failed on unique (product_id, date) (P2002) and rolled back its whole write.
  2) PATCH /api/orders/bulk-assign checked the driver was active before its transaction; an account lock committing in between (which unassigns the driver's open orders) was overtaken and the orders landed on the locked driver.
  3) POST /api/schedule/my counted the shift's sign-ups and upserted in separate statements, no lock: concurrent sign-ups both saw the last place free.
  4) Shift writes (schedule/my, schedule/assignments, schedule/review) checked payroll_locks then wrote; the close (reports/shifts/lock) counted PENDING then wrote the lock; no shared lock, so a PENDING request could land in a closed month.
  5) POST /api/customers/[id]/payments ran a Serializable tx with no retry; a serialization failure (P2034) surfaced as 500.
fix: |
  1) inventory.upsert on productId_date (native INSERT ... ON CONFLICT DO UPDATE, update = increment/set) for the first movement of the day.
  2) Driver check moved into the transaction after SELECT ... FROM drivers ... FOR SHARE; 404 when gone or locked (same answer as before).
  3) Find + limit count + upsert in one transaction behind pg_advisory_xact_lock(hashtext('shift-signup:<factory>:<date>:<shift>')).
  4) payroll-lock.ts: holdMonths (pg_advisory_xact_lock_shared per factory+month, sorted) and holdMonthToClose (exclusive, same key); rejectIfMonthLocked/lockedMonths take an optional tx client. All shift writes hold the months and re-check inside their tx; the close counts and upserts in one tx under the exclusive lock.
  5) retryIfCancelled: up to 3 attempts on P2034 around the payment's prisma.$transaction, inside idempotency.run (the key claim rolls back with the cancelled attempt).
verification: |
  RED (02713c3, all five specs): 5 failed as predicted. GREEN per finding in its own run (see Evidence).
  Gates on 3612f80: npm run lint 0 errors (65 warnings, all pre-existing; changed files add none); npm run typecheck clean; npm test 328 pass / 0 fail; npm run build (DATABASE_URL and DIRECT_URL set to local throwaway) exit 0, 52 static pages; full e2e via scripts/e2e-local.sh (E2E_BROWSER_CHANNEL=chrome, .next cleared): 95 passed, 0 failed (1.7m).
  contract:verify not run: no API answer or status code changed (bulk-assign 404, SHIFT_FULL, PENDING_SHIFTS, PAYROLL_LOCKED and payment 201/409 all existed before).
files_changed:
  - src/lib/inventory.ts
  - tests/lib/inventory.test.ts
  - src/app/api/orders/bulk-assign/route.ts
  - src/app/api/schedule/my/route.ts
  - src/lib/payroll-lock.ts
  - src/app/api/reports/shifts/lock/route.ts
  - src/app/api/schedule/assignments/route.ts
  - src/app/api/schedule/review/route.ts
  - src/app/api/customers/[id]/payments/route.ts
  - tests/lib/idempotency.test.ts
  - e2e/support/db.ts
  - e2e/stock-row-race.spec.ts
  - e2e/bulk-assign-race.spec.ts
  - e2e/shift-signup-race.spec.ts
  - e2e/payroll-lock-race.spec.ts
  - e2e/payment-serialization-retry.spec.ts
