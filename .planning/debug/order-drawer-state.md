---
status: resolved
trigger: "#8 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: web order entry drawer — quantities typed right after picking a customer are wiped when that customer's prices arrive; and after closing the drawer without saving, the previous customer's quantities (and prices/stock/error) survive, so pressing Enter before the next customer's prices load can create an order for the new customer with the old quantities. Fix with regression tests."
created: 2026-10-15
updated: 2026-10-15
branch: fix/order-drawer-state
---

# Debug Session: Order Drawer State

## Symptoms

Source: audit-reviewer-verified #8 (raw: `.planning/audits/2026-10-15-raw/01-ui-logic-auditor.md` UI-1 + UI-H1, `02-race-condition-auditor.md` RACE-9). Not reproduced at runtime yet. This is the 30-second phone hot path (CLAUDE.md: speed over everything).

- **Expected:**
  - (a) Picking a customer starts with an empty grid; anything typed after that is kept when the prices arrive.
  - (b) Closing the drawer (Esc, X, backdrop) without saving discards quantities, prices, stock and any error; reopening starts clean. The confirm action cannot submit quantities that belong to another customer.
  - (c) If the price load fails, the user sees an error and cannot confirm with stale prices.
  - (d) Picking customer A then quickly B never shows A's prices for B (out-of-order responses). The reviewer marked this part Unconfirmed (it depends on whether server actions are dispatched serially); guard it anyway if it is cheap (latest-request check), and note what you found.
- **Actual (from code reading):**
  - `src/components/order/order-entry-drawer.tsx:43` sets the customer in the store immediately (`setCustomer(selectedCustomer, new Map())`) so the matrix renders and autofocuses (`src/components/order/order-matrix.tsx:48-53`), but `:47-53` awaits `loadCustomerPrices` + `loadSellableStock` and only then runs `setValues(new Map())`, wiping what was typed.
  - `src/stores/order-store.ts:63-65` `closeDrawer` resets only the store; the drawer's local `values` / `prices` / `stock` / `saveError` survive because `OrderEntryDrawer` stays mounted (only the `Drawer` children unmount, `src/components/ui/drawer.tsx:89`). They reset only after a successful save (`order-entry-drawer.tsx:102-103`).
  - The submit at `:72-91` builds `lineItems` from `values`; the confirm button is enabled when the total > 0 (computed with the old prices).
  - `loadCustomerPrices` rejection is unhandled (no try/catch) → stale state stays, no error shown.

## Constraints

- Web only (`src/components/order/*`, `src/stores/order-store.ts`). Keep the hot path fast: do not add blocking spinners in front of typing; clear state synchronously at selection/close instead.
- The server re-prices every order (`src/lib/actions/orders.ts`), so stored prices are right; the bug is about quantities and what the user sees/confirms.
- Tests: Playwright on throwaway local Postgres (`e2e/order-drawer.spec.ts`, guard `e2e/support/env.ts`; run via `scripts/e2e-local.sh`, `E2E_BROWSER_CHANNEL=chrome` if Playwright's Chromium is missing). Delay the price server action with `page.route` to make the window deterministic. Never the Supabase DB in `.env`.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `e2e/order-drawer.spec.ts` + `e2e/order-lifecycle.spec.ts` + `e2e/print-slip.spec.ts`.
- Conventional Commits, one logical change each.

## Current Focus

- hypothesis: drawer resets local state after the price await instead of at selection/close, and never on close
- next_action: human verification on the real order page (type right after picking a customer; Esc then pick another customer)
- reasoning_checkpoint:
    hypothesis: "Local drawer state (values/prices/stock/saveError) is reset only after the price await (wiping typed input) and never on close; the price promise has no catch and no staleness check; confirm does not require this customer's prices."
    confirming_evidence: ["RED (a) typed 3 -> '' after release", "RED (b) old 5 survives Esc + new customer", "RED (c) no error after aborted request"]
    falsification_test: "If after moving the reset to selection/close and catching the rejection the three tests still fail, the hypothesis is wrong."
    fix_rationale: "Reset synchronously when a customer is picked and when the drawer closes, never after the await; track the latest request id so late/stale answers are dropped; mark price status loading/ready/error and only allow confirm when ready."
    blind_spots: "Out-of-order (d) not exercised: Next 15 dispatches server actions through the router action queue serially, so a second pick waits for the first answer; guard added anyway."
- tdd_checkpoint: {test_file: e2e/order-drawer.spec.ts, status: green}

## Evidence

- timestamp: 2026-10-15
  checked: src/components/order/order-entry-drawer.tsx (full), order-matrix.tsx, ui/drawer.tsx, stores/order-store.ts
  found: handleCustomerSelect calls setValues(new Map()) only after `await Promise.all([loadCustomerPrices, loadSellableStock])`; no try/catch; Drawer onClose = store.closeDrawer which never touches the drawer's local useState (values/prices/stock/saveError). Drawer returns null when closed but OrderEntryDrawer stays mounted. handleConfirm only checks customer + values, not whether prices for this customer are loaded. closeDrawer has no other callers in src.
  implication: all of (a)(b)(c) are confirmed by code reading; stale in-flight responses (after close or a newer pick) also land unguarded.

- timestamp: 2026-10-15
  checked: RED run `E2E_BROWSER_CHANNEL=chrome scripts/e2e-local.sh order-drawer` (local Docker Postgres) with 3 new tests holding the loadCustomerPrices server action via page.route
  found: 3 failed, 2 passed. (a) "keeps a quantity typed before the prices arrive": `toHaveValue` Expected "3" Received "" after prices released (line 101). (b) "closing without saving starts the next customer clean": after Esc + pick Gió Biển, `input[type=number]` nth(6) Expected "" Received "5" (Minh Tâm's Đá Viên 10kg quantity survived). (c) "a failed price load says so and blocks the order": `getByText(/Không tải được bảng giá/)` element(s) not found — rejection swallowed silently.
  implication: (a)(b)(c) reproduced at runtime, each failing on the exact symptom.


## Resolution

- root_cause: OrderEntryDrawer keeps its entry state (values/prices/stock/saveError) in local useState but reset it only after `await loadCustomerPrices` (wiping input typed meanwhile) and never on close (Drawer onClose was the store's closeDrawer, which does not touch local state; the component stays mounted). The price promise had no catch and no staleness check, and confirm did not require the current customer's prices.
- fix: resetEntry() clears values/prices/stock/saveError and bumps a priceRequest ref; called synchronously on customer pick and in handleClose (Drawer onClose + after a successful save). The price load is wrapped in try/catch, drops stale answers, and sets priceStatus loading/ready/error; an error banner shows on failure; Enter/confirm are blocked until priceStatus is 'ready'.
- verification: RED 3 failed on the exact symptoms; GREEN order-drawer + order-lifecycle + print-slip 12/12, repeat-each=5 55/55; lint/typecheck/unit/build pass.
- files_changed: [src/components/order/order-entry-drawer.tsx, e2e/order-drawer.spec.ts]
