---
status: resolved
trigger: "#6 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: settlement leaves Order.total at the ordered amount, so order lists, exports and the dashboard disagree with the DEBT booked for the delivered amount. Owner's decision (2026-10-16): after settlement the order's total is the delivered amount (actualQty × unitPrice); unsettled orders keep the ordered amount."
created: 2026-10-16
updated: 2026-10-16
branch: fix/order-total-delivered
---

# Debug Session: Order Total Delivered

## Business rule (confirmed by the owner, 2026-10-16)

After settlement (đối soát), "tổng tiền" of an order = **delivered quantity × unit price**, matching the DEBT ledger entry. Orders not yet settled keep the ordered amount.

## Symptoms

Source: audit-reviewer-verified #6 (raw: `.planning/audits/2026-10-15-raw/03-api-flow-auditor.md` API-3, API-2 delivered part).

- **Expected:** order 10 × 20.000 settled with 8 delivered → DEBT 160.000 and `order.total` 160.000 everywhere it is shown (web order list/detail/print where relevant, CSV/Excel exports, dashboard revenue, mobile order lists).
- **Actual (from code reading):** `src/app/api/orders/[id]/reconcile/route.ts` (after #96 the order write is a conditional `updateMany` first in the transaction) sets status/completedAt only; the delivered total is computed (~`deliveredTotal`) but only written to the DEBT ledger entry. `OrderItem.lineTotal` likewise keeps the ordered amount. Read paths: `src/app/api/orders/route.ts`, `src/app/settle/page.tsx`, `src/app/api/customers/debt-export/route.ts`, `src/app/dashboard/page.tsx` (revenue via `src/lib/revenue.ts` since #105), mobile order DTOs.

## Constraints

- Server: write `total` (and decide whether `OrderItem.lineTotal` should also become `actualQty × unitPrice` — prefer yes for consistency; check every reader of `lineTotal`, e.g. print slip / exports, and record the decision) inside the reconcile transaction. Keep #96's conditional write and #102's idempotency untouched.
- Decide whether the ordered amount must stay visible anywhere (e.g. settle page showing ordered vs delivered); if the UI needs it, derive it from items (`quantity × unitPrice`) rather than a new column. Record the decision.
- **Existing data:** COMPLETED orders settled before this change keep the ordered total. Backfill them with a Prisma migration containing an idempotent SQL `UPDATE` (orders/order_items whose items all have `actual_qty` set) — create it with `prisma migrate dev --create-only` against a throwaway DB and review the SQL. If a backfill is risky (e.g. some COMPLETED orders lack `actual_qty`), handle those rows explicitly and record it. Applying it on production is NOT part of this task; the PR must call it out.
- DATABASE SAFETY: Prisma CLI loads `.env` = PRODUCTION Supabase. Every prisma migrate/seed command and every DB-backed test must override BOTH `DATABASE_URL` and `DIRECT_URL` to a throwaway local Docker Postgres; print the host before running, abort if not localhost. Never `prisma db push`.
- Tests: e2e on throwaway Postgres (`scripts/e2e-local.sh`; e.g. extend `e2e/order-lifecycle.spec.ts` or a new spec): settle 8 of 10 → `order.total` = DEBT amount = 160.000; list/export shows it; unsettled orders unchanged. A test (or a SQL check in the e2e) for the backfill migration on seeded COMPLETED data.
- Gates: web (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, e2e `order-lifecycle`, `order-races`, `audit-log`, `dashboard`, `idempotent-writes`, `npm run contract:verify` on a LOCAL server if contracts change); mobile (`flutter analyze`, `flutter test`) only if `mobile/` changes.
- Conventional Commits, one logical change each.

## Current Focus

reasoning_checkpoint (follow-up):
  hypothesis: "Reconcile accepts a list that leaves out (or repeats) a line; the omitted line keeps the ordered lineTotal and actualQty null while Order.total = DEBT of the listed lines only."
  confirming_evidence:
    - "RED e2e: one-line list on a 2-line DELIVERED order answered 200 (expected 400)."
    - "Code: only ownership of each sent id was checked, not completeness or uniqueness."
  falsification_test: "After requiring every line exactly once, a full list must still settle (200) with Σ lineTotal = total = DEBT, and every existing caller (web, mobile, e2e helpers) must keep passing."
  fix_rationale: "Reject the incomplete request before anything is written instead of guessing a delivered quantity for the missing line."
  blind_spots: "A third-party/script client sending partial lists would now get 400 — none is known (web and mobile send every line)."

- status: resolved — follow-up fix implemented, RED -> GREEN observed, gates green.

## Decisions

- **lineTotal:** yes, becomes `actualQty × unitPrice` for each settled line, in the same transaction. Readers checked: order list API, driver orders API, order page, order drawer, print slip, dashboard recent orders, mobile order/driver mappers — all just display it. The mobile orders tab already prints "× qty (thực giao N)" next to lineTotal, so it becomes consistent with no mobile change.
- **Order.total:** set to `deliveredTotal`, the exact number booked as DEBT, via `tx.order.update` after the actualQty writes. #96's conditional `updateMany` (status DELIVERED -> COMPLETED, first in the transaction) and #102's idempotency are untouched.
- **Ordered amount visibility:** no new column. `OrderItem.quantity` (ordered) is kept; ordered amount = `quantity × unitPrice` if ever needed. Web order page and drawer now show "thực giao N" under the ordered quantity (same as mobile), so "10 / thực giao 8 / 12.000 / 96.000" reads correctly. The settle modal already shows ordered vs delivered ("8 / 10"). The print slip prints `actualQty ?? quantity` so the slip's qty × price = line total for a reprinted settled order; unsettled slips are unchanged.
- **Partial settlement requests** (REVISED in follow-up; the first version wrongly said mobile has no reconcile call): both clients — web settle page and the mobile settlement screen for Quản lý (`OrdersRepositoryImpl.settle`) — always send every line, and order lines cannot change after creation, so no client sends a partial list. The API still accepted one (and a duplicated line), which would leave an omitted line at actualQty null + ordered lineTotal while Order.total = DEBT, so Σ lineTotal != total and the backfill would skip that order forever. Fix: the server now answers 400 unless every line of the order is given exactly once, checked next to the existing "line belongs to the order" check, before #96's conditional `updateMany` — so nothing is booked; #96 and #102 untouched (#102's idempotency layer does not wrap reconcile). Rejected alternatives: treat omitted lines as 0 (silently books less debt) or as the ordered quantity (a guess); both write a delivered quantity nobody entered. No mobile change: it already sends every line (covered by its repository test). Contract note for `reconcileOrder` updated and `api/openapi/order.yaml` regenerated.
- **Backfill** (`prisma/migrations/20261016153729_backfill_delivered_order_totals`, created with `migrate dev --create-only` on a throwaway localhost:55434 DB, then hand-written SQL): only COMPLETED orders whose every line has `actual_qty`; skips rows already right (idempotent; verified by running it twice in the e2e). COMPLETED orders with any line lacking `actual_qty` are left untouched (no delivered quantity to derive from) — check prod with `SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.status='COMPLETED' AND i.actual_qty IS NULL` before deploying. `updated_at` is not bumped (Prisma sets it client-side; SQL backfill leaves it). Not applied on production — the PR must call it out (`npm run db:deploy`).

## Evidence

- timestamp: 2026-10-16
  checked: src/app/api/orders/[id]/reconcile/route.ts
  found: step 1 updateMany writes only status/completedAt; step 2 writes only actualQty; deliveredTotal (step 3) goes only to the DEBT ledger row and the audit summary.
  implication: confirmed by reading — Order.total and OrderItem.lineTotal keep the ordered amount after settlement.
- timestamp: 2026-10-16
  checked: readers of total / lineTotal (grep): api/orders, api/driver/orders, api/orders/[id]/status, api/customers/debt-export, settle page, orders page + drawer, orders/[id] detail, dashboard (revenueOf), print-slip, mobile order/driver mappers
  found: all read the stored columns; none recomputes from actualQty. Only writers: saveOrder (src/lib/actions/orders.ts, creation), seed, e2e helper.
  implication: fixing the write in reconcile + backfilling old rows fixes every reader; no reader change is required for totals.
- timestamp: 2026-10-16
  checked: mobile orders_tab.dart
  found: already shows "× {quantity} (thực giao {actualQty})" next to lineTotal — becomes consistent once lineTotal is the delivered amount. Web detail/drawer show only `quantity` next to lineTotal.
  implication: web detail + drawer need the same "(thực giao N)" hint so the line reads correctly; mobile needs no change.
- timestamp: 2026-10-16
  checked: who calls reconcile (CORRECTED in follow-up — the first version said "mobile has no reconcile call", which was wrong)
  found: two clients. (1) Web settle page: submits every line (reconcileItems initialised from all orderItems). (2) Mobile settlement screen for Quản lý (mobile/lib/features/orders/presentation/screens/settlement_screen.dart -> OrdersCubit.settle -> OrdersRepositoryImpl.settle, mobile/lib/features/orders/data/orders_repository_impl.dart:143-160): PATCH /api/orders/{id}/reconcile with `items` built from `for (final line in order.lines)`, actualQty = edited value ?? line.quantity — i.e. every line, never only the edited ones. Covered by mobile/test/features/orders/data/orders_repository_impl_test.dart "gửi đủ mọi dòng, dòng không sửa lấy số đặt" (sends l-1 unchanged + l-2 edited). The server schema still accepts a partial (or duplicated) list.
  implication: no client sends a partial list, but the API accepts one; see follow-up evidence below for whether `order.lines` can be stale/incomplete.
- timestamp: 2026-10-16
  checked: TDD RED — `E2E_BROWSER_CHANNEL=chrome bash scripts/e2e-local.sh order-total-delivered` (throwaway Docker Postgres localhost:55433; first attempt hit the webpack "reading 'hash'" crash, .next removed and rerun)
  found: |
    ✘ 1 › settle 8 of 10: total, line total and debt are all 8 × the price
      Error: expect(received).toBe(expected)
      Expected: 96000
      Received: 120000
      > 40 | expect(Number(order.total)).toBe(Number(debt.amount));
    - 2, - 3 not run (describe.serial). Test 3 would fail on the missing *_backfill_delivered_order_totals migration.
  implication: root cause confirmed by observation: DEBT = 8 × 12.000 = 96.000 is booked, Order.total stays 120.000 (10 × 12.000).
- timestamp: 2026-10-16 (follow-up)
  checked: can mobile's `order.lines` be incomplete? Writers of order_items (grep orderItem.create/update/delete in src) and the list API
  found: order items are only created with the order (saveOrder nested create) and only updated by reconcile; no endpoint adds/removes lines later. GET /api/orders includes every orderItem; OfficeOrderMapper fails the whole order on a malformed line instead of dropping it.
  implication: mobile (like web) always sends every line, so neither client can produce a partial settlement. A partial or duplicated list is reachable only by a hand-made API request.
- timestamp: 2026-10-16 (follow-up)
  checked: mobile readers of total / lineTotal after settlement
  found: OfficeOrderMapper and driver OrderMapper take `total` / `lineTotal` straight from the server; no client-side recomputation of a stored order's total. The only quantity × price sum is the settle sheet's "Ghi nợ" preview (settlement_screen.dart:146, Σ actual × unitPrice over every line) — the same formula the server books, shown before submitting. After settle the cubit reloads from the server. orders_tab shows "× quantity (thực giao N)" + lineTotal + order.total, consistent with the new values. Driver feed (/api/driver/orders) has no COMPLETED orders, so drivers never see a settled total.
  implication: no mobile change needed.
- timestamp: 2026-10-16 (follow-up)
  checked: TDD RED — new e2e "a settlement must give every line exactly once, or nothing is booked" (2-line DELIVERED order), `E2E_BROWSER_CHANNEL=chrome bash scripts/e2e-local.sh order-total-delivered` (throwaway Docker Postgres localhost:55433)
  found: |
    ✘ 4 › a settlement must give every line exactly once, or nothing is booked
      Expected: 400
      Received: 200
      > 121 | expect((await settle([{ id: first, actualQty: 8 }])).status()).toBe(400);
    tests 1-3 passed.
  implication: the server settles a partial list: order COMPLETED, the omitted line keeps actualQty null and the ordered lineTotal, Order.total = DEBT = only the listed line, so Σ lineTotal != total and the backfill skips it forever.

## Eliminated

## Resolution

- root_cause: The reconcile transaction (src/app/api/orders/[id]/reconcile/route.ts) computed deliveredTotal = Σ actualQty × unitPrice but wrote it only to the DEBT ledger entry; Order.total and OrderItem.lineTotal kept the ordered amount, and every reader displays those stored columns.
- fix: reconcile now writes lineTotal = unitPrice × actualQty per settled line and Order.total = deliveredTotal inside the same transaction; web order page/drawer show "thực giao N" and the slip prints the delivered quantity once set; idempotent backfill migration for orders settled before. Follow-up: reconcile answers 400 unless every line of the order is given exactly once (before any write).
- verification: |
    RED (recorded above): Expected 96000, Received 120000.
    GREEN: scripts/e2e-local.sh order-total-delivered order-lifecycle order-races audit-log dashboard idempotent-writes print-slip order-drawer -> 43 passed (order-total-delivered 3/3).
    Full e2e suite (scripts/e2e-local.sh, no filter) -> 77 passed, exit 0 (includes next build on the throwaway DB).
    npm run lint -> 0 errors, 65 warnings (same 65 as before the change, all pre-existing).
    npm run typecheck -> clean. npm test -> 311 pass, 0 fail.
    contract:verify not run: no contract/response shape changed. Mobile gates not run: mobile/ unchanged.
    Follow-up (every line exactly once):
    RED (recorded above): Expected 400, Received 200.
    GREEN: scripts/e2e-local.sh order-total-delivered order-lifecycle order-races audit-log dashboard idempotent-writes stock-count print-slip order-drawer -> 49 passed (order-total-delivered 4/4).
    Full e2e suite (scripts/e2e-local.sh, no filter, includes next build) -> 78 passed, exit 0.
    npm run lint -> 0 errors, 65 warnings (pre-existing). npm run typecheck -> clean. npm test -> 311 pass, 0 fail.
    contract:verify not run: only the `notes` text of reconcileOrder changed (body/response schemas unchanged). Mobile gates not run: mobile/ unchanged.
- files_changed: [src/app/api/orders/[id]/reconcile/route.ts, src/lib/contracts/orders.ts, api/openapi/order.yaml, src/app/orders/[id]/order-detail-client.tsx, src/app/orders/page.tsx, prisma/migrations/20261016153729_backfill_delivered_order_totals/migration.sql, e2e/order-total-delivered.spec.ts]
