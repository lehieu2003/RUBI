## api-flow-auditor report (verbatim content from agent)

**Architecture found:** Route handlers src/app/api/**, plus server action saveOrder in src/lib/actions/orders.ts (web drawer calls directly; POST /api/orders reuses it). Auth: JWT cookie or Bearer; getSession re-reads isActive/role/mustChangePassword from DB (src/lib/auth.ts:64-76). Middleware only gates pages, never /api/* (src/lib/rbac/permissions.ts:13-30); each handler uses requireRole. Money columns Decimal(10,2). Unit tests tests/** mostly source-level; Playwright e2e/** against throwaway local Postgres enforced by e2e/support/env.ts:5-20.

**Not traced:** src/lib/tenant.ts Prisma extension effect; /api/orders/counts, order-filters.ts; customers POST; audit-log GET; auth login/refresh/password; Flutter screen internals.

Debt report change (latest commit) verified correct: src/app/api/reports/debt/route.ts:27-42 DEBT−PAYMENT per customer, same as payments/route.ts:39-46 and ledger/route.ts:31-37.

Authorization traced and held: settlement, payments, ledger, debt report, inventory, prices, shells, staff, schedule admin, payroll lock = ADMIN only; order entry/status/bulk-assign = ADMIN/STAFF incl. server action (actions/orders.ts:19-28); driver confirm checks ownership (orders/[id]/confirm/route.ts:32-34,51).

### Confirmed bugs

#### API-1 Mid-day stock count double-subtracts orders on trucks when they are later settled — High (High Confidence; business rule inferred)
- Chain: src/app/inventory/page.tsx:165-173 (SET) → src/app/api/inventory/route.ts:98-109 → src/lib/inventory.ts:41,50 (balance replaced) → later src/app/api/orders/[id]/reconcile/route.ts:91 deducts again.
- Design: stock leaves the books only at settlement (src/lib/actions/orders.ts:76-78, src/lib/inventory.ts:55-58), so books include bags on trucks/at customers.
- Evidence: inventory/route.ts:98-99 `const bookQuantity = (await stockOnHand(tx, [productId]))...; const counted = await changeStock(tx, productId, { set: quantity });`; reconcile:91 `await changeStock(tx, orderItem.productId, { add: -itemInput.actualQty });`
- Reproduce: book 100; order 20 → SHIPPING; count store 80 → StockCount book=100 counted=80 (20 logged as loss), balance 80; settle 20 → 60. Expected 80 and no loss.
- Root cause: SET ignores reservedByOpenOrders (src/lib/inventory.ts:60-74).
- Fix: in SET store counted + reservedByOpenOrders, or compare count vs book − reserved.

#### API-2 Dashboard revenue includes cancelled orders and uses ordered not delivered amount — Medium (Confirmed) [same as UI-4]
- src/app/dashboard/page.tsx:39-44, :83-90; dashboard-client.tsx:57-60. Evidence page.tsx:84-88 no status filter.

#### API-3 Settlement leaves Order.total at ordered amount; order screens/exports disagree with debt — Medium (Confirmed)
- Chain: src/app/settle/page.tsx:191-200 → reconcile/route.ts:62-84; read paths src/app/api/orders/route.ts:48, settle/page.tsx:285, src/app/api/customers/debt-export/route.ts:54, dashboard.
- Evidence: reconcile:62-65 `data: { status: 'COMPLETED', completedAt: new Date() }` — total never written; delivered total computed :68-72 only goes to ledger :76-82.
- Repro: 10×20,000 settled with 8 → DEBT 160,000, order total 200,000.

#### API-4 Payments/orders ≥ 100,000,000đ fail with 500 though contract allows them — Medium (Confirmed from schema; overflow not observed by running)
- Chain: src/components/debt/payment-dialogs.tsx:64-68 → payments/route.ts:20,51-53 → prisma/schema.prisma:220
- Evidence: contracts/customers.ts:48 `.max(10_000_000_000, 'Số tiền quá lớn')` vs schema.prisma:220 `amount Decimal @db.Decimal(10, 2)`; also Order.total, lineTotal (schema.prisma:179,208).
- Fix: widen to Decimal(14,2) via Prisma Migrate or lower Zod max.

#### API-5 Decimal price accepted → debt can never be fully paid — Medium (Confirmed)
- Chain: src/components/pricing/product-table.tsx:60-64, customer-price-form.tsx:48 → src/app/api/prices/global/route.ts:10,78, src/app/api/prices/customer/override/route.ts:11,48 → reconcile:71-80 DEBT → payment contract contracts/customers.ts:46 `.int(...)`.
- Evidence: prices/global/route.ts:10 `price: z.number().positive(),`. "Thu đủ" sends String(12500.5) → digits-stripped 125005 (payment-dialogs.tsx:54,117).
- Fix: .int() on all price inputs.

#### API-6 Settlement doesn't reject duplicate/missing lines — Low (only via hand-made ADMIN request; web/mobile send each line once: settle/page.tsx:180-194, mobile/lib/features/orders/data/orders_repository_impl.dart:155)
- reconcile/route.ts:9-14, :48-51, :68-72, :87-92. Evidence :49 checks membership only.

#### API-7 Asset "next due" keeps an obsolete earlier date — Medium (Confirmed)
- src/app/assets/page.tsx:204 → src/app/api/assets/[id]/maintenance/route.ts:82-91 (append only) → src/app/api/assets/route.ts:26-41, src/app/dashboard/page.tsx:94-103
- Evidence: assets/route.ts:27-29 `orderBy: { dueAt: 'asc' }, where: { dueAt: { not: null } }, take: 1`
- Fix: latest record per maintenance type by performedAt, then soonest.

#### API-8 Cancelling an order overwrites its original note — Low (Confirmed)
- src/app/api/orders/[id]/status/route.ts:77-79 `notes: parsed.data.cancellationReason ? \`[HỦY: ...]\` : undefined,`

### Hypotheses
- API-H1 Inactive customers with debt missing from debt export — src/app/api/customers/debt-export/route.ts:18 vs reports/debt/route.ts:23-25; no caller of DEBT_EXPORT found (maybe dead code).
- API-H2 Shells returned can exceed shells out; shells screen negative vs dashboard clamped 0 — src/app/api/deposits/shells/route.ts:9-10,94-100, :34-36 vs src/app/dashboard/page.tsx:75. Business rule assumed.
- API-H3 Office can set SHIPPING with no driver — status/route.ts:65-81; driver/orders/route.ts:37-41.

### Handed off
- race: changeStock read-then-create (src/lib/inventory.ts:33-52); shift-limit (schedule/my/route.ts:131-153); payroll lock (schedule/assignments/route.ts:99-146, schedule/review/route.ts:28-44).
- ui-logic: "Thu đủ" breaks on decimal balance — payment-dialogs.tsx:54,117.
