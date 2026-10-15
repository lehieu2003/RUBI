## race-condition-auditor report (verbatim content from agent)

**Architecture found:** Mutations are route handlers src/app/api/**/route.ts; order create is server action saveOrder in src/lib/actions/orders.ts, reused by POST /api/orders for mobile. Prisma $transaction at default isolation everywhere except payments (Serializable, src/app/api/customers/[id]/payments/route.ts:65). No row locks (no FOR UPDATE/raw SQL except health). Stock is a per-day running balance (src/lib/inventory.ts:31-53). Web: orders page uses TanStack Query (src/lib/query-provider.tsx:12-14: staleTime 60s, no refetchOnWindowFocus, default mutation retry); other pages manual fetch+useState. Flutter calls same endpoints with 15s timeout (mobile/lib/core/constants/api_constants.dart:14).

**Not covered:** price override/global price routes (upserts on unique keys, grep only), assets/maintenance, factory settings, src/components/driver beyond src/app/driver/page.tsx, Flutter internals. No tests or queries run.

### Confirmed bugs

#### RACE-1 Concurrent double-settlement of the same order records debt and stock deduction twice — Critical (High Confidence; assumes Postgres default READ COMMITTED, no isolationLevel at reconcile/route.ts:112)
- Location: src/app/api/orders/[id]/reconcile/route.ts:37-46, 62-65, 76-83, 91
- Interleaving: two reconcile requests (web /settle + mobile settlement_screen.dart, or two tabs). Tx A, Tx B both plain findFirst @:37, both see DELIVERED @:44. A updates @:62; B blocks on row lock; A commits; B's update({where:{id}}) @:62 succeeds (no status predicate), inserts DEBT @:76, changeStock(-qty) @:91.
- Evidence: `if (order.status !== 'DELIVERED')` (:44) on non-locking read; `tx.order.update({ where: { id }, data: { status: 'COMPLETED' ...` (:62-64). Missing: no status in write predicate, no FOR UPDATE, no unique ledger↔order link (CustomerDebtLedger prisma/schema.prisma:216-226 has no orderId/unique). Web button disabled (src/app/settle/page.tsx:509) but not cross-client.
- Expected one DEBT + one stock deduction; Actual two each.
- Fix: updateMany({ where: { id, status: 'DELIVERED' } }) inside tx, 409 if count===0 before ledger/stock — pattern already at confirm/route.ts:50-51.
- Regression: tests/integration/reconcile-race.test.ts against throwaway Postgres; Promise.all of two reconciles; assert 1 DEBT row and stock decremented once.

#### RACE-2 Status endpoint can reopen or cancel an order settlement just completed — Critical (High Confidence)
- Location: src/app/api/orders/[id]/status/route.ts:47-63, 67-81; reconcile/route.ts:62-65
- Interleaving: (reopen) staff PATCH status reads existing.status=DELIVERED @status:47; reconcile commits COMPLETED+DEBT+stock; staff prisma.order.update({ where: { id, factoryId } }) @status:68 overwrites COMPLETED with PENDING/SHIPPING/DELIVERED; later re-reconcile charges debt again. (reverse) reconcile reads DELIVERED @:37; staff cancels @status:68; reconcile update @:62 overwrites CANCELLED → COMPLETED and books debt for cancelled order.
- Evidence: status:55 `if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED')` separate read; status:69 `where: { id, factoryId: session.factoryId }`. Tests only check source text (tests/api/order-status.test.ts:37-39).
- Fix: updateMany with status notIn ['COMPLETED','CANCELLED'] in predicate, 409 on count 0.

#### RACE-3 Status change from a stale screen overwrites a driver's delivery (lost update) — High (Confirmed)
- Location: status/route.ts:12-15, 67-77; confirm/route.ts:50-55; src/app/orders/page.tsx:306-317; query-provider.tsx:12-14
- Staff list cached 60s showing SHIPPING; driver confirms (DELIVERED, deliveredAt); staff picks PENDING/SHIPPING; status:68 writes and deliveredAt: null (:76).
- Evidence: StatusSchema (:12-15) has no expected status/updatedAt; Order.updatedAt (schema.prisma:182) never compared.
- Fix: send expected status/updatedAt, include in predicate, 409.

#### RACE-4 Order create and payment endpoints have no idempotency; timeout + retry duplicates them — Critical (High Confidence for server gap)
- Location: src/lib/actions/orders.ts:210-230 (via src/app/api/orders/route.ts:80); src/app/api/customers/[id]/payments/route.ts:51-53; src/app/api/deposits/shells/route.ts:86-101; src/app/api/inventory/route.ts:93-94
- Mobile POST order commits @orders.ts:211 but response > 15s timeout; user retries → second create. Same for payments (Serializable check @payments:48 passes twice if each < half remaining debt), shell ADD, stock ADD.
- Evidence: no idempotency key in bodies (orders.ts:126-136, payments/route.ts:24); no unique business key on Order/CustomerDebtLedger (schema.prisma:175-226). Web buttons guarded (order-entry-drawer.tsx:74,182; payment-dialogs.tsx:143; deposits/shells/page.tsx:347; inventory/page.tsx:512).
- Fix: client idempotency key stored in a unique column; return existing on conflict.

#### RACE-5 Bulk-assign to a driver being deactivated leaves orders on an inactive driver — Medium (Confirmed)
- Location: src/app/api/orders/bulk-assign/route.ts:35-42, 53-62; src/app/api/staff/[id]/route.ts:17-21
- Driver active check @bulk-assign:35 outside tx; manager deactivate + unassignOpenOrders @staff:18 commits; updateMany @:57 sets driverId to deactivated driver.
- Fix: check inside tx with lock, or re-check after.

#### RACE-6 Per-shift registration cap exceeded by concurrent sign-ups — Medium (Confirmed)
- Location: src/app/api/schedule/my/route.ts:131-141, 149-153; unique per user schema.prisma:169
- count @:131 and upsert @:149 separate, no tx/lock.
- Fix: Serializable tx or advisory lock per (factory,date,shift).

#### RACE-7 Payroll month lock is check-then-act; shifts can change in a closed month — Medium (Confirmed)
- Location: src/lib/payroll-lock.ts:19-27; src/app/api/schedule/assignments/route.ts:99, 135; schedule/my/route.ts:103, 149; schedule/review/route.ts:32, 38; src/app/api/reports/shifts/lock/route.ts:36-51
- Staff passes rejectIfMonthLocked @my:103; manager lock counts 0 pending @lock:36, upserts lock @:47; staff upsert creates PENDING @my:149 → locked month with PENDING that review (:32) can't resolve.
- Evidence: lockedMonths plain findMany (payroll-lock.ts:8); no shared tx.
- Fix: shared advisory lock per factory+month.

#### RACE-8 First stock movement of the day fails when two writers race to create today's row — Low (Confirmed)
- Location: src/lib/inventory.ts:33-52; prisma/schema.prisma:248
- Both findFirst @:33 see yesterday; both create today @:46; second hits unique (productId,date) → tx rollback → "Đối soát thất bại".
- Fix: upsert on productId_date or catch P2002 and retry.

#### RACE-9 Order drawer: stale price response + quantities wiped after slow price load — Medium (Confirmed)
- Location: order-entry-drawer.tsx:41-56; order-matrix.tsx:49-53, 114
- Select A then B quickly; A resolves last → setPrices(A) @:51 while B shown (server reprices so stored order is correct). Quantities typed before resolve erased by setValues(new Map()) @:53.
- Fix: latest-id ref guard; reset quantities synchronously at selection.

#### RACE-10 Inventory count history: older response overwrites newer filter — Low (Confirmed)
- Location: src/app/inventory/page.tsx:66-97; setHistory/setHistorySummary @:81-83; no ignore flag in effect :95-97; load-more not disabled across filter change.

#### RACE-11 Product uniqueness only checked in app code — Low (Confirmed)
- Location: src/app/api/products/route.ts:46-60; prisma/schema.prisma:72-92 (only @@index([factoryId])); order-matrix.tsx:26 find → one duplicate unreachable.
- Fix: unique index (factoryId, lower(name), sizeKg) via migration.

### Hypotheses
- RACE-H1 Serializable payment conflicts (P2034) surface as 500 with no retry — src/app/api/customers/[id]/payments/route.ts:65, 83-86.
- RACE-H2 Redis rate-limit incr + pexpire not atomic; key may never expire — src/lib/rate-limit.ts:92-95.
- RACE-H3 Driver page stale after lost confirm race; 409 rolls back to SHIPPING instead of refetch — src/app/driver/page.tsx:78-103 (server safe, confirm/route.ts:50-51).

### Handed off
- flutter: mobile submit buttons disabled while pending? behaviour on 15s timeout — mobile/lib/core/constants/api_constants.dart:14
- ui-logic: if saveOrder throws (rejected server action), isSaving never reset, drawer locked — order-entry-drawer.tsx:91-93

### Test setup note
Existing tests (tests/run-tests.ts, node:test) are source-regex checks with no DB (e.g. tests/api/order-status.test.ts:6-39). No concurrency/integration tests exist. All DB regression tests need a throwaway Postgres; never the Supabase DB in .env (production).
