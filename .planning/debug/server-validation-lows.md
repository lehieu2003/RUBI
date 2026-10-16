---
status: resolved
trigger: "Four Low findings from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md section 4: #14/API-5 decimal prices, #16 mustChangePassword gate skipped, API-8 cancel overwrites notes, API-7 asset next-due keeps a superseded date."
created: 2026-10-16
updated: 2026-10-16
branch: fix/server-validation-lows
---

# Debug Session: Server Validation Lows

## Symptoms

Source: `.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md` section 4 "Low"; raw reports in `.planning/audits/2026-10-15-raw/`. Line numbers may have moved; re-locate by reading the code.

1. **#14 / API-5 — decimal price accepted.**
   - Actual: `z.number().positive()` in `src/app/api/prices/global/route.ts`, `src/app/api/prices/customer/override/route.ts`, `src/lib/contracts/products.ts`; `src/components/pricing/customer-price-form.tsx` parses with `parseFloat`. Payments must be whole VND (`src/lib/contracts/customers.ts` `.int`), and "Thu đủ" strips the decimal point (`src/components/debt/payment-dialogs.tsx`), so a debt built on a decimal price can never be fully paid.
   - Expected: every price input requires whole VND (server schemas + matching UI parsing). A price of 12500.5 → 400.
2. **#16 — forced password change gate skipped.**
   - Actual: `getSession` used directly instead of `requireSession`/`requireRole` in `src/app/api/reports/debt/route.ts`, `src/lib/actions/orders.ts` (saveOrder, loadCustomerPrices, loadSellableStock, loadSlipFactory), `src/app/api/products/route.ts` GET.
   - Expected: helpers from `src/lib/auth/helpers.ts` with the same roles as today; an account with `mustChangePassword` gets 403 there like everywhere else.
3. **API-8 — cancel overwrites the order note.**
   - Actual: `src/app/api/orders/[id]/status/route.ts` sets `notes` to `[HỦY: reason]`.
   - Expected: keep the original note and append the reason (`"<note>\n[HỦY: reason]"`); e2e `order-lifecycle` assertion on `[HỦY: Khách gọi hủy]` keeps working.
4. **API-7 — asset next-due keeps a superseded due date.**
   - Actual: `src/app/api/assets/route.ts` picks the earliest `dueAt` of all maintenance records (`orderBy dueAt asc, take 1`); the dashboard alert (`src/app/dashboard/page.tsx`) does the same.
   - Expected: per maintenance type take the `dueAt` of its latest record (by `performedAt`), then the soonest of those. Record A due 2026-10-01, newer record B (same type) due 2027-10-01 → next due 2027-10-01.

## Constraints

- TDD: failing test first per finding (unit/source tests under `tests/`; DB-backed e2e via `scripts/e2e-local.sh`). One test commit + one fix commit per finding.
- DATABASE SAFETY: `.env` DATABASE_URL is PRODUCTION Supabase. e2e only via `scripts/e2e-local.sh`. `npm run build` outside it: override BOTH `DATABASE_URL` and `DIRECT_URL` to a local throwaway URL. No schema change expected; if one is needed, stop with a checkpoint. If build over existing `.next` crashes ("reading 'hash'"), delete `.next` and retry.
- Gates: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, e2e (`order-lifecycle`, `access`, `customer-prices`, `products`, `dashboard` + new); `npm run contract:verify` on a LOCAL server if contracts change (`npm run contract:docs` to regenerate OpenAPI).
- Do not commit `.codegraph/` or `graph.dot`. Do not push, do not open the PR.

## Current Focus

hypothesis: "All four findings confirmed and fixed (RED then GREEN each)."
next_action: "None in this session. The PR into dev is up to the orchestrator."

## Evidence

- timestamp: 2026-10-16 finding 1 (#14) RED
  checked: new tests/api/prices.test.ts (commit bdbe32c), run with `npx tsx --test tests/api/prices.test.ts`
  found: |
    not ok 1 - the default price of a product refuses a fractional amount  (GlobalPriceBody not exported: the route had its own z.number().positive())
    not ok 2 - a customer own price refuses a fractional amount  (same, CustomerPriceOverrideSchema private to the route)
    not ok 3 - a new product refuses a fractional price  (CreateProductBody accepted price 12500.5)
    not ok 4 - the routes validate with those schemas
    not ok 5 - the price forms refuse a fractional amount before sending it  (customer-price-form uses parseFloat; product-table checks Number.isFinite only)
  implication: every price input accepts a fractional VND amount; confirmed as described.

- timestamp: 2026-10-16 finding 2 (#16) RED
  checked: new tests/auth/password-change-gate.test.ts (commit d6aedc6)
  found: |
    not ok 1 - only the auth routes read the session without the helpers
      "use requireSession/requireRole from @/lib/auth/helpers in: src/app/api/products/route.ts, src/app/api/reports/debt/route.ts, src/lib/actions/orders.ts"
    not ok 2 - keeps the roles each of them allowed before  (no requireRole(['ADMIN']) in the debt report)
    not ok 3 - order entry actions keep returning a plain error, not a Response
  implication: these three files skip the mustChangePassword check that requireSession adds. (The orders/[id]/confirm route only mentions getSession() in a comment; it already uses requireRole.) The middleware gate still answers 403 on /api/* for cookie sessions, so this is defence in depth and not reproducible end-to-end; no e2e added for it.
- timestamp: 2026-10-16 finding 2 fix note
  found: the debt report's catch had no `if (error instanceof Response) return error;`, so requireRole's 401/403 would have become a 500. Added it and a test assertion for it in the fix commit.

- timestamp: 2026-10-16 finding 3 (API-8) RED
  checked: src/app/api/orders/[id]/status/route.ts and new tests in tests/api/order-status.test.ts (commit a85f8a2)
  found: |
    route wrote `notes: parsed.data.cancellationReason ? `[HỦY: ${parsed.data.cancellationReason}]` : undefined` (the note is replaced).
    not ok 1 - appends the reason on its own line after the note  (Cannot find module src/lib/order-notes)
    not ok 2 - is just the tag when the order had no note
    not ok 3 - the status route writes the note through it
    e2e/order-lifecycle.spec.ts gets a new API-level test (note 'Giao cổng sau' must become 'Giao cổng sau\n[HỦY: Khách gọi hủy]'); the old assertion now uses toContain.
  implication: cancelling destroys the delivery note; confirmed.

- timestamp: 2026-10-16 finding 4 (API-7) RED
  checked: src/app/api/assets/route.ts (`maintenanceRecords: { orderBy: { dueAt: 'asc' }, where: { dueAt: { not: null } }, take: 1 }`), src/app/dashboard/page.tsx getDueMaintenance (every record with dueAt <= now+30d, `orderBy: { dueAt: 'asc' }, take: 5`), new tests in tests/api/assets.test.ts and e2e/asset-due.spec.ts (commit f8cab76)
  found: |
    not ok 1 - a newer record of the same type replaces the older due date  (no src/lib/maintenance helper; both readers take the earliest dueAt of any record)
    not ok 2 - takes the soonest across types, each from its latest record
    not ok 3 - a latest record without a due date leaves nothing due for that type
    not ok 4 - the asset list and the dashboard alert both use it
  implication: a record superseded by a newer one of the same type (A due 2026-10-01, B due 2027-10-01) keeps showing A's date in the asset list and keeps raising the dashboard alert; confirmed by reading both queries.

- timestamp: 2026-10-16 gates after all four fixes
  found: |
    npm run lint: 0 errors, 65 warnings (all pre-existing; the touched files add none)
    npm run typecheck: clean
    npm test: 328 tests, 328 pass, 0 fail
    npm run build (DATABASE_URL/DIRECT_URL overridden to a throwaway URL): success
    e2e (scripts/e2e-local.sh, E2E_BROWSER_CHANNEL=chrome) order-lifecycle access customer-prices products dashboard asset-due: 27 passed.
      The first run of that set had 1 failure: customer-prices "a failed save reverts only that edit" hit a strict-mode duplicate of the
      "Đá Bi 20kg" row (second copy hidden). customer-prices alone passed 4/4 and the same set re-run passed 27/27, so it is intermittent.
    full e2e suite: 80 passed, 1 failed, 2 did not run. The failure is order-total-delivered "the order list, the debt export and the
      order page show the delivered amount": getByText('thực giao 8') resolves to 2 elements (second one hidden). It fails the same way
      on base commit 7a6e6c8 (dev HEAD, checked in a separate worktree), so it is pre-existing and not from this branch.
    npm run contract:verify against a local standalone server on a throwaway Postgres (port 3100/55433): 58/58 contracts verified in 192 calls.

## Eliminated

## Resolution

root_cause:
  1 (#14/API-5): the price schemas used z.number().positive() (global price and customer price defined privately in their routes, product create in src/lib/contracts/products.ts), and customer-price-form parsed with parseFloat, so a fractional VND price was stored while payments must be whole VND.
  2 (#16): the debt report, GET /api/products and the order entry server actions (saveOrder, loadCustomerPrices, loadSellableStock, loadSlipFactory via requireOfficeActor) called getSession() directly and so skipped the mustChangePassword check in requireSession.
  3 (API-8): the status route set notes to `[HỦY: reason]` on cancel, replacing the existing note.
  4 (API-7): the asset list and the dashboard alert took the earliest dueAt of any maintenance record, so a record superseded by a newer one of the same type kept setting the next due date.
fix:
  1: src/lib/contracts/prices.ts exports Price (int, positive), GlobalPriceBody and CustomerPriceBody; both price routes validate with them and the contract uses them; CreateProductBody.price is .int(); customer-price-form uses Number() + Number.isInteger and toasts a refusal; product-table checks Number.isInteger. OpenAPI regenerated (price -> integer).
  2: debt report uses requireRole(['ADMIN']) and returns a thrown Response from its catch; GET /api/products uses requireSession() and returns a thrown Response; requireOfficeActor uses requireRole(['ADMIN', 'STAFF']) and turns the helper's Response into the plain Error it always threw, so the actions' return contract is unchanged.
  3: new src/lib/order-notes.ts withCancelReason(notes, reason) -> "<note>\n[HỦY: reason]" or just the tag when there was no note; the status route uses it with existing.notes.
  4: new src/lib/maintenance.ts currentDueDates(records): latest record per type by performedAt (later createdAt wins a tie), keep those with a dueAt, soonest first. /api/assets takes the first; the dashboard flattens it over the factory's assets, keeps those due within 30 days, soonest 5.
verification: unit RED then GREEN per finding (tests/api/prices.test.ts, tests/auth/password-change-gate.test.ts, tests/api/order-status.test.ts, tests/api/assets.test.ts); e2e added/updated in customer-prices (12500.5 -> 400 on both price routes), order-lifecycle (cancel keeps the note; old assertion uses toContain), asset-due (new spec, API nextDue + dashboard alert). Gates in Evidence.
files_changed:
  - api/openapi/price.yaml
  - api/openapi/product.yaml
  - src/app/api/prices/global/route.ts
  - src/app/api/prices/customer/override/route.ts
  - src/lib/contracts/prices.ts
  - src/lib/contracts/products.ts
  - src/components/pricing/customer-price-form.tsx
  - src/components/pricing/product-table.tsx
  - src/app/api/reports/debt/route.ts
  - src/app/api/products/route.ts
  - src/lib/actions/orders.ts
  - src/lib/order-notes.ts (new)
  - src/app/api/orders/[id]/status/route.ts
  - src/lib/maintenance.ts (new)
  - src/app/api/assets/route.ts
  - src/app/dashboard/page.tsx
  - tests: tests/api/prices.test.ts (new), tests/auth/password-change-gate.test.ts (new), tests/api/order-status.test.ts, tests/api/assets.test.ts, tests/pricing/scope.test.ts, tests/run-tests.ts
  - e2e: e2e/customer-prices.spec.ts, e2e/order-lifecycle.spec.ts, e2e/asset-due.spec.ts (new)
