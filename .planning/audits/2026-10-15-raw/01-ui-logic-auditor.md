## ui-logic-auditor report (verbatim from agent)

**Architecture found:** Next.js 15 App Router. Client-component pages: src/app/{orders,driver,settle,customers,deposits/shells,inventory,reports/debt}/page.tsx; RSC: src/app/dashboard/page.tsx, src/app/customers/[id]/page.tsx, src/app/orders/[id]. Components in src/components/{order,driver,debt,dashboard,pricing,ui}; Zustand stores src/stores/{order-store,ui-store}.ts; server actions src/lib/actions/orders.ts. Pages call REST via fetch(API_ENDPOINTS.*); TanStack Query used only on /orders and /customers. **React Hook Form is not used anywhere** — all forms are useState. RBAC: src/middleware.ts + src/lib/rbac/permissions.ts. Tests: custom tsx runner tests/ (unit/API) + Playwright e2e/.

**Not covered:** schedule, my-schedule, reports/shifts, vehicles, assets, settings, config/prices, audit-log, change-password, auth-provider.tsx, query-provider.tsx defaults, ui-store.ts, inventory JSX after line 210.

### Confirmed bugs

#### UI-1 Quantities typed right after picking a customer are wiped when the customer's prices arrive — High (Confirmed)
- Location: src/components/order/order-entry-drawer.tsx:43, :47-53, :146-160; src/components/order/order-matrix.tsx:48-53, :110-111
- Evidence: drawer:43 `useOrderStore.getState().setCustomer(selectedCustomer, new Map());` (matrix renders immediately, :146); order-matrix.tsx:49-51 autofocus first input on mount; drawer:47-53 `const [priceList, sellable] = await Promise.all([...]); ... setValues(new Map());`
- Reproduce: /orders as staff, DevTools Slow 4G; "LÊN ĐƠN NHANH", pick customer, Enter; immediately type 5 in autofocused cell + another product. Expected quantities remain; Actual all cells reset to empty and total 0đ when prices land.
- Root cause: quantity map cleared after the await instead of at selection.
- Fix: clear values/prices synchronously before the await; never reset values after prices resolve.
- Regression test: Playwright e2e/order-drawer.spec.ts with page.route delay on server-action POST; assert input keeps value.

#### UI-2 Driver proof-of-delivery photo is reported saved but never uploaded — Medium (Confirmed)
- Location: src/components/driver/DeliveryCard.tsx:53-62, :115-127; src/app/driver/page.tsx:84-88
- Evidence: DeliveryCard:58-59 `setPhotoPreview(reader.result as string); toast({ type: 'success', title: 'Đã lưu ảnh bằng chứng giao hàng' });`; :125 `Đã đính kèm bằng chứng`; driver/page.tsx:87 `body: JSON.stringify({}),`
- Reproduce: driver /driver → Chụp ảnh → toast "saved" → confirm → reload; photo gone, never sent.
- Fix: upload with confirm, or remove/relabel.
- Regression: new e2e/driver-delivery.spec.ts.

#### UI-3 Dashboard "recent orders" stays stale after creating an order from the dashboard — Medium (Confirmed)
- Location: src/components/dashboard/dashboard-client.tsx:53, :198; order-entry-drawer.tsx:97-100; src/app/dashboard/page.tsx:116, :137
- Evidence: dashboard-client.tsx:53 `const [orders] = useState(initialOrders);`; drawer:97-100 router.refresh() comment says refreshes RSC pages like dashboard.
- Expected new order in table; Actual KPIs update but table stale until full reload.
- Fix: use orders prop directly.

#### UI-4 Dashboard "Doanh số hôm nay" counts cancelled orders — Medium (Confirmed)
- Location: src/app/dashboard/page.tsx:39-44, :83-90; dashboard-client.tsx:57-60, :72-83
- Evidence: page.tsx:41 `where: { factoryId, createdAt: { gte: startOfVietnamToday() } },` no status filter; client:57-60 reduce sums all totals. Yesterday's sum :83-90 same.
- Fix: exclude CANCELLED from revenue sums.

#### UI-5 Customer price page only lists products named "Đá Bi"/"Đá Viên" — Medium (Confirmed)
- Location: src/components/pricing/customer-price-form.tsx:117-125; contrast order-matrix.tsx:17-22; e2e/order-drawer.spec.ts:21,:32 ("Đá Mi"), e2e/products.spec.ts:17-21
- Evidence: customer-price-form.tsx:117-118 `products.filter((p) => p.name === 'Đá Bi')` / `'Đá Viên'`.
- Impact: overrides impossible for other products; billed global price.
- Fix: group by distinct product.name like buildGrid.

#### UI-6 Failed price-override save wipes earlier successful edits from the screen — Medium (Confirmed)
- Location: customer-price-form.tsx:35, :58-63, :73-76, :86-102
- Evidence: :35 `useState<PriceMap>(overridePrices);`; :75 `setLocalOverrides(overridePrices);` on failure (page-load snapshot). Remove path :86 does it right.
- Fix: snapshot before optimistic update and restore that.

#### UI-7 Esc in cancel-reason dialog closes order drawer, leaves dead "Xác nhận hủy" button — Medium (Confirmed)
- Location: src/components/ui/drawer.tsx:47-53; src/app/orders/page.tsx:287-289, :298-300, :306-307, :703, :847-882
- Evidence: drawer.tsx:50-51 document-level Esc → onClose(); orders/page.tsx:307 `if (!selectedOrderId) return;`; :874 onClick updateOrderStatus('CANCELLED', cancelReason)
- Reproduce: open order, choose Đã hủy, press Esc → drawer closes, dialog stays; type reason, click confirm → nothing happens.
- Fix: dialog handles Esc with stopPropagation; close dialog when drawer closes.

#### UI-8 Add-customer hides the server's reason; button shown to STAFF who are always refused — Low (Confirmed)
- Location: src/app/customers/page.tsx:69, :78-80, :114-120; src/app/api/customers/route.ts:37, :52-53; src/lib/rbac/permissions.ts:16
- Evidence: page:69 `if (!res.ok) throw new Error('Không thể tạo khách hàng');`; route:37 `requireRole(['ADMIN'])`; :53 duplicate-code message.
- Fix: show json.error; render button only for ADMIN.

### Hypotheses
#### UI-H1 Closed-but-not-reset drawer can submit previous customer's quantities for the next customer (High Confidence)
- Location: src/stores/order-store.ts:63-65; order-entry-drawer.tsx:24-28, :41-53, :72-91, :180-182; drawer.tsx:89
- closeDrawer resets store only; drawer local values/prices/stock/saveError survive since OrderEntryDrawer stays mounted. Reopen → pick B → until loadCustomerPrices(B) resolves, A's quantities shown and confirm enabled; Enter creates order for B with A's quantities. If loadCustomerPrices rejects, unhandled, stale state persists.
- Unverified: realistic timing / rejection frequency.

### Handed off
- race: out-of-order customer price responses (drawer:47-53)
- race: login Enter calls requestSubmit() on top of native submit, double signIn (src/app/(auth)/login/page.tsx:57-61, :85)
- race: driver confirm no in-flight guard; rollback forces SHIPPING even if server accepted (src/app/driver/page.tsx:78-102)
- api: shell deposit ADD parseInt raw input; negatives/empty reach server (src/app/deposits/shells/page.tsx:77-78)
- api: inventory ADD Number(quantity) allows decimals/negatives (src/app/inventory/page.tsx:123, :136)
- api: settlement allows actual > ordered quantity; verify server caps and recomputes debt (src/app/settle/page.tsx:480-488, :191-200)
