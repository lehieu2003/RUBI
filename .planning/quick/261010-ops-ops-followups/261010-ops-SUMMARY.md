---
status: complete
---

# Quick Task 261010-ops Summary: Bốn việc còn lại, gom một nhánh

**Date:** 2026-10-10 · **Branch:** `feat/ops-followups` · **Status:** complete ✓

## Shipped

1. Khoá, xoá hoặc đổi vai trò một tài xế thì đơn PENDING/SHIPPING của họ được gỡ gán (giữ nguyên trạng thái); màn Cài đặt báo số đơn cần giao lại.
2. Drawer khách hàng có link "Bảng giá riêng của khách này" cho Quản lý; trang giá có menu, người khác bị đưa về danh sách.
3. `orders.completed_at` (migration `20261010170000_add_order_completed_at`, có backfill từ `updated_at` cho đơn đã COMPLETED); `GET /api/orders?completedDate=`; thẻ "Đã đối soát hôm nay" đếm theo ngày đối soát.
4. Lịch sử kiểm kho lọc theo sản phẩm và khoảng ngày; `GET /api/inventory/counts/summary` trả số lần kiểm, tổng hao hụt, tổng thừa.

## Lỗi có sẵn phát hiện khi thử trên trình duyệt

`PATCH /api/staff/{id}` trả 500 với mọi tài khoản tài xế (khoá, đổi tên, đặt lại mật khẩu): `tx.driver.findUnique` thiếu `factoryId` nên bị tenant guard từ chối. Đã sửa; `contract:verify` giờ sửa cả một tài khoản tài xế.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 266/266 · build xong.
- `prisma migrate deploy` trên DB trống áp đủ 9 migration, không lệch schema.
- `contract:verify --record` 54/54, 158 lượt gọi; fixture ghi lại (Order có thêm `completedAt`).
- Chrome (Playwright, Postgres tạm): chốt đơn tạo hôm qua → thẻ tăng 0 → 1, còn sau khi tải lại; link giá riêng mở trang có menu; khoá tài xế báo "2 đơn ... đã được gỡ gán", hai đơn về "Chưa giao", đơn đã chốt giữ tài xế; mở khoá không báo gì về đơn; lịch sử: 4 lần kiểm / hao hụt 33 / thừa 3, lọc Đá Bi 5kg còn 2 lần / hao hụt 13, lọc từ 5 ngày trước còn 3 lần, đến hôm qua còn 2 lần; nhân viên không thấy link giá và bị đưa về `/customers`.

## Cần làm khi merge

Chạy `npm run db:deploy` trên Supabase (thêm cột `orders.completed_at`) ngay khi merge vào `dev`, vì app local đang trỏ vào Supabase.
