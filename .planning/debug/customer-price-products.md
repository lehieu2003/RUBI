---
status: resolved
trigger: "#10 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: the customer price-override page only lists products named exactly 'Đá Bi' or 'Đá Viên', so no override can be set for any other product (e.g. 'Đá Mi', 'Đá Cây' or anything the manager adds). Also fix UI-6 in the same component: a failed override save reverts the screen to the page-load snapshot, wiping earlier successful edits. Fix with regression tests."
created: 2026-10-16
updated: 2026-10-16
branch: fix/customer-price-products
---

# Debug Session: Customer Price Products

## Symptoms

Source: audit-reviewer-verified #10 (UI-5) and the related Low UI-6 in the same component (raw: `.planning/audits/2026-10-15-raw/01-ui-logic-auditor.md`).

- **Expected:**
  - The customer's own-price page shows a row for every product on sale, grouped the same way the order grid groups them, so an override can be set for any product.
  - If saving one override fails, only that edit reverts; other overrides saved earlier in the session stay shown.
- **Actual (from code reading):**
  - `src/components/pricing/customer-price-form.tsx:117-125` — `products.filter((p) => p.name === 'Đá Bi')` / `'Đá Viên'`; every other product is never rendered. The order grid builds its groups from the catalogue (`src/components/order/order-matrix.tsx:17-31`, `buildGrid`). The seed includes e.g. "Đá Mi 20kg" and "Đá Cây 50kg" (seen on the mobile Kho lạnh tab 2026-10-15).
  - `customer-price-form.tsx:35` `useState<PriceMap>(overridePrices)`; on save failure `:75` `setLocalOverrides(overridePrices)` restores the page-load props instead of the state just before this edit. The remove path (`:86`) already snapshots correctly.
- **Impact:** customers who negotiated a price on other products are billed the global price; after a failed save the manager sees wrong prices and may re-enter or remove overrides.

## Constraints

- Web only (`src/components/pricing/*`, and `src/app/customers/[id]` / `src/app/config/prices` only if needed). Reuse the grouping logic of `buildGrid` rather than inventing another (extract a shared helper only if it is a small, safe move).
- Tests: Playwright on throwaway local Postgres via `scripts/e2e-local.sh` (guard `e2e/support/env.ts`; `E2E_BROWSER_CHANNEL=chrome` if needed); e.g. a product other than Đá Bi/Đá Viên has a row and its override saves and is used in the order drawer price; a route-aborted save of B keeps A shown as "(riêng)". Never the Supabase DB in `.env`.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, the new/related e2e (`products`, `order-drawer`).
- Conventional Commits, one logical change each.

## Current Focus

- hypothesis: (1) CustomerPriceForm renders only products whose name is exactly 'Đá Bi' or 'Đá Viên' (hard-coded filter at :117-118), so Đá Cây / Đá Mi / manager-added products get no row; (2) handleSaveOverride's catch restores the `overridePrices` prop (page-load snapshot) instead of the state before this edit, dropping earlier successful saves from the screen.
- test: new e2e/customer-prices.spec.ts — (a) every active product has a row and a Đá Mi 20kg override saves and prices the order drawer; (b) save Đá Cây OK, then abort the POST for Đá Viên 5kg, Đá Cây must still show "(riêng)".
- expecting: both fail on current code (RED), pass after fix.
- next_action: none, resolved
- tdd_checkpoint: {test_file: e2e/customer-prices.spec.ts, status: green, failure_output: see Evidence}
- reasoning_checkpoint:
    hypothesis: "Overrides cannot be set for non Bi/Viên products because the form hard-filters by those two names; earlier saves vanish because the save catch restores the page-load prop."
    confirming_evidence:
      - "RED: no row for Đá Cây 50kg while Đá Bi rows exist"
      - "RED: after an aborted save, a previously saved 39.000 shows 40.000 (cơ bản)"
    falsification_test: "If after grouping from the catalogue the Đá Cây row still does not appear, or after a per-edit snapshot the earlier save still disappears, the hypothesis is wrong."
    fix_rationale: "Building groups from the products prop (same grouping as the order grid) removes the name whitelist; snapshotting localOverrides before the optimistic update reverts only this edit."
    blind_spots: "Concurrent saves of two rows at once could still race the snapshot (same as the existing remove path); not in scope." 

## Evidence

- timestamp: 2026-10-16
  checked: src/components/pricing/customer-price-form.tsx
  found: `products.filter((p) => p.name === 'Đá Bi')` and `'Đá Viên'` are the only two groups rendered; catch in handleSaveOverride does `setLocalOverrides(overridePrices)` (props), whereas handleRemoveOverride snapshots `previousOverrides`.
  implication: both audit claims are confirmed by reading; the only caller is src/app/customers/[id]/page.tsx, which already passes every active product.

- timestamp: 2026-10-16
  checked: src/db/seed.ts products and overrides
  found: seed has Đá Cây 50kg and Đá Mi 20kg; customer KH-004 "Vựa Hải Sản Năm Căn" has a seeded override on prod-cay-50 (32.000) that the price page never shows today.
  implication: the bug hides real, existing data, not only new products.

- timestamp: 2026-10-16
  checked: src/components/order/order-matrix.tsx buildGrid
  found: groups active products by name in catalogue order (page query orders by name, sizeKg); a small `groupProductsByName` helper can be extracted and used by both without changing the grid's output.
  implication: safe shared helper is possible.

- timestamp: 2026-10-16
  checked: RED run, `E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- customer-prices` (local Docker Postgres)
  found: |
    ✘ customer-prices.spec.ts:30 lists every product on sale and saves an own price for any of them
      Error: expect(locator).toHaveCount(expected) failed
      Locator:  locator('tbody tr').filter({ hasText: /^\s*Đá Cây\s*50kg/ })
      Expected: 1
      Received: 0
    (Đá Bi rows matched, so the locator is right; Đá Cây has no row.)
  implication: hypothesis (1) confirmed by observation.

- timestamp: 2026-10-16
  checked: RED run, `npm run e2e:local -- customer-prices -g "failed save"`
  found: |
    ✘ customer-prices.spec.ts:48 a failed save reverts only that edit, not the ones saved before it
      Error: expect(locator).toContainText(expected) failed
      Locator: locator('tbody tr').filter({ hasText: /^\s*Đá Bi\s*20kg/ })
      Expected substring: "39.000"
      Received string:    "Đá Bi20kg40.00040.000(cơ bản)Đặt giá riêng"
    (Đá Bi 20kg had saved 39.000 successfully; the aborted Đá Viên save wiped it back to the page-load state.)
  implication: hypothesis (2) confirmed by observation.

- timestamp: 2026-10-16
  checked: tests/api/products.test.ts (source-pattern unit tests)
  found: they pinned the exact grouping lines inside order-matrix.tsx, so extracting the helper failed `npm test` until the patterns were pointed at src/lib/product-groups.ts; added two pattern tests for the price form.
  implication: the grid's rows and columns are unchanged (order-drawer and products e2e specs pass).

- timestamp: 2026-10-16
  checked: GREEN run, `E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- customer-prices products order-drawer`
  found: 14 passed (customer-prices 3/3, order-drawer 5/5, products 6/6).
  implication: fix verified against both symptoms plus the drawer price using the new override.

## Eliminated

## Resolution

- root_cause: CustomerPriceForm rendered only two hard-coded groups, `products.filter((p) => p.name === 'Đá Bi')` and `'Đá Viên'`, so every other product (Đá Cây, Đá Mi, anything the manager adds, including the seeded Đá Cây override of Năm Căn) had no row. Separately, handleSaveOverride's catch did `setLocalOverrides(overridePrices)`, restoring the page-load prop and wiping overrides saved earlier in the same visit.
- fix: Extracted the by-name grouping of the order grid into `groupProductsByName` (src/lib/product-groups.ts), used by both buildGrid and CustomerPriceForm (one table per product name). The save path now snapshots `localOverrides` before the optimistic update and reverts to that snapshot on failure, as the remove path already did.
- verification: RED then GREEN on local Docker Postgres: e2e/customer-prices.spec.ts 3/3, plus e2e/products.spec.ts 6/6 and e2e/order-drawer.spec.ts 5/5 (14 passed). npm run lint exit 0 (0 errors, 65 pre-existing warnings, none in changed files); npm run typecheck exit 0; npm test 309/309 pass; npm run build exit 0.
- files_changed: [src/lib/product-groups.ts, src/components/order/order-matrix.tsx, src/components/pricing/customer-price-form.tsx, tests/api/products.test.ts, e2e/customer-prices.spec.ts]
