---
status: resolved
trigger: "Web low findings from the 2026-10-15 audit (UI-8, RACE-10, RACE-H3, assets record dialog) plus flaky e2e 'hidden duplicate' locators"
created: 2026-10-16
updated: 2026-10-17
branch: fix/web-ui-lows
---

# Debug: web-ui-lows

Scope: Next.js web app (`src/`) and Playwright specs (`e2e/`). No schema change expected.

Evidence sources:
- `.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md`
- `.planning/audits/2026-10-15-raw/` (01-ui-logic-auditor, 02-race-condition-auditor)

Line numbers in the audit may have moved; re-locate by reading.

Safety: `.env` is PRODUCTION Supabase. e2e only via `scripts/e2e-local.sh`
(throwaway Docker Postgres, guard in `e2e/support/env.ts`). For `npm run build`
outside that script point BOTH `DATABASE_URL` and `DIRECT_URL` at a local
throwaway URL. If a build over `.next` crashes in webpack ("reading 'hash'"),
delete `.next` and retry. Do not commit `.codegraph/` or `graph.dot`.

Workflow: TDD (failing test commit, then fix commit) per item, one item at a time,
Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Do not push, do not open a PR.

## Symptoms

1. **Flaky e2e "hidden duplicate" (investigate FIRST; may be one root cause).**
   Three specs intermittently fail because a locator matches two elements, one hidden:
   - `e2e/inventory.spec.ts` "the history filters by product and totals the loss":
     `getByLabel('Lọc theo sản phẩm')` resolved to 2 `<select>`s, even after the
     test waits for count 1.
   - `e2e/customer-prices.spec.ts` "a failed save reverts only that edit": hidden duplicate row.
   - `e2e/order-total-delivered.spec.ts`: `getByText('thực giao 8')` matches two
     elements, one hidden; reproduced on base commit 7a6e6c8.
   Find why the page renders a second, hidden copy (responsive duplicate markup,
   streaming/Suspense fallback kept in the DOM, hidden mobile/desktop variant, portal).
   If it is a real double render, fix the cause in the app; if intentional responsive
   markup, make the specs target the visible one deterministically. Prove stability
   with `--repeat-each` (e.g. 10) on those specs.
2. **UI-8 — /customers.** "THÊM KHÁCH HÀNG" is shown to STAFF although
   `POST /api/customers` is ADMIN-only, and the page throws away the server's error
   ("Không thể tạo khách hàng" instead of e.g. "Mã khách hàng … đã tồn tại").
   Expected: button only for ADMIN; show the server's `error` text.
3. **Assets page record dialog (`src/app/assets/page.tsx`).** Esc closes the drawer
   but `showRecord` stays true, so the "Ghi nhận bảo trì" dialog pops up again when
   another asset is opened. Expected: closing the drawer resets the record dialog
   (same approach as #107 for the orders cancel dialog).
4. **RACE-10 — `src/app/inventory/page.tsx` stock-count history.** An older fetch
   response can overwrite results for a newer product filter; "load more" can append
   a page of the old filter. Expected: ignore stale responses (request counter /
   AbortController) and reset paging on filter change.
5. **RACE-H3 — `src/app/driver/page.tsx`.** On any confirm error (incl. 409 when staff
   cancelled meanwhile) the optimistic DELIVERED is rolled back to SHIPPING instead of
   re-fetching, so a cancelled order still looks deliverable. Expected: on error,
   re-fetch the driver's orders and show the server message.

## Gates (at the end)

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, FULL e2e suite via
`scripts/e2e-local.sh` (report pass/fail counts), plus `--repeat-each` runs for item 1.
Report real outputs only.

## Current Focus

hypothesis: all five items fixed and verified
next_action: none (session resolved; PR left to the orchestrator)

## Evidence

- timestamp: 2026-10-16 item 1 probe
  checked: DOM of /inventory polled right after goto (throwaway e2e DB, local build)
  found: two selects 'Lọc theo sản phẩm': `body > div > main > ... > select` (visible) and `body > div#S:0[hidden] > div > main > ... > select`.
    The prerendered /inventory HTML has `<!--$?--><template id="B:0">` (loading.tsx fallback), the page in `<div hidden id="S:0">` and
    `$RC("B:0","S:0")`; React 19.2's $RC marks the boundary `$~` and reveals it in `$RV` via requestAnimationFrame.
    MutationObserver timeline, cold first load: S:0 added 98ms, DOMContentLoaded 122ms, React adds a second (client-rendered) copy 148ms,
    load 262ms, S:0 removed only at 391ms (first frame). Warm loads: reveal at ~15ms, no window. React's client renders the pending
    (`$~`) boundary itself when an update reaches it before the reveal (retrySuspenseComponentWithoutHydrating), so for ~240ms the page
    exists twice, one copy hidden. Not an app double render: final DOM is correct; intentional framework streaming.
  implication: any locator on the first goto of a fresh context can hit strict-mode violations; specs must wait for the streamed copy to go.
- timestamp: 2026-10-16 item 1 baseline
  checked: `npx playwright test e2e/inventory.spec.ts e2e/customer-prices.spec.ts e2e/order-total-delivered.spec.ts --repeat-each=10` (before fix)
  found: 4 failed, 8 did not run, 88 passed. Failures: 3x `getByText('thực giao 8') resolved to 2 elements`, 1x inventory
    `locator('tbody tr')...filter({ hasText: '20 kg' }) resolved to 2 elements`.
- timestamp: 2026-10-16 item 1 RED
  checked: new e2e/streamed-page.spec.ts (rAF held 1.5s from start, openPage = plain goto) --repeat-each=5
  found: 5 failed; Received `{ filters: 2, hiddenCopies: 1 }` vs expected `{ filters: 1, hiddenCopies: 0 }`.
- timestamp: 2026-10-16 item 1 GREEN (openPage waits for no `[hidden][id^="S:"]`; three specs use it)
  found: streamed-page --repeat-each=5: 5 passed. Three specs --repeat-each=10: 97 passed, 1 failed, 2 did not run — the remaining
    failure was a second, unrelated cause: inventory row locator `filter({ hasText: '20 kg' })` also matched
    `Đá Viên 10 kg … 1.220 kg` (totalKg), deterministic at repeat 9 once vien-10 stock reached 122 (same failure was in the baseline).
- timestamp: 2026-10-16 item 1 GREEN after row locator fix (size cell `td` /^20 kg$/)
  found: four specs --repeat-each=10: 110 passed; three specs --repeat-each=10 again: 100 passed.

- timestamp: 2026-10-16 item 2 (UI-8)
  checked: src/app/customers/page.tsx vs POST /api/customers (requireRole(['ADMIN']), 409 `Mã khách hàng "X" đã tồn tại`)
  found: button rendered for every role; mutationFn threw a fixed 'Không thể tạo khách hàng' and onError ignored the error.
  RED: e2e/customers-add.spec.ts 2 failed (staff: button count Received 1, expected 0; manager: toast `Mã khách hàng "KH-005" đã tồn tại` not found).
  GREEN: --repeat-each=3: 6 passed.
- timestamp: 2026-10-16 item 3 (assets record dialog)
  checked: src/app/assets/page.tsx: Drawer onClose={() => setSelected(null)}; dialog rendered `showRecord && selected`
  found: Drawer's document keydown Esc closes the drawer; showRecord stays true and the dialog reappears on the next openDetail.
  RED: e2e/assets-record-dialog.spec.ts failed at "drawer still visible after first Esc" (element(s) not found).
  GREEN: handleCloseDrawer closes the dialog first (same as #107). assets-record-dialog + order-drawer --repeat-each=3: 18 passed.
- timestamp: 2026-10-16 item 4 (RACE-10)
  checked: fetchHistory in src/app/inventory/page.tsx: every response writes state; load-more appends regardless of filter
  RED: e2e/stock-count-history-races.spec.ts (answers for the old filter held 2 s by page.route):
    test 1 rows Received length 20 (Đá Bi 5kg) vs expected 1 (Đá Mi 20kg); test 2 rows ["Đá Mi 20kg", "Đá Bi 5kg"] vs length 1.
  GREEN: request counter (useRef) — only the latest request writes / clears loading; filter change clears list + total.
    races + inventory + stock-count --repeat-each=3: 30 passed.
- timestamp: 2026-10-16 item 5 (RACE-H3)
  checked: handleConfirm in src/app/driver/page.tsx: any failure mapped the order back to SHIPPING with a fixed message
  RED: e2e/driver-confirm-cancelled.spec.ts (order cancelled in DB after the list loaded): toast 'Chỉ xác nhận được đơn đang giao' not found.
  GREEN: HTTP refusal -> server `error` toast + fetchOrders(); no answer (fetch threw) -> rollback to SHIPPING as before.
    --repeat-each=3: 3 passed; order-lifecycle.spec.ts: 6 passed.
- timestamp: 2026-10-17 gates
  found: npm run lint 0 errors (65 warnings, none new in touched files); npm run typecheck clean; npm test 313 pass / 0 fail;
    npm run build (local DB URLs) compiled successfully; full e2e via scripts/e2e-local.sh: 86 passed, 0 failed;
    scripts/e2e-local.sh inventory + customer-prices + order-total-delivered + streamed-page --repeat-each=10: 110 passed, 0 failed.

## Eliminated

- hypothesis: item 1 is responsive duplicate markup or a portal in the page components
  evidence: only one `aria-label="Lọc theo sản phẩm"` in src; the second copy is inside `div#S:0[hidden]`, React's streamed segment
  timestamp: 2026-10-16
- hypothesis: item 1 inventory failure at repeat 9 is the same streaming window
  evidence: it persisted after openPage; the error listed `Đá Viên 10 kg … 1.220 kg` — a text match on "20 kg", not a hidden copy
  timestamp: 2026-10-16

## Resolution

root_cause: |
  1. Not an app double render. Pages stream into the root loading.tsx Suspense boundary: the server HTML waits in a hidden
     <div id="S:0"> until React 19.2's batched reveal ($RC/$RV) runs on the next animation frame. On a cold load in a fresh test
     context the first frame comes late (~390 ms vs ~15 ms warm) and React client-renders the pending boundary before it, so for
     ~240 ms the page exists twice, once hidden, and strict locators match both. Separately, the inventory row locator
     `hasText: '20 kg'` also matched "1.220 kg" (totalKg of Đá Viên 10 kg) once that stock reached 122.
  2. /customers rendered "THÊM KHÁCH HÀNG" for every role and replaced the server's error text with a fixed message.
  3. The asset drawer's Esc handler closed the drawer only; showRecord stayed true and the dialog reappeared on the next asset.
  4. Every stock-count history response wrote state, so a late answer for an old filter (or its "load more") landed on the new one.
  5. Any confirm failure on /driver rolled the order back to SHIPPING with a generic message, so a cancelled order looked deliverable.
fix: |
  1. e2e/support/app.ts openPage(): goto + wait until no `[hidden][id^="S:"]` remains; used in the three specs (spec-only, the
     streaming is intentional framework behaviour). Inventory row matched by its size cell (`td` /^20 kg$/).
  2. Button only for user.role === 'ADMIN'; toast shows the server `error` (fallback text for network TypeError).
  3. handleCloseDrawer: with the record dialog open, Esc closes the dialog only (same approach as #107).
  4. useRef request counter: only the latest fetchHistory writes data, toasts or clears loading; a filter change clears list and total.
  5. HTTP refusal: toast the server `error` and re-fetch the driver's orders; no answer at all: roll back to SHIPPING as before.
verification: |
  RED/GREEN per item recorded in Evidence. Gates: lint 0 errors, typecheck clean, npm test 313/313, build OK, full e2e 86 passed / 0 failed,
  --repeat-each=10 on the three specs + streamed-page: 110 passed / 0 failed (baseline before fix: 4 failed, 8 did not run, 88 passed).
files_changed:
  - e2e/support/app.ts
  - e2e/inventory.spec.ts
  - e2e/customer-prices.spec.ts
  - e2e/order-total-delivered.spec.ts
  - e2e/streamed-page.spec.ts
  - e2e/customers-add.spec.ts
  - e2e/assets-record-dialog.spec.ts
  - e2e/stock-count-history-races.spec.ts
  - e2e/driver-confirm-cancelled.spec.ts
  - src/app/customers/page.tsx
  - src/app/assets/page.tsx
  - src/app/inventory/page.tsx
  - src/app/driver/page.tsx
