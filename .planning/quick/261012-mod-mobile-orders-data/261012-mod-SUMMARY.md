---
status: complete
---

# Quick Task 261012-mod Summary: lớp dữ liệu đơn hàng phía văn phòng

**Date:** 2026-10-12 · **Branch:** `feat/mobile-orders-data` · **Status:** complete ✓ (chỉ data layer; chưa có màn hình)

## Shipped

1. **Feature mới `orders`**: `OfficeOrder` (khách, tài xế, các dòng hàng kèm id và số thực giao, ghi chú, mốc giao / đối soát), `OfficeOrderStatus` (5 trạng thái), `OrderLine`, `OrderCounts`, `DriverOption`, `OrderFilter`.
2. **`OrdersRepository`**:
   - `getOrders` — `GET /api/orders` với tìm kiếm, ngày, tài xế / chưa gán, trạng thái, phân trang;
   - `getCounts` — `GET /api/orders/counts` cho các tab trạng thái;
   - `getDrivers` — `GET /api/drivers`;
   - `assignDriver` — `PATCH /api/orders/bulk-assign`;
   - `changeStatus` — `PATCH /api/orders/{id}/status`, huỷ kèm lý do.
3. Đăng ký DI.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 410/410 (395 test cũ, 15 test mới).
- Test của repository **đọc thẳng response thật của server** đã ghi trong `api/openapi/fixtures/responses/success` (`listOrders`, `getOrderCounts`, `listDrivers`, `bulkAssignOrders`, `updateOrderStatus`), nên DTO và mapper được kiểm với đúng dạng dữ liệu server trả, không phải dữ liệu tự dựng.

## Ghi chú

- Trạng thái lạ, thiếu tổng tiền hay thiếu số lượng đều trả lỗi, không suy mặc định.
- Chưa có: đối soát (`PATCH /api/orders/{id}/reconcile`) và tạo đơn (server chưa có API REST).
- Các test dùng fixture ở gốc repo nên phải chạy với thư mục làm việc là `mobile/` (như `flutter test` và CI vẫn làm).
