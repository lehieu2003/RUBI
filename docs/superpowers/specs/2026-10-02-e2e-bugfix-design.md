# IceFlow SaaS — Spec: Fix 20 bug từ vòng E2E test 2026-10-02

**Nguồn:** E2E black-box GUI test toàn hệ thống (báo cáo: `docs/e2e-bug-report-2026-10-02.md`, evidence: `gui-test-screenshots/`)
**Quyết định đã chốt với user:** fix toàn bộ P0+P1+P2; chặn COMPLETED qua dropdown (COMPLETED chỉ đạt qua Đối soát); tạo mới endpoint `/api/d/[token]`.
**Nguyên tắc:** không đổi schema DB, không đụng RBAC guards / multi-tenancy / logic reconcile (đã đúng). Fix surgical theo root cause đã xác minh trong source.

## A. Data integrity & order flow (P0)

### A1. Bug #1 — Tạo đơn xong list không refresh
- **Root cause:** `src/components/order/order-entry-drawer.tsx` — sau `saveOrder` thành công chỉ toast + close; không invalidate TanStack Query. `revalidatePath('/orders')` trong server action vô dụng với client-side query.
- **Fix:** dùng `useQueryClient()`, sau thành công: `invalidateQueries({queryKey:['orders']})` + `router.refresh()` (che cả mount ở Dashboard RSC).
- **Accept:** tạo đơn xong, đơn mới hiện trong list trong ~1s không cần reload.

### A2. Bug #2 — saveOrder trả Prisma Decimal → serialization error
- **Root cause:** `src/lib/actions/orders.ts` `saveOrderInternal` trả nguyên entity với `include: {customer, orderItems:{include:{product}}}` — `total/unitPrice/lineTotal` là Decimal.
- **Fix:** trả plain object `{ id, status, total: number, createdAt: ISO string, customerName }`. Type `SaveOrderResult` cập nhật theo.
- **Accept:** không còn lỗi "Decimal objects are not supported" trong log/dev overlay khi tạo đơn.

### A3. Bug #3 — Crash `orders.map is not a function` sau chốt đơn
- **Root cause:** `src/app/settle/page.tsx:169` — refetch sau reconcile `setOrders(ordersData)` đặt nguyên envelope `{success,data}` (fetch đầu line 83 có unwrap, refetch thì không).
- **Fix:** thêm helper `unwrapEnvelope(json)` export từ `src/lib/api-response.ts`; settle dùng lại cho cả 2 chỗ fetch. (Các trang khác dùng idiom copy-paste được dần thay bằng helper khi đụng tới — không refactor hàng loạt.)
- **Accept:** chốt đơn xong → list tự cập nhật, không crash.

### A4. Bug #4 — COMPLETED trực tiếp không ghi nợ/kho (lệch đường reconcile)
- **Root cause:** `src/app/api/orders/[id]/status/route.ts` nhận `COMPLETED` và chỉ update status — không ledger, không inventory; dialog UI hứa "cập nhật sổ công nợ" là sai.
- **Fix (đã chốt):** schema status route chỉ nhận `PENDING|SHIPPING|DELIVERED|CANCELLED`; request `COMPLETED` → 400 "Đơn hoàn thành phải qua Đối soát". UI dropdown trong orders page bỏ option "Hoàn thành" + bỏ dialog confirm hoàn thành.
- **Accept:** dropdown không còn "Hoàn thành"; curl PATCH status=COMPLETED → 400. Reconcile (settle) vẫn tạo ledger + trừ kho như cũ.

### A5. Bug #5 — Báo cáo công nợ = 0
- **Root cause:** `src/app/api/reports/debt/route.ts:34` — `outstanding = totalPayment - totalDebt` đảo dấu; nợ thật → số âm → bị filter `> 0` lọc sạch.
- **Fix:** `outstanding = totalDebt - totalPayment`.
- **Accept:** `/reports/debt` hiển thị 4 khách nợ (3 gối đầu + 45.000đ từ reconcile test), tổng ≈ 6.795.000đ.

## B. Driver (P0)

### B1. Bug #6 — `/d/[token]` 404
- **Root cause:** `src/app/d/[token]/page.tsx:52` fetch `/api/d/${token}` — route không tồn tại.
- **Fix:** tạo `src/app/api/d/[token]/route.ts` GET: tìm driver theo token (`prismaAuth.driver.findUnique`), trả **đúng shape page đang đọc**: `{ orders, driverName }` ở top-level (không bọc envelope), orders serialize Decimal như `/api/driver/orders` (status SHIPPING/DELIVERED, hôm nay). Token sai → 404 `{error}`.
- **Accept:** mở `/d/<token-của-tai-xe-2>` → thấy driver view; token sai → "Link không hợp lệ hoặc đã hết hạn".

### B2. Bug #7 — GPS + deliveredAt không lưu khi tài xế xác nhận
- **Root cause:** `src/app/api/orders/[id]/confirm/route.ts` update chỉ có `status` + `deliveryGps` — **thiếu `deliveredAt`**. GPS null là hành vi design D-09 (geolocation fail) nhưng client im lặng.
- **Fix:** route thêm `deliveredAt: new Date()`. `DeliveryCard` + `/d/[token]` handleConfirm: khi geolocation fail → vẫn confirm nhưng toast cảnh báo "Không lấy được vị trí GPS".
- **Accept:** xác nhận giao → DB có `delivered_at` NOT NULL; GPS fail → có toast cảnh báo.

## C. Impersonation catch-22 (P1)

- **Root cause chung:** `src/middleware.ts:57-64` chặn 403 **mọi** non-GET `/api/*` khi có cookie `impersonate_token` → block cả `/api/admin/impersonate/end` (POST) lẫn `/api/auth/logout` (POST). `signOut` (`auth-provider.tsx:108`) fire-and-forget không check `res.ok` → fail im lặng. `canAccessPath` từ chối SUPER_ADMIN trên mọi tenant path kể cả khi impersonating → quick links + direct nav đều đá về `/admin/dashboard?error=unauthorized`.
- **Fix:**
  1. Middleware: exempt `/api/auth/logout` và `/api/admin/impersonate/end` khỏi block read-only.
  2. Middleware: effective role = `ADMIN` khi (session.role === 'SUPER_ADMIN' && có impersonate_token && path tenant) cho bước `canAccessPath`; redirect unauthorized khi impersonating → `/dashboard`.
  3. `signOut`: check `res.ok`, fail → toast error "Không thể đăng xuất".
- **Accept:** impersonate → bấm "Đơn hàng" vào được `/orders` của tenant; write API vẫn 403; "KẾT THÚC PHIÊN HỖ TRỢ" thành công (ended_at NOT NULL); Thoát sau impersonation hoạt động.

## D. Billing webhook (P1)

### D1. Bug #11 — Payment note không định danh tenant
- **Root cause:** `src/components/billing/VietQRCode.tsx` tự build note `THANH TOAN ICEFLOW {factoryName||'KHACH HANG'} {month}`; `BillingScreen` không truyền factoryName; `vietqr-template.ts formatPaymentNote()` có sẵn nhưng không ai dùng. Webhook chỉ match được qua regex/scan tên.
- **Fix:** `VietQRCode` nhận `factoryName` + `subscriptionId`, note = `formatPaymentNote(...)`; `BillingScreen` truyền giá trị thật từ subscription/factory đã fetch. Webhook (`src/app/api/webhooks/payment/route.ts`): thêm bước resolve **subscriptionId prefix 8 ký tự** từ note (match trực tiếp) trước khi fallback regex/scan tên.
- **Accept:** billing hiển thị note "Thanh toan IceFlow <tên xưởng> - <8 ký tự subscription id>"; POST webhook giả lập nội dung note đó → subscription +30 ngày.

## E. Query "hôm nay" & số liệu (P1)

### E1. Bug #12 — Settle counters 0 + map header 0
- **Root cause:** `/settle` fetch chỉ `status=DELIVERED` rồi lấy đó làm cả 3 counter ("tổng đơn trong ngày" = số đơn DELIVERED; "đã đối soát" luôn 0). Map header đếm từ response đã filter `deliveryGps != null` nhưng label ghi "đơn hàng hôm nay".
- **Fix:** settle fetch tất cả đơn hôm nay (không filter status), derive: chờ đối soát = DELIVERED count, đã đối soát = COMPLETED count, tổng = all. Map page: label số 1 đổi thành "đơn có GPS hôm nay" (đếm đúng từ data có sẵn) hoặc fetch thêm total — chọn đổi label (rẻ, không thêm query).
- **Accept:** settle: tổng = số đơn hôm nay thực tế; đã đối soát tăng sau mỗi lần chốt. Map header không còn số liệu misleading.

### E2. Bug #13 — Dashboard breakdown sai
- **Root cause:** dashboard tính `chờ = total - delivered` → COMPLETED/SHIPPING/PENDING dồn vào "chờ".
- **Fix:** đếm đúng từng status; hiển thị "X đã giao, Y chờ giao" với chờ = PENDING + SHIPPING (đúng ngữ nghĩa vận hành).
- **Accept:** với data test (1 PENDING, 1 DELIVERED, 3 COMPLETED) → "1 đã giao, 1 chờ".

## F. UX / A11y / Polish (P1 + P2)

| # | Fix | File |
|---|-----|------|
| #14 | Re-verify Enter submit login (form markup đúng; instrument bắt network request). Nếu tái hiện → debug tiếp | `src/app/(auth)/login/page.tsx` |
| #15 | QuickActions lọc theo role: render từ `getVisibleTenantRoutes(role)` map sẵn có | `src/components/dashboard/quick-actions.tsx` |
| #16 | Orders list API include `driver{name}`; settle dùng `driver?.name` (đã có sẵn fallback) | `src/app/api/orders/route.ts` |
| #17 | `role="dialog" aria-modal="true" aria-label` cho modal Thêm khách + form Chốt đơn | `src/app/customers/page.tsx`, `src/app/settle/page.tsx` |
| #18 | Hourly chart tooltip chỉ hiện khi hover (state hoverIndex, default null) | `src/components/dashboard/hourly-chart.tsx` |
| #19 | Tenants table: bọc `overflow-x-auto` + `whitespace-nowrap` cột action | `src/components/admin/tenant-table.tsx` |
| #20 | Schedule cell thêm `title={driverName}` | `src/components/schedule/calendar-grid.tsx` |

## Verification & testing

1. `npm run typecheck`, `npm run lint`, `npm test` xanh.
2. Re-test E2E thủ công bằng browser đúng các luồng: A1-A5, B1-B2, C, E1-E2 + login Enter (#14).
3. Smoke: các luồng previously-passing không regress (login/roles, lên đơn, khách hàng, kho, schedule, super admin dashboard).

## Không làm trong đợt này

- Đổi schema/migration DB.
- Refactor toàn bộ client fetch sang helper chung (chỉ làm nơi đụng tới).
- Deploy/infra (rate-limit multi-instance, webhook secret bắt buộc — đã ghi trong report để làm riêng).
