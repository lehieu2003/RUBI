---
status: awaiting_human_verify
trigger: "H1 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: a stock count taken while trucks are out logs goods on trucks as a loss, then settlement deducts them again. Owner's rule (2026-10-15): the count reflects only the quantity physically inside the cold store at the time of counting."
created: 2026-10-15
updated: 2026-10-15
branch: fix/stock-count-open-deliveries
---

# Debug Session: Stock Count Open Deliveries

## Business rule (confirmed by the owner, 2026-10-15)

"Số đếm trong kho lạnh khi kiểm kho giữa ngày chỉ phản ánh đúng số lượng thực tế hiện hữu nằm bên trong kho lạnh tại thời điểm kiểm tra."
— The counted number is only what is physically inside the cold store when counting.

Existing design (unchanged): stock leaves the books only at settlement (`src/lib/actions/orders.ts:76-78`, `src/lib/inventory.ts:55-58`, deduction at `src/app/api/orders/[id]/reconcile/route.ts:91`). So the book balance still contains bags of orders that have physically left the store but are not settled yet: status **SHIPPING** (on a truck) and **DELIVERED** (at the customer, awaiting settlement). **PENDING** orders are still physically in the store. COMPLETED (already deducted) and CANCELLED do not count.

Therefore, for a count of product P:
- `outForDelivery(P)` = sum of quantities of P on orders in SHIPPING or DELIVERED (same factory).
- **Expected in store** = book − outForDelivery. The StockCount's comparison / loss must be against this, i.e. loss = expected in store − counted.
- **New book balance** = counted + outForDelivery, so that the later settlement deduction lands on the right number.

## Symptoms

Source: audit-reviewer-verified H1 (raw: `.planning/audits/2026-10-15-raw/03-api-flow-auditor.md` API-1; reviewer corrected the fix to exclude PENDING).

- **Expected:** Book 100; an order of 20 goes SHIPPING; the manager counts 80 in the cold store → StockCount shows no loss (expected in store 80, counted 80), book stays 100. Settling the 20 → book 80.
- **Actual (from code reading):** `src/app/api/inventory/route.ts:98-109` — `const bookQuantity = (await stockOnHand(tx, [productId]))...; const counted = await changeStock(tx, productId, { set: quantity });` → StockCount book=100, counted=80 (20 logged as loss), balance set to 80; settlement then deducts 20 → 60.
- Related helpers: `stockOnHand`, `changeStock`, `reservedByOpenOrders` in `src/lib/inventory.ts` (`reservedByOpenOrders` includes PENDING — do NOT reuse it as-is for this rule).
- UI copy: web count dialog says "Nhập số đếm thực tế trong kho lạnh. Số này thay cho số trên sổ" (`src/app/inventory/page.tsx:537`); the mobile "Kiểm kho" sheet uses the same API (`mobile/lib/features/inventory/...`).

## Constraints

- Server fix in the inventory SET (count) path; keep ADD (production) unchanged. No schema change expected (if `StockCount` needs a new column, Prisma Migrate only and call it out).
- Decide what `StockCount.bookQuantity` stores so the count history ("hao hụt") shows the in-store comparison; check every reader of StockCount (count history/summary endpoints, web inventory page, mobile inventory) so the loss shown everywhere follows the new meaning. Record the decision.
- Update copy only where it would now mislead (e.g. "thay cho số trên sổ"); keep Vietnamese tone. Update `src/lib/contracts/*` notes and regenerate OpenAPI (`npm run contract:docs`) if the response or meaning changes; run `npm run contract:verify` against a LOCAL server only.
- Regression test: DB-backed, on a throwaway local Postgres only (Playwright e2e in `e2e/` with the guard in `e2e/support/env.ts`, as `e2e/order-races.spec.ts` does). Never the Supabase DB in `.env`.
- Gates: web (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, relevant e2e); if `mobile/` changes, also `flutter analyze` and `flutter test`.
- Conventional Commits, one logical change each.

## Current Focus

- hypothesis: count SET replaces the book balance with a physical count that excludes bags of unsettled SHIPPING/DELIVERED orders (CONFIRMED)
- reasoning_checkpoint:
  - hypothesis: POST /api/inventory (SET) stores bookQuantity = full book and sets the balance to the counted number; the book still holds bags of SHIPPING/DELIVERED orders that are physically out, so they are logged as loss and later deducted again at settlement.
  - confirming_evidence: route.ts:98-109 code; e2e RED: book 100, SHIPPING 20 + PENDING 5, count 80 -> StockCount.bookQuantity 100 (expected 80).
  - falsification_test: after the fix, the same scenario gives bookQuantity 80, difference 0, balance 100, and 80 after settlement; a count with nothing out behaves as before.
  - fix_rationale: subtract outForDelivery (SHIPPING+DELIVERED of this factory) from the book for the comparison and add it back to the counted number for the new balance, so settlement deducts from the right number.
  - blind_spots: a count racing a status change in the same instant (status read in the same transaction; acceptable, same as existing reads).
- tdd_checkpoint:
  - test_file: e2e/stock-count.spec.ts
  - test_name: "bags of a SHIPPING order are not a loss and are deducted once at settlement"
  - status: green (RED auto-confirmed by manager; GREEN after fix, 12/12 with inventory + low-stock)
  - failure_output: |
      Error: expect(received).toEqual(expected)
      - Expected: [80, 80]   + Received: [100, 80]
      > 52 | expect([stockCount.bookQuantity, stockCount.countedQuantity]).toEqual([80, 80]);
      1 failed, 3 did not run (serial)
- next_action: owner verifies a mid-day count with a truck out on a real (non-production-test) flow; then open PR into dev

## Evidence

- timestamp: 2026-10-15
  checked: src/app/api/inventory/route.ts POST (SET path)
  found: bookQuantity = stockOnHand (full book incl. unsettled SHIPPING/DELIVERED bags); changeStock set = counted.
  implication: bags out for delivery are logged as loss and the balance drops by them; settlement deducts them again.
- timestamp: 2026-10-15
  checked: readers of StockCount
  found: /api/inventory/counts (difference = counted - book), /api/inventory/counts/summary (loss/surplus from same), web inventory page history table ("Trên sổ") and count dialog (client-side difference vs quantityOnHand, "thay cho số trên sổ"); mobile only POSTs the count and shows "Tồn mới" from the returned row (no loss shown).
  implication: storing the expected-in-store number in bookQuantity makes history and summary right without changes; the web dialog must compare against expected-in-store too, so GET /api/inventory needs the out-for-delivery quantity.
- timestamp: 2026-10-15
  checked: e2e RED run on local Docker Postgres (npm run e2e:local -- stock-count, Chrome channel)
  found: StockCount.bookQuantity 100 instead of 80 for book 100 / SHIPPING 20 / PENDING 5 / count 80.
  implication: bug reproduced.

## Eliminated

## Resolution

- root_cause: POST /api/inventory (SET) stored the full book as StockCount.bookQuantity and replaced the balance with the counted number. Stock leaves the books only at settlement, so bags of SHIPPING/DELIVERED orders (out of the store, still on the books) were logged as loss and then deducted a second time at settlement.
- decision: StockCount.bookQuantity now stores the expected-in-store number at the time of the count (book − outForDelivery). No schema change. History (`difference`), summary (totalLoss/totalSurplus) and the web history table therefore show the in-store loss without code changes; the table header was renamed "Trên sổ" → "Phải có trong kho". Older rows were taken with the old meaning (identical whenever nothing was out for delivery).
- fix: new `outForDelivery()` in src/lib/inventory.ts (SHIPPING + DELIVERED, same factory; PENDING excluded; shares a groupBy with `reservedByOpenOrders`). SET path: bookQuantity = book − out, balance = counted + out. ADD unchanged. GET /api/inventory returns `outForDelivery` per product; web count dialog shows "Đang giao, chưa đối soát" and "Phải có trong kho" and computes the difference against that; dialog copy no longer says "thay cho số trên sổ". Mobile toast after a count says "Tồn trên sổ (gồm hàng đang giao)". Contracts notes updated, OpenAPI regenerated, getInventory fixture gained `outForDelivery`. Schema comment on StockCount updated (comment only, no migration).
- verification: e2e/stock-count.spec.ts RED before fix (bookQuantity 100 vs 80), GREEN after (5 tests) together with e2e/inventory.spec.ts and e2e/low-stock.spec.ts: 12 passed, local Docker Postgres only. contract:verify 58/58 against local server. npm run lint 0 errors (65 pre-existing warnings), typecheck OK, npm test 299 pass / 0 fail, npm run build OK, flutter analyze no issues, flutter test all passed.
- files_changed: [src/lib/inventory.ts, src/app/api/inventory/route.ts, src/app/inventory/page.tsx, src/lib/contracts/inventory.ts, api/openapi/inventory.yaml, api/openapi/fixtures/responses/success/getInventory.json, prisma/schema.prisma (comment), tests/lib/inventory.test.ts, e2e/stock-count.spec.ts, mobile/lib/core/localization/strings.dart, mobile/lib/features/inventory/presentation/cubit/inventory_cubit.dart]
