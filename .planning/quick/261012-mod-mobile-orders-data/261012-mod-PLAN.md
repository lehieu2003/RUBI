# Quick Task 261012-mod: App di động — lớp dữ liệu đơn hàng phía văn phòng

**Date:** 2026-10-12
**Nguồn:** Việc kế tiếp đã thống nhất: Đơn hàng trước (Quản lý và Nhân viên đều dùng, Đối soát cũng dựa trên dữ liệu đơn), lớp dữ liệu rồi tới màn hình.

## Task

**Files:** `mobile/lib/features/orders/{domain,data}/**` (mới)
- `OrdersRepository`: danh sách đơn (lọc, trạng thái, phân trang), số đếm theo trạng thái, danh sách tài xế, gán tài xế, đổi trạng thái / huỷ.
- Entity `OfficeOrder` (5 trạng thái) tách khỏi `DeliveryOrder` của tài xế (2 trạng thái).

## Verify

`flutter analyze`, `flutter test` — test đọc thẳng các response thật của server trong `api/openapi/fixtures/responses`.
