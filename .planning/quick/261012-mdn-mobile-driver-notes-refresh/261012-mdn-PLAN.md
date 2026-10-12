# Quick Task 261012-mdn: App tài xế — ghi chú của đơn và tự làm mới

**Date:** 2026-10-12
**Nguồn:** Rà lại phần tài xế trước khi chuyển sang Quản lý. Server trả `notes` của đơn nhưng app bỏ qua; đơn mới gán khi app đang mở chỉ hiện khi tài xế kéo xuống hoặc đổi tab.

## Task 1 — Ghi chú

**Files:** `driver_dtos.dart`, `delivery_order.dart`, `order_mapper.dart`, `delivery_card.dart`, `today_orders_cubit.dart`
- Đọc `notes`, hiện trong khung riêng trên thẻ đơn (cả Hôm nay lẫn Lịch sử).

## Task 2 — Làm mới khi mở lại app

**Files:** `today_tab.dart`
- App trở lại từ nền → `refresh()` (giữ danh sách đang hiện).

## Verify

`flutter analyze`, `flutter test`.
