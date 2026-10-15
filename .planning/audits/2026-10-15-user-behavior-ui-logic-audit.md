# User Behavior & UI Logic Audit — 2026-10-15

Written for the project owner/developer, to plan fixes.

- **Method:** five custom read-only subagents (`.claude/agents/`): `ui-logic-auditor`, `race-condition-auditor`, `flutter-auditor`, `api-flow-auditor` ran in parallel; results merged and deduplicated by the orchestrator; `audit-reviewer` re-verified findings against source.
- **Branch inspected:** `dev` (after commit `79a9f07`, debt report aggregate).
- **Nothing was executed:** no tests, builds, or database queries. Every reproduction below is traced from code, not observed. Line numbers are as reported by the auditors and re-checked by the reviewer for all Critical/High items and most Medium/Low items (FL-8 not opened).
- **Raw inputs:** `2026-10-15-raw/` (four auditor reports + orchestrator merge notes).

## 1. Executive summary

- 36 findings + 9 hypotheses raw → **34 distinct issues + 9 unconfirmed hypotheses** after review. No whole finding rejected; parts of 4 rejected.
- **No Critical remains** — the reviewer downgraded all four Critical ratings because each needs overlapping requests or a lost response.
- **Four High:**
  - H1: a stock count while trucks are out logs a false loss and deducts the same bags again at settlement.
  - H2: on mobile, a payment, shell entry or production batch can be saved twice after a timeout.
  - H3: one customer with an empty phone breaks a driver's whole delivery list on mobile.
  - H4: overlapping settlements of one order book debt and stock twice.
- **Main theme:** the server checks a condition, then writes in a separate step with no guard (settlement, status changes, payroll lock, shift sign-up, bulk-assign). One cheap fix pattern exists already in `src/app/api/orders/[id]/confirm/route.ts:50-51`.
- **Held up:** role checks on every traced route; the latest debt report change is correct. Exception: three places skip the forced password change (#16).

## 2. Coverage

| Feature | Web UI | API / server | Flutter |
|---|---|---|---|
| Order entry & lifecycle | ✅ | ✅ | ✅ |
| Driver delivery | ✅ | ✅ | ✅ |
| Settlement (đối soát) | ✅ handlers | ✅ | ✅ |
| Debt, payments, ledger, debt report | ✅ | ✅ | ✅ |
| Shell deposits | ✅ | ✅ | ✅ |
| Inventory & stock counts | Partly (JSX after line 210 not read) | ✅ | ✅ |
| Prices & overrides | ✅ form | ✅ single requests; concurrency by grep only | — |
| Schedule, shifts, payroll lock | ❌ | ✅ | Cubits only |
| Login, sessions, roles | Login + middleware | Partly | ✅ |
| Dashboard | ✅ | ✅ | — |
| Assets, staff, products, settings, audit log | Mostly ❌ | Partly | ❌ |

## 3. High-priority bugs (verified)

### H1. Mid-day stock count logs a false loss and deducts the same bags twice — High (API-1; High Confidence)
- **Where:** `src/app/api/inventory/route.ts:98-109`, `src/lib/inventory.ts:38-51`, `src/app/api/orders/[id]/reconcile/route.ts:91`.
- **Business rule:** count replaces the book balance — UI text `src/app/inventory/page.tsx:537`; stock leaves books at settlement — `src/lib/actions/orders.ts:76-78`, `src/lib/inventory.ts:55-58`.
- **Evidence:** `const bookQuantity = (await stockOnHand(tx, [productId]))...; const counted = await changeStock(tx, productId, { set: quantity });`
- **Repro:** book 100 → order of 20 goes SHIPPING → count cold store 80 → StockCount logs 20 lost, balance 80 → settle 20 → balance 60. Expected 80, no loss.
- **Fix:** compare/store against `counted + qty in SHIPPING/DELIVERED orders`. Do **not** add back PENDING (still in cold store, `src/lib/inventory.ts:69`).
- **Test:** integration on throwaway Postgres: seed 100, SHIPPING 20, SET 80, reconcile 20 → balance 80, no loss.

### H2. Mobile payment, shell "ghi thêm", production batch saved twice after a timeout — High (RACE-4, FL-1)
- **Mobile:** `mobile/lib/core/network/api_error_decoder.dart:16-21` maps receiveTimeout → NetworkFailure ("Không có kết nối. Vui lòng thử lại."); sheets re-enable submit: `mobile/lib/features/debt/presentation/screens/customer_ledger_screen.dart:226-228`, `mobile/lib/features/shells/presentation/shells_screen.dart:177-179`, `mobile/lib/features/inventory/presentation/screens/inventory_tab.dart:339-341`.
- **Server (not idempotent):** `src/app/api/customers/[id]/payments/route.ts:51-53`, `src/app/api/deposits/shells/route.ts:97-100`, `src/app/api/inventory/route.ts:93-94`; no unique business key in `prisma/schema.prisma:175-226`.
- **Repro:** record 100.000 on mobile, delay 201 past 15 s (`mobile/lib/core/constants/api_constants.dart:14`), tap again → two PAYMENT rows. Duplicate payment only passes when 2×amount ≤ owed (`payments/route.ts:48`).
- **Not affected:** order create — mobile shows `AppStrings.orderEntryUnsure` (`mobile/lib/features/orders/presentation/cubit/order_entry_cubit.dart:208-210`); web buttons disabled while saving.
- **Fix:** short term: "unsure" message, close sheet, reload. Long term: client idempotency key in a unique column (Prisma Migrate).
- **Test:** flutter test with http_mock_adapter: receiveTimeout → no retry offered, no second POST.

### H3. One customer with empty phone/address blocks a driver's whole delivery list — High (FL-2)
- **Where:** server stores `phone: phone || ''` (`src/app/api/customers/route.ts:57`; optional in `src/lib/contracts/customers.ts:37-38`); mapper rejects empty (`mobile/lib/core/network/mapping_validator.dart:9-10`, `mobile/lib/features/driver/data/mappers/order_mapper.dart:30-37`); one Err fails the list (`mobile/lib/features/driver/data/driver_repository_impl.dart:44-50`). History same.
- **Repro:** create customer without phone → assign order to driver → "Đơn hôm nay" shows error, no delivery confirmable.
- **Fix:** make phone/address nullable in the driver order model; hide call/directions when empty.
- **Test:** `mobile/test/features/driver/data/order_mapper_test.dart:188-209` currently expects Err — change to Ok; add repository test with one empty-phone order among three.

### H4. Settlement checks status but writes without re-checking — High (RACE-1 + reverse half of RACE-2; High Confidence)
- **Where:** `src/app/api/orders/[id]/reconcile/route.ts:37-46` (check), `:62-65` (write, `where: { id }` only), `:76-83` (DEBT), `:91` (stock). No isolationLevel/FOR UPDATE; only Serializable use is payments `:65`. No ledger↔order unique key (`prisma/schema.prisma:216-226`).
- **Repro:** two settlements of one DELIVERED order overlap (web + mobile, two tabs, mobile retry while first still running) → two DEBT rows, stock deducted twice. Variant: staff cancels mid-settlement → CANCELLED overwritten with COMPLETED, debt booked.
- **Fix:** first write in the tx `updateMany({ where: { id, factoryId, status: 'DELIVERED' } })`, 409 if count 0.
- **Test:** `tests/integration/reconcile-race.test.ts`: Promise.all two reconciles → 1 DEBT row, stock once, one 409.

## 4. Medium and Low bugs

### Medium
| # | Issue | Where | Sources |
|---|---|---|---|
| 5 | Status endpoint writes without expected status: can reopen a settled order (re-charged later) or erase a driver's delivery from a 60 s-cached screen | `src/app/api/orders/[id]/status/route.ts:12-15, 47-81`; `src/lib/query-provider.tsx:12-14` | RACE-2, RACE-3 |
| 6 | Settlement keeps `Order.total` at ordered amount; lists/exports disagree with debt | `src/app/api/orders/[id]/reconcile/route.ts:62-72`; reads `src/app/api/orders/route.ts:48`, `src/app/api/customers/debt-export/route.ts` | API-3, part API-2 |
| 7 | Mobile ledger never re-reads balance (feeds payment cap `customer_ledger_screen.dart:215`); duplicate row after "Xem thêm" following a payment | `mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart:87, 142`; `src/app/api/customers/[id]/ledger/route.ts:34-36` | FL-6 |
| 8 | Order drawer: quantities typed before prices load are wiped; after closing without saving, previous customer's quantities can be submitted for the next customer | `src/components/order/order-entry-drawer.tsx:43-53, 72-91, 146-160`; `src/stores/order-store.ts:63-65`; `src/components/order/order-matrix.tsx:48-53` | UI-1, RACE-9, UI-H1 |
| 9 | Dashboard revenue today/yesterday includes cancelled orders | `src/app/dashboard/page.tsx:39-44, 83-90`; `src/components/dashboard/dashboard-client.tsx:57-60` | UI-4, API-2 |
| 10 | Customer price page lists only "Đá Bi"/"Đá Viên" | `src/components/pricing/customer-price-form.tsx:117-125` (vs `order-matrix.tsx:19-31`) | UI-5 |
| 11 | Esc in cancel dialog closes drawer; "Xác nhận hủy" then silently does nothing | `src/components/ui/drawer.tsx:49-52`; `src/app/orders/page.tsx:287-289, 298-300, 307, 847-882` | UI-7 |
| 12 | Driver photo toast "Đã lưu" but never uploaded | `src/components/driver/DeliveryCard.tsx:53-62, 125`; `src/app/driver/page.tsx:87` | UI-2 |
| 13 | Mobile session hard-expires 7 days after login; refresh only tried after the token is invalid | `mobile/lib/core/network/auth_interceptor.dart:68-90, 130-140`; `src/app/api/auth/refresh/route.ts:6-8, 19-23`; `src/lib/auth.ts:31` | FL-3 |

### Low
- **#14** Decimal price accepted → debt can never be fully paid; "Thu đủ" breaks — `src/app/api/prices/global/route.ts:10`, `src/app/api/prices/customer/override/route.ts:11`, `src/lib/contracts/products.ts:20`, `src/components/pricing/customer-price-form.tsx:48`, `src/components/debt/payment-dialogs.tsx:54,117`, `src/lib/contracts/customers.ts:46` (API-5).
- **#15** Amounts ≥ 100,000,000đ return 500: `Decimal(10,2)` at `prisma/schema.prisma:179,208,220` vs Zod max 10 billion `src/lib/contracts/customers.ts:48`; caught as generic 500 `payments/route.ts:83-86` (API-4).
- **#16** Skip mustChangePassword gate: `src/app/api/reports/debt/route.ts:9-18`, `src/lib/actions/orders.ts:20-26`, `src/app/api/products/route.ts:11` (vs `src/lib/auth/helpers.ts:15-16`).
- **#17** First stock movement of the day fails when two writers create today's row (P2002 rollback) — `src/lib/inventory.ts:33-52`, unique `prisma/schema.prisma:248` (RACE-8).
- **RACE-5** Bulk-assign driver-active check outside tx — `src/app/api/orders/bulk-assign/route.ts:35-42` vs `:53-62`; `src/app/api/staff/[id]/route.ts:17-23`.
- **RACE-6** Shift cap exceeded by concurrent sign-ups — `src/app/api/schedule/my/route.ts:131-153`.
- **RACE-7** Payroll lock check-then-act — `src/lib/payroll-lock.ts:19-27`, `src/app/api/schedule/my/route.ts:103,149`, `src/app/api/reports/shifts/lock/route.ts:36-51`.
- **UI-6** Failed override save reverts to page-load snapshot (display only) — `src/components/pricing/customer-price-form.tsx:35,75` (correct pattern `:86`).
- **UI-3** Dashboard recent orders ignore refreshed prop — `src/components/dashboard/dashboard-client.tsx:53`.
- **UI-8** Add-customer button shown to STAFF; server error hidden — `src/app/customers/page.tsx:69,78-80,114-120`; `src/app/api/customers/route.ts:37`.
- **FL-4** `/api/auth/me` returns `{user:null}` 200; app shows generic error, keeps dead token — `src/app/api/auth/me/route.ts:11-12`; `mobile/lib/features/auth/data/auth_repository_impl.dart:85-86,95`.
- **FL-5** Late `restore()` overwrites a successful login — `mobile/lib/features/auth/presentation/cubit/auth_cubit.dart:82-91`; `mobile/lib/core/router/app_router.dart:21,39`.
- **FL-7** Resume refresh reverts a just-confirmed delivery — `mobile/lib/features/driver/presentation/cubit/today_orders_cubit.dart:82-99,106-148`; server no-op `src/app/api/orders/[id]/confirm/route.ts:37-38`.
- **FL-9** Logout waits up to 15 s before clearing token — `mobile/lib/features/auth/data/auth_repository_impl.dart:124-131`.
- **API-6** Reconcile accepts duplicate/missing lines (hand-made ADMIN request only) — `src/app/api/orders/[id]/reconcile/route.ts:48-51,68-72,87-92`.
- **API-7** Asset next-due keeps superseded date — `src/app/api/assets/route.ts:26-31`; `src/app/api/assets/[id]/maintenance/route.ts:82-91`; `src/app/dashboard/page.tsx:94-103`.
- **API-8** Cancel overwrites order note — `src/app/api/orders/[id]/status/route.ts:77-79`.
- **RACE-10** Older inventory-history response overwrites newer filter — `src/app/inventory/page.tsx:66-97`.
- **RACE-11** Product uniqueness only in app code — `src/app/api/products/route.ts:46-60`; `prisma/schema.prisma:90`.
- **RACE-H1** Serializable payment conflict → generic 500 (retry safe) — `src/app/api/customers/[id]/payments/route.ts:65,83-86`.
- **RACE-H3** Web driver page rolls back to SHIPPING on any error incl. 409 — `src/app/driver/page.tsx:93-96`.

## 5. Race conditions and repeated actions
H2, H4, #5 (money at risk); #8 (drawer state); Low: #17, RACE-5/6/7/10/11, FL-7, RACE-H1.
Protected: driver confirm (conditional write), payments (Serializable), web submit buttons, mobile order entry ("unsure" message).

## 6. Forms, UI state, lifecycle, navigation
Web: #8, #9, #10, #11, #12, UI-3, UI-6, UI-8. Mobile: #7, FL-4, FL-5, FL-7, FL-9.
Note: React Hook Form is not used anywhere (all forms are `useState`), contrary to CLAUDE.md.

## 7. API and business-logic mismatches
H1, #6, #9, #14, #15, #16, API-6, API-7, API-8; H3 (server allows empty phone, mobile rejects); FL-4 (`/me` contract vs client).

## 8. Cross-component user-flow failures
1. **Order → delivery → settlement:** stale status change (#5) wipes a delivery or reopens a settled order → overlapping settlement (H4) doubles debt → `Order.total` disagrees with debt (#6) → dashboard overstates revenue (#9).
2. **Stock:** count while trucks out (H1) + settlement deduction + repeated batch (H2) + first-movement race (#17) → wrong balance and low-stock alerts.
3. **Mobile debt collection:** timeout → double payment (H2) → stale ledger balance (#7) → decimal price leaves unpayable remainder (#14).
4. **Driver's day (mobile):** one customer without phone breaks list (H3); session ends on day 7 (#13); resume refresh undoes confirm (FL-7); web photo proof not stored (#12).

## 9. False positives and unconfirmed hypotheses

**Rejected parts:** RACE-4 order-create as live risk (mitigated both clients); API-1's fix adding PENDING back; api-flow's "authorization held" for the debt report (#16); Critical ratings for RACE-1/2/4 and FL-1.

| Hypothesis | Needed to decide |
|---|---|
| RACE-9 out-of-order prices for A/B (`order-entry-drawer.tsx:47-51`) | Whether Next.js dispatches server actions serially |
| RACE-H2 Redis rate-limit key may never expire (`src/lib/rate-limit.ts:92-95`) | Whether Redis is used in production |
| API-H1 debt export omits inactive debtors (`src/app/api/customers/debt-export/route.ts:18`) | No caller found — maybe dead code |
| API-H2 shells returned > shells out (`src/app/api/deposits/shells/route.ts:9-10,94-100`) | Owner's business rule |
| API-H3 SHIPPING with no driver (`src/app/api/orders/[id]/status/route.ts:65-81`) | Owner's business rule |
| Settlement actual > ordered not capped (`reconcile/route.ts:12`) | Owner's business rule |
| FL-8 role change leaves old tabs (`src/lib/auth.ts:74-76`) | `home_shell.dart` not opened |
| FL-H1 "driver not linked" 401 → logout loop (`confirm/route.ts:21-23`, `driver/orders/route.ts:23-25`) | Only legacy data; 401 semantically wrong anyway |
| FL-H2 refresh after logout restores token (`auth_interceptor.dart:90`) | Timing test |

## 10. Recommended remediation order
1. H4 + #5 — conditional writes in reconcile and status (small, server-only, stops money errors).
2. H3 — driver order mapper (tiny; blocks a driver's day).
3. H2 short term — "unsure" handling on three mobile sheets.
4. H1 — stock count rule (confirm business rule first).
5. #8 — order drawer state (hot path).
6. #6 + #9 — decide meaning of order total after settlement; fix dashboard.
7. #13, #7, #11, #10, #12, #16.
8. Schema changes via Prisma Migrate (call out in PR): idempotency keys (H2), `Decimal(14,2)` (#15), product unique index (RACE-11).
9. Remaining Low items.

## 11. Regression test plan
- **New DB integration suite** `tests/integration/*` on a throwaway Postgres (reuse guard `e2e/support/env.ts:5-20`; never the Supabase DB in `.env`): concurrent reconcile (H4), stale status (#5), count then settle (H1), first-movement `changeStock` (#17), bulk-assign vs deactivate, shift cap, payroll lock, amount limit (#15). Existing `tests/` are source-regex checks with no DB.
- **Playwright `e2e/`:** drawer delayed price load + close/reopen (#8), Esc in cancel dialog (#11), dashboard revenue with cancelled order (#9), new product on price page (#10), driver photo (#12), staff add-customer button (UI-8).
- **Flutter `mobile/test`:** empty-phone mapper (H3), timeout on three sheets (H2), ledger reload + Xem thêm (#7), proactive refresh / `/me` null / restore-vs-login (#13, FL-4, FL-5), Today refresh vs confirm (FL-7).
- **Unit/contract:** integer prices (#14); #16 files use `requireRole`/`requireSession`.

## 12. Not inspected
- **Web:** schedule, my-schedule, reports/shifts, vehicles, assets UI, settings, config/prices, audit-log, change-password, `auth-provider.tsx`, `ui-store.ts`, inventory JSX after line 210, `src/components/driver` beyond `src/app/driver/page.tsx`.
- **Server:** `src/lib/tenant.ts` effect, `/api/orders/counts`, `order-filters.ts`, audit-log GET, auth login/refresh/password internals, price routes under concurrency, assets/maintenance races, factory settings.
- **Flutter:** staff, products, customer CRUD, audit log, shift report/review screens, schedule/shift-report contracts vs server, Android/iOS config, `integration_test`.
- **Execution:** no tests, builds or queries run.
