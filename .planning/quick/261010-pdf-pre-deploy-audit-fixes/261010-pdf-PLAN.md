# Quick Task 261010-pdf: Sửa các lỗi cần xử lý trước khi deploy

**Date:** 2026-10-10
**Nguồn:** Báo cáo quét codebase cùng ngày, đã đối chiếu lại từng mục với code. User chốt: STAFF được gán tài xế.

## Task 1 — Trạng thái đơn và gán tài xế

**Files:** `src/app/api/orders/[id]/confirm/route.ts`, `src/app/api/driver/orders/route.ts`, `src/app/api/orders/bulk-assign/route.ts`, `src/app/api/staff/[id]/route.ts`, `src/lib/contracts/{orders,driver}.ts`, `api/openapi/*`, `scripts/verify-api-contracts.ts`
- Confirm chỉ cho SHIPPING → DELIVERED; trạng thái khác trả 409 `ORDER_NOT_SHIPPING`; đơn đã DELIVERED trả thành công, không đổi gì.
- Danh sách tài xế: đơn SHIPPING hiện bất kể ngày tạo; đơn DELIVERED lọc theo ngày giao.
- bulk-assign mở cho STAFF, từ chối tài xế đã vô hiệu hoá.
- Xoá nhân sự cũng tắt `Driver` liên kết.

## Task 2 — Giá đơn hàng tính ở server

**Files:** `src/lib/actions/orders.ts`, `src/components/order/order-entry-drawer.tsx`
- `saveOrder`/`loadCustomerPrices` yêu cầu ADMIN hoặc STAFF; kiểm tra khách và sản phẩm thuộc nhà máy; giá lấy từ bảng giá (giá riêng > giá chung), client không gửi giá nữa.

## Task 3 — Đối soát và bảo trì

**Files:** `src/app/settle/page.tsx`, `src/app/api/assets/[id]/maintenance/route.ts`
- `/settle` liệt kê mọi đơn DELIVERED bất kể ngày tạo; thẻ thống kê vẫn đếm đơn hôm nay.
- Ngày bảo trì không đọc được trả 400.

## Không làm trong task này

Tồn kho luỹ kế, trả trước/đặt cọc, sửa số vỏ bao, race đăng ký ca, logic `TRUSTED_PROXIES` của rate limiter, layout trang chi tiết khách hàng, cảnh báo ESLint.

## Verify

lint, typecheck, `npm test`, build, `contract:verify` trên server build với Postgres tạm; gọi trực tiếp từng endpoint đã sửa.
