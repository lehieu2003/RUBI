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

reasoning_checkpoint:
  hypothesis: "Order.total / OrderItem.lineTotal stay at the ordered amount after settlement because the reconcile transaction writes deliveredTotal only to the DEBT ledger row; all readers display the stored columns."
  confirming_evidence:
    - "Code: reconcile updateMany writes status/completedAt only; orderItem.update writes actualQty only."
    - "RED e2e: DEBT 96.000 booked, Order.total 120.000 (8 vs 10 x 12.000)."
  falsification_test: "After writing total/lineTotal in reconcile, any reader (GET /api/orders, debt-export, /orders/[id]) still showing 120.000 would prove a reader recomputes the ordered amount."
  fix_rationale: "Write the value at its single source (the settlement transaction) and backfill old rows; readers need no change."
  blind_spots: "Production data shape not inspected (forbidden): unknown how many COMPLETED orders have partial actual_qty."

- status: resolved — fix implemented, RED -> GREEN observed, gates green.

## Decisions

- **lineTotal:** yes, becomes `actualQty × unitPrice` for each settled line, in the same transaction. Readers checked: order list API, driver orders API, order page, order drawer, print slip, dashboard recent orders, mobile order/driver mappers — all just display it. The mobile orders tab already prints "× qty (thực giao N)" next to lineTotal, so it becomes consistent with no mobile change.
- **Order.total:** set to `deliveredTotal`, the exact number booked as DEBT, via `tx.order.update` after the actualQty writes. #96's conditional `updateMany` (status DELIVERED -> COMPLETED, first in the transaction) and #102's idempotency are untouched.
- **Ordered amount visibility:** no new column. `OrderItem.quantity` (ordered) is kept; ordered amount = `quantity × unitPrice` if ever needed. Web order page and drawer now show "thực giao N" under the ordered quantity (same as mobile), so "10 / thực giao 8 / 12.000 / 96.000" reads correctly. The settle modal already shows ordered vs delivered ("8 / 10"). The print slip prints `actualQty ?? quantity` so the slip's qty × price = line total for a reprinted settled order; unsettled slips are unchanged.
- **Partial settlement requests** (API accepts a subset of lines; unreachable from the web UI, which sends every line; mobile has no reconcile): omitted lines keep actualQty null and their ordered lineTotal and contribute 0 to DEBT; total still equals the DEBT amount. Not changed (would alter API semantics); noted here.
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
  checked: who calls reconcile
  found: only the web settle page (mobile has no reconcile call); it submits every line (reconcileItems initialised from all orderItems). The schema allows a partial list; omitted lines keep actualQty null and contribute 0 to DEBT.
  implication: total = deliveredTotal (exactly the DEBT amount) also in the unreachable partial case.
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

## Eliminated

## Resolution

- root_cause: The reconcile transaction (src/app/api/orders/[id]/reconcile/route.ts) computed deliveredTotal = Σ actualQty × unitPrice but wrote it only to the DEBT ledger entry; Order.total and OrderItem.lineTotal kept the ordered amount, and every reader displays those stored columns.
- fix: reconcile now writes lineTotal = unitPrice × actualQty per settled line and Order.total = deliveredTotal inside the same transaction; web order page/drawer show "thực giao N" and the slip prints the delivered quantity once set; idempotent backfill migration for orders settled before.
- verification: |
    RED (recorded above): Expected 96000, Received 120000.
    GREEN: scripts/e2e-local.sh order-total-delivered order-lifecycle order-races audit-log dashboard idempotent-writes print-slip order-drawer -> 43 passed (order-total-delivered 3/3).
    Full e2e suite (scripts/e2e-local.sh, no filter) -> 77 passed, exit 0 (includes next build on the throwaway DB).
    npm run lint -> 0 errors, 65 warnings (same 65 as before the change, all pre-existing).
    npm run typecheck -> clean. npm test -> 311 pass, 0 fail.
    contract:verify not run: no contract/response shape changed. Mobile gates not run: mobile/ unchanged.
- files_changed: [src/app/api/orders/[id]/reconcile/route.ts, src/app/orders/[id]/order-detail-client.tsx, src/app/orders/page.tsx, prisma/migrations/20261016153729_backfill_delivered_order_totals/migration.sql, e2e/order-total-delivered.spec.ts]
