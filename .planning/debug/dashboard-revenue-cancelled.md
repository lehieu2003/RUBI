---
status: resolved
trigger: "#9 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: the dashboard's 'Doanh số hôm nay' and the comparison with yesterday include cancelled orders. Also fix UI-3 in the same component: the recent-orders table ignores the refreshed prop after an order is created from the dashboard. Fix with regression tests."
created: 2026-10-16
updated: 2026-10-16
branch: fix/dashboard-revenue-cancelled
---

# Debug Session: Dashboard Revenue Cancelled

## Symptoms

Source: audit-reviewer-verified #9 (UI-4 + API-2 cancelled part) and the related Low UI-3 in the same component (raw: `.planning/audits/2026-10-15-raw/01-ui-logic-auditor.md`, `03-api-flow-auditor.md`).

- **Expected:**
  - Revenue today and yesterday (and the % trend) exclude CANCELLED orders. The order count may stay as it is.
  - After saving an order from the dashboard's "LÊN ĐƠN NHANH", the recent-orders table shows it without a full reload.
- **Actual (from code reading):**
  - `src/app/dashboard/page.tsx:39-44` (today) and `:83-90` (yesterday) query orders by `createdAt` only, no status filter; `src/components/dashboard/dashboard-client.tsx:57-60` sums `total` of all of them.
  - `src/components/dashboard/dashboard-client.tsx:53` `const [orders] = useState(initialOrders);` — `router.refresh()` from the order drawer (`src/components/order/order-entry-drawer.tsx`) delivers new props that this copy ignores.
- **Out of scope:** "ordered vs delivered amount" after settlement (audit #6) needs an owner decision; do not change what `total` means here.

## Constraints

- Web only. Keep the KPI order count unchanged unless it clearly also should exclude cancelled (decide and record).
- Tests: Playwright on throwaway local Postgres via `scripts/e2e-local.sh` (guard `e2e/support/env.ts`; `E2E_BROWSER_CHANNEL=chrome` if needed). A unit test of an extracted revenue helper is fine in addition. Never the Supabase DB in `.env`.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, the new/related e2e.
- Conventional Commits, one logical change each.

## Current Focus

reasoning_checkpoint:
  hypothesis: "Revenue counts CANCELLED orders because getTodayOrders/getYesterdayRevenue (src/app/dashboard/page.tsx) filter by createdAt only and DashboardClient sums every total; the recent-orders table stays stale because DashboardClient copies the orders prop into useState once, so router.refresh() props never reach RecentOrders."
  confirming_evidence:
    - "RED e2e: with a 11.200.000đ cancelled order today the card shows 12.170.000đ, expected 970.000đ"
    - "RED e2e: after saving from the dashboard drawer (DB count +1) the first table row is still the previous order"
    - "Code: `const [orders] = useState(initialOrders)` has no setter and no sync with the prop"
  falsification_test: "If the card still shows the cancelled total after filtering status, or the row still does not appear after rendering the prop directly, the hypothesis is wrong."
  fix_rationale: "Exclude CANCELLED in one helper (revenueOf) used for today and yesterday; render the orders prop directly so refreshed server props flow through."
  blind_spots: "Hourly chart tooltip revenue still sums cancelled orders (chart is about volume; left unchanged, noted). total is the ordered amount, not delivered (audit #6, out of scope)."
- next_action: none (resolved; PR into dev left to the orchestrator)

## Evidence

- timestamp: 2026-10-16
  checked: src/app/dashboard/page.tsx getTodayOrders (l.39-45) and getYesterdayRevenue (l.79-91)
  found: where clause is factoryId + createdAt only; yesterday sums total of every order
  implication: CANCELLED orders feed both revenue figures and the % trend

- timestamp: 2026-10-16
  checked: src/components/dashboard/dashboard-client.tsx l.53-60
  found: `const [orders] = useState(initialOrders)` (never updated); todayRevenue reduces every todayOrders row with no status check
  implication: UI-3 confirmed by code; revenue confirmed by code

- timestamp: 2026-10-16
  checked: KPI order count (todayOrders.length) and its subline "X đã giao, Y chờ"
  found: the count is "Tổng đơn hàng" (orders taken today); cancelled ones are neither delivered nor pending in the subline
  implication: decision: keep the count unchanged (a cancelled order was still taken; the subline already excludes it). Only revenue changes.

- timestamp: 2026-10-16
  checked: RED unit test (npm test, tests/lib/revenue.test.ts)
  found: "Error: Cannot find module '../../src/lib/revenue'" (helper does not exist yet)
  implication: unit test red

- timestamp: 2026-10-16
  checked: RED e2e `E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- dashboard` (throwaway Docker Postgres)
  found: |
    ✘ revenue today and the comparison with yesterday leave cancelled orders out
      Expected: "970.000đ"  Received: "12.170.000đ"
    ✘ an order saved from the dashboard shows in the recent orders without a reload
      Expected substring: "Đá Viên 10kg × 37"
      Received string: "22:02KH-002Đại Lý Nước Ngọt Minh TâmĐá Viên 10kg × 40011.200.000đĐã hủyXem"
    2 failed
  implication: both bugs reproduced; order-drawer.spec.ts 5/5 passed on the same build

- timestamp: 2026-10-16
  checked: GREEN e2e `E2E_BROWSER_CHANNEL=chrome npm run e2e:local -- dashboard order-drawer` after the fix
  found: 7 passed (dashboard 2/2, order-drawer 5/5); full suite `npm run e2e:local`: 71 passed
  implication: both bugs fixed, no e2e regression

- timestamp: 2026-10-16
  checked: gates
  found: lint 0 errors (65 pre-existing warnings); typecheck clean; npm test 309/309 pass; npm run build OK (with a local DATABASE_URL)
  implication: ready for PR. Note: one unit test (tests/lib/vietnam-time.test.ts) matches source text and was updated from `todayOrders.reduce(` to `revenueOf(todayOrders)`. A second build over an existing .next failed in webpack ("Cannot read properties of null (reading 'hash')"); `rm -rf .next` cleared it; unrelated to this change.

## Eliminated

## Resolution

- root_cause: getTodayOrders/getYesterdayRevenue (src/app/dashboard/page.tsx) select orders by createdAt only and DashboardClient summed every total, so CANCELLED orders inflated "Doanh số hôm nay" and the trend versus yesterday. Separately, DashboardClient copied the orders prop into `useState(initialOrders)` once, so the props delivered by router.refresh() after saving from the dashboard drawer never reached RecentOrders.
- fix: new src/lib/revenue.ts `revenueOf()` sums totals skipping CANCELLED; used for today (client) and yesterday (page, now selects status). DashboardClient renders the orders prop directly (useState removed). KPI order count deliberately unchanged (cancelled orders were still taken; the "đã giao / chờ" subline already excludes them). The hourly chart tooltip revenue still includes cancelled orders (volume chart, left as is). `total` meaning unchanged (audit #6 out of scope).
- verification: RED then GREEN on throwaway Docker Postgres: e2e/dashboard.spec.ts 2/2, e2e/order-drawer.spec.ts 5/5, full e2e 71 passed; tests/lib/revenue.test.ts red (module missing) then green; npm test 309/309; lint 0 errors; typecheck clean; build OK.
- files_changed: [src/lib/revenue.ts, src/app/dashboard/page.tsx, src/components/dashboard/dashboard-client.tsx, tests/lib/revenue.test.ts, tests/run-tests.ts, tests/lib/vietnam-time.test.ts, e2e/dashboard.spec.ts]
