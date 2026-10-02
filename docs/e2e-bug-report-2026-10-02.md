# IceFlow SaaS — Báo cáo E2E Testing & Bug List

**Ngày test:** 2026-10-02 · **Môi trường:** local (Docker Postgres :5433 + Next dev :3001), data seed demo
**Phương pháp:** Black-box GUI testing qua browser automation (IAB), cross-validate DOM + screenshot. Ảnh evidence: `gui-test-screenshots/`.

## Phạm vi đã test (PASS)

| Luồng | Kết quả |
|---|---|
| Landing page render | ✅ |
| Login 4 roles + auto-redirect theo role | ✅ (trừ lỗi Enter — Bug #1) |
| Logout (bình thường) | ✅ |
| RBAC middleware: staff→/settle, ketoan→/config/prices bị chặn | ✅ |
| Fuzzy search khách hàng + chọn bằng Enter | ✅ |
| Lên đơn: matrix 2×3, tính tổng đúng (276.000đ), tạo đơn vào DB | ✅ (trừ Bug #2, #3) |
| Đổi trạng thái qua dropdown + confirm dialog | ✅ (nhưng Bug #4) |
| Trang chi tiết đơn RSC + metadata | ✅ |
| Tạo khách hàng mới | ✅ |
| Đối soát (reconcile): DB ghi đúng actualQty → COMPLETED → DEBT 45.000đ → trừ kho 200→197 | ✅ DB đúng (nhưng Bug #6) |
| Kho lạnh: hiển thị 197 bao sau trừ | ✅ |
| Vỏ bao: số học cọc đúng | ✅ |
| Lịch trình: grid tuần, phân ca optimistic + toast | ✅ |
| Đội xe, Cài đặt + tab Nhân sự | ✅ |
| Driver app: login → /driver, xác nhận giao → DELIVERED | ✅ (trừ Bug #12) |
| Billing screen: PRO, 2/4 tài xế, 150.000đ/tháng | ✅ render |
| Super admin: dashboard, tenants, tenant detail, impersonation start + overlay | ✅ (trừ #15, #16) |

**Không test được:** luồng đăng ký factory mới (bị chặn vì không logout được sau impersonation — Bug #16b); In phiếu K80 (native print dialog); Chụp ảnh driver (IAB không hỗ trợ file chooser).

---

## BUG LIST

### 🔴 P0 — Crash / tính năng hỏng hoàn toàn / dữ liệu sai nghiêm trọng

**BUG #1 — Tạo đơn xong, danh sách không refresh**
- Vị trí: `/orders` → drawer "Lên đơn nhanh" → Xác nhận
- Evidence: toast "Đã lên đơn thành công" nhưng list vẫn 4 đơn; DB có đơn (t3_order_created.png, t3_after_reload.png — reload mới thấy)
- Nguyên nhân (sơ bộ): `saveOrder` server action chỉ gọi `revalidatePath('/orders')` vô dụng với TanStack Query client-side; không có `invalidateQueries(['orders'])` sau khi tạo
- Hậu quả: nhân viên tưởng tạo thất bại → nhập lại → **đơn trùng**

**BUG #2 — saveOrder trả Prisma Decimal → lỗi serialization**
- Evidence: dev overlay "3 Issues", log: "Only plain objects can be passed to Client Components... Decimal objects are not supported" (`total`, `unitPrice`, `lineTotal`)
- Vị trí: `src/lib/actions/orders.ts` (saveOrder return nguyên Prisma object)

**BUG #3 — Chốt đơn xong trang CRASH "orders.map is not a function"**
- Vị trí: `/settle` → XÁC NHẬN CHỐT
- Evidence: toast thành công → error boundary đỏ (t7_settle_reconciled.png); DB đã commit đúng; phải bấm Retry mới thấy trang
- Nguyên nhân (sơ bộ): client xử lý sai response envelope sau PATCH reconcile (`orders.map` trên non-array)

**BUG #4 — Chuyển COMPLETED trực tiếp: KHÔNG ghi công nợ, KHÔNG trừ kho**
- Vị trí: `/orders` → detail drawer → dropdown chọn "Hoàn thành" → Xác nhận
- Dialog hứa: "hệ thống sẽ ghi nhận đã giao và **cập nhật sổ công nợ**"
- Thực tế DB: **không có DEBT ledger mới, inventory không đổi** (khác hẳn đường reconcile)
- Hậu quả: 2 đường cùng trạng thái COMPLETED cho ra dữ liệu lệch nhau — báo cáo nợ/lãi sai

**BUG #5 — Báo cáo công nợ hiển thị 0đ / 0 khách**
- Vị trí: `/reports/debt`
- Evidence: "0 khách hàng • Tổng nợ phải thu: 0đ — Không có công nợ" (t10_debt_report.png) trong khi DB có 6.795.000đ nợ (3 nợ gối đầu + 45.000đ vừa chốt)
- Hậu quả: kế toán/chủ xưởng nhìn báo cáo nợ = 0 hoàn toàn — mất tiền thật

**BUG #6 — Driver link `/d/[token]` chết hoàn toàn (404)**
- Vị trí: `/d/[token]/page.tsx:52` fetch `/api/d/${token}` — **route không tồn tại** trong `src/app/api/`
- Evidence: token hợp lệ trong DB (drivers.token) nhưng trang báo "Link không hợp lệ hoặc đã hết hạn" (t19_driver_token_link.png); curl → 404
- Hậu quả: tính năng chia sẻ link cho tài xế không cần tài khoản không dùng được

**BUG #7 — Tài xế xác nhận giao: GPS + delivered_at không lưu**
- Evidence: status → DELIVERED nhưng `delivery_lat/lng/delivered_at` đều NULL trong DB
- Hậu quả: bản đồ GPS trống, thời điểm giao không truy được; nếu geolocation bị từ chối thì im lặng

### 🟠 P1 — Chức năng chính sai / UX hỏng

**BUG #8 — Impersonation không thể điều hướng vào app tenant**
- Evidence: quick link "Đơn hàng" + truy cập trực tiếp `/orders` đều bị đá về `/admin/dashboard?error=unauthorized` (t22_impersonated_*.png)
- Nguyên nhân (sơ bộ): `canAccessPath` chặn SUPER_ADMIN trên mọi tenant path, không có ngoại lệ khi có `impersonate_token` → drawer "TRUY CẬP NHANH DỮ LIỆU NHÀ MÁY" vô dụng

**BUG #9 — Không thể kết thúc phiên impersonation (catch-22)**
- Evidence: bấm "KẾT THÚC PHIÊN HỖ TRỢ" → toast "Thao tác thất bại — Không thể kết thúc impersonate"; DB `impersonation_logs.ended_at` vẫn NULL
- Sơ bộ: middleware chặn mọi non-GET `/api/*` khi có `impersonate_token` — bao gồm chính POST `/api/admin/impersonate/end`

**BUG #10 — Logout sau impersonation: API 200 nhưng session còn nguyên**
- Evidence: bấm Thoát → về landing nhưng hiện "TIẾP TỤC QUẢN LÝ XƯỞNG"; `/register` vẫn redirect về /admin/dashboard; log `POST /api/auth/logout 200`
- Sơ bộ: logout route xóa cookie không đúng (có thể xóa nhầm `impersonate_token`, giữ `auth_token`) — người dùng không thể đăng xuất

**BUG #11 — Payment note không chứa định danh tenant → webhook không match được**
- Evidence: nội dung CK hiển thị "THANH TOAN ICEFLOW KHACH HANG T10/2026" (t15_billing.png)
- Spec template: `Thanh toan IceFlow {factory} - {subId[:8]}`; webhook regex cần fragment sau ICEFLOW để tìm factory
- Hậu quả: tự động kích hoạt gói qua webhook thất bại/không xác định được tenant

**BUG #12 — Map GPS "0 đơn hàng hôm nay" + settle counters = 0**
- Evidence: `/dashboard/map` "0 đơn hàng hôm nay • 0 đơn có GPS" dù 5-6 đơn hôm nay; `/settle` "Đã đối soát hôm nay 0", "Tổng đơn trong ngày 0" dù vừa chốt 1 + 5 đơn tồn tại
- Sơ bộ: nhóm query lọc theo "hôm nay" sai (timezone hoặc sai điều kiện) — ảnh hưởng chéo nhiều trang

**BUG #13 — Dashboard: phân loại trạng thái sai**
- Evidence: "5 đơn: 0 đã giao, 5 chờ" trong khi thực tế 1 PENDING + 1 SHIPPING + 3 COMPLETED; sau đó "1 đã giao, 4 chờ" (COMPLETED bị tính là "chờ")
- Sơ bộ: `chờ = tổng - đã giao` — label sai hoàn toàn

**BUG #14 — Enter không submit form đăng nhập**
- Evidence: Enter trong ô mật khẩu → không có gì xảy ra (không request, không lỗi)
- Với app "speed-first" (30s/đơn) đây là defect nghiêm trọng về UX

**BUG #15 — QuickActions dashboard không lọc theo role**
- Evidence: STAFF thấy "Chốt ca xe", "Cọc vỏ bao", "Nhập kho đá", "Báo cáo công nợ" — bấm sẽ ăn `error=unauthorized`
- Sidebar lọc đúng role nhưng QuickActions không

### 🟡 P2 — Hiển thị / a11y / polish

**BUG #16 — Settle hiển thị raw driver ID** "cmuqcta2j000ai9dm5n86hod1" thay vì "Phạm Văn Tài" (t7_settle.png)
**BUG #17 — Modal thiếu ARIA dialog role**: "Thêm khách hàng", form "Chốt đơn" là div thường — screen reader không nhận, DOM snapshot không thấy `dialog`
**BUG #18 — Chart tooltip đứng yên**: "14h: 0 đơn (0đ)" hiển thị permanent giữa biểu đồ dù không hover
**BUG #19 — Tenants table tràn ngang**: nút "Tạm dừng" bị cắt ("Su..."), scrollbar ngang (t21_admin_tenants.png)
**BUG #20 — Schedule cell cắt tên**: "Phạm Vâ..." không tooltip/title

## Pattern chéo đáng chú ý

1. **Response envelope**: client tự unwrap kiểu `json?.data !== undefined ? json.data : json` → dễ lệch (Bug #3, và các trang dùng useEffect+fetch)
2. **"Hôm nay" query**: settle/map/debt đều lọc sai → khả năng 1 gốc timezone/điều kiện chung (Bug #5, #12)
3. **2 đường COMPLETED**: reconcile (đúng) vs dropdown (thiếu) — cần thống nhất 1 luồng (Bug #4)
4. **Middleware impersonate**: block-everything-non-GET gây 3 bug (#8, #9, #10) — cần allowlist cho /end, /auth/logout và logic canAccessPath biết impersonation

---

## KẾT QUẢ FIX (2026-10-02, branch `fix/e2e-bugfix-batch`)

| # | Bug | Trạng thái |
|---|-----|-----------|
| 1 | Tạo đơn list không refresh | ✅ FIXED + VERIFIED (invalidate + router.refresh) |
| 2 | saveOrder Decimal serialization | ✅ FIXED (plain object) |
| 3 | Crash orders.map sau chốt đơn | ✅ FIXED + VERIFIED (unwrapEnvelope cả 2 fetch) |
| 4 | COMPLETED trực tiếp không ghi nợ/kho | ✅ FIXED + VERIFIED (API 400 + UI bỏ option; COMPLETED chỉ qua Đối soát) |
| 5 | Báo cáo nợ = 0 | ✅ FIXED + VERIFIED (đảo dấu; 4 khách / 6.855.000đ đúng từng đồng) |
| 6 | /d/[token] 404 | ✅ FIXED + VERIFIED (route mới; EmptyState cũng sửa màu trắng-trên-trắng) |
| 7 | GPS + deliveredAt không lưu | ✅ FIXED + VERIFIED (deliveredAt persist; geolocation util + cảnh báo; GPS null = design D-09) |
| 8 | Impersonation không vào được tenant app | ✅ FIXED + VERIFIED (middleware effective role + getSession swap factory + requireRole bypass có kiểm endedAt) |
| 9 | Không kết thúc được impersonation | ✅ FIXED + VERIFIED (exempt /end; toast "Đã thoát impersonate"; ended_at NOT NULL) |
| 10 | Logout 200 nhưng session còn | ✅ FIXED + VERIFIED (exempt /api/auth/logout + signOut check res.ok) |
| 11 | Payment note không định danh tenant | ✅ FIXED + VERIFIED (formatPaymentNote + webhook match sub-id prefix, +30 ngày; old format 404 graceful) |
| 12 | Map/settle counters = 0 | ✅ FIXED + VERIFIED (settle fetch all + derive; map label trung thực) |
| 13 | Dashboard breakdown sai | ✅ FIXED + VERIFIED (5 đã giao / 1 chờ đúng) |
| 14 | Enter không submit login | ⚠️ UNVERIFIABLE — IAB runtime không thực hiện implicit form submission (control page cũng vậy); form markup chuẩn; cần test tay trên Chrome thật |
| 15 | QuickActions không lọc role | ✅ FIXED + VERIFIED (STAFF thấy 0 link cấm) |
| 16 | Settle hiển thị raw driver ID | ✅ FIXED + VERIFIED (orders API include driver.name) |
| 17 | Modal thiếu role="dialog" | ✅ FIXED (customers modal + settle form) |
| 18 | Chart tooltip đứng yên | ✅ FALSE POSITIVE — tooltip chỉ hiện khi hover (đúng chuẩn hidden group-hover:flex) |
| 19 | Tenants table tràn | ✅ FIXED (whitespace-nowrap actions; overflow-x-auto có sẵn) |
| 20 | Schedule tên bị cắt | ✅ FIXED (title attribute) |
| 21 | (mới) Register session sai đến khi reload | ✅ FIXED + VERIFIED (register dùng signUp → checkAuth; identity + nav đúng ngay) |

**Bug mới phát hiện khi fix:** impersonation còn 2 lớp thiếu (requireRole chặn SUPER_ADMIN đọc API; session.factoryId trúng system factory) — đã fix trong cùng batch.

**Deferred (đánh giá reviewer, ngoài scope):** PAYMENT_WEBHOOK_SECRET optional; driver token không có expiry/rate-limit; 5 source-pattern test fail có sẵn trên master; 3 lỗi type có sẵn (inventory TRANSACTIONS, CancelSubscriptionFlow dead-code, map page overload).

## PHỤ: Kiểm tra tính năng xuất báo cáo (2026-10-02, batch 2)

| Điểm | Kết quả |
|---|---|
| Nút xuất (settle / shells / inventory / debt) | ✅ download event fired; mapping headers/values đúng (settle 8/8 — nghi vấn lệch cột ban đầu là do xem code bị cắt) |
| Audit-logs export (server CSV) | ✅ sau fix: BOM + CRLF + escape `"`. Trước fix thiếu BOM + không escape → Excel lỗi font / CSV vỡ khi notes chứa dấu " |
| **Bug mới: Nhập kho đá hỏng hoàn toàn** | ✅ FIXED — page gọi `API_ENDPOINTS.INVENTORY.TRANSACTIONS` (không tồn tại → fetch luôn fail) VÀ gửi sai body (`type/reason`, thiếu `mode` → nếu sửa mỗi URL thì tồn kho bị GHI ĐÈ thay vì cộng). Đã sửa: dùng BASE + `mode: 'ADD'` |
| Dead code `CancelSubscriptionFlow.tsx` (import export không tồn tại) | ✅ xoá — cùng với fix map page, **typecheck về 0 lỗi** (trước là 3 lỗi baseline) |
| Label "XUẤT EXCEL" | ✅ đổi thành "XUẤT CSV" (file thật là .csv có BOM, mở tốt bằng Excel) |

## PHỤ: Batch 3 — "làm hết" các vấn đề còn lại (2026-10-02)

| Hạng mục | Kết quả |
|---|---|
| PAYMENT_WEBHOOK_SECRET | ✅ Fail-closed khi NODE_ENV=production (503 nếu unset) + unit-pattern test |
| 5 test fail có sẵn trên master | ✅ TRIAGED — 77→85/85 PASS: (1) status route cho STAFF là đúng thiết kế → sửa test; (2) schedule API siết về ADMIN+ACCOUNTANT (khớp permission table) + thêm code `DRIVER_LIMIT_EXCEEDED` → sửa code; (3) vehicles/calendar-grid → test stale theo UI redesign → cập nhật test |
| isSubscriptionActive PAID | ✅ PAID hết hạn theo endDate (không cần status flip) + unit test |
| Bug #14 Enter submit | ✅ FIXED + VERIFIED — form auth thêm `onKeyDown` + `requestSubmit()` (implicit submission không đáng tin trên nhiều runtime); Enter submit thật trên browser |
| **Bulk-assign: BUG THẬT mới tìm thấy** | ✅ API chỉ nhận `status: 'SHIPPING'` trong khi workflow văn phòng chọn đơn **Chờ giao (PENDING)** → toast thành công nhưng `assignedCount: 0` âm thầm. Fix: nhận PENDING + SHIPPING, vẫn chặn trạng thái cuối (DELIVERED/COMPLETED/CANCELLED) |
| Rate-limit driver public endpoints | ✅ `/api/d/[token]` 30 req/phút/IP, `/api/driver/orders` 60 req/phút/IP |
| Docs stale | ✅ README ghi đúng Docker standalone + env bắt buộc; TESTING.md viết lại theo node:test |
| Staff CRUD (coverage) | ✅ Tạo user DRIVER qua UI → user + driver profile tự tạo trong DB |
| Super admin actions (coverage) | ✅ Gia hạn (+30 ngày), Sửa giá (200k → 400.000đ/tháng đúng công thức), Tắt/Bật khôi phục |
| Onboarding CSV import (coverage, API) | ✅ imported=1, skipped=2 (trùng mã + thiếu mã) đúng logic |
| Settings tabs (coverage) | ✅ Thông báo / Sản phẩm mẫu / Bảo mật / Giao diện render OK |
| Camera chụp ảnh + In phiếu K80 | ⚠️ Không test được qua harness (file input / native print dialog). Code-level: camera input + capture đã có trong DeliveryCard; print slip + react-to-print verified render ở batch 1 |

**Gates cuối batch:** 85/85 test pass · typecheck 0 lỗi · lint 0 errors.

## PHỤ: Dark mode (2026-10-02)

- **Kiến trúc**: token semantic var-based trong `globals.css` (`@theme inline` → `bg-card`, `text-on-surface`, `bg-container-*`, `border-outline-*`...), 2 bộ giá trị `:root` (light) / `.dark`. Brand blue giữ tĩnh. Print CSS luôn light.
- **Sweep**: 63 file .tsx chuyển từ hex literal → token utility.
- **Toggle**: nút mặt trời/mặt trăng ở đáy sidebar (cạnh nút thu gọn) + 3 lựa chọn (Sáng/Tối/Theo hệ điều hành) trong Cài đặt > Giao diện.
- **No-flash**: inline script trong layout head áp `.dark` trước first paint; provider lưu `localStorage['iceflow-theme']`, mặc định 'system' và theo prefers-color-scheme.
- **QA browser**: dashboard, orders + drawer, settle, settings, admin tenants, landing — cả light và dark đều ổn (screenshots `gui-test-screenshots/dark-*.png`, `light-*.png`).
- Gates: 94/94 test (thêm suite theme), typecheck 0, lint 0.

### Bổ sung dark mode (sau QA): sweep đợt 2
- 22 file dùng Tailwind palette chuẩn (text-gray-*, slate-*, blue-600, orange-*, emerald-*...) + hex sót → token. Register page bỏ style dark-glass (bg-card/5, border-white/10, text-gray-300) chuyển về token chuẩn; nút gradient blue→violet đổi thành brand solid. Sửa hover pink-on-pink ở nút đăng xuất settings.
