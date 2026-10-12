---
status: complete
---

# Quick Task 261012-mos Summary: màn Đơn hàng cho Quản lý và Nhân viên

**Date:** 2026-10-12 · **Branch:** `feat/mobile-orders-screen` (xếp chồng trên `feat/mobile-orders-data`) · **Status:** complete ✓

## Shipped

1. **`OrdersCubit`**: danh sách theo tab trạng thái kèm số đếm, tìm kiếm, tải thêm, gán tài xế, đổi trạng thái, huỷ kèm lý do. Kết quả về muộn của tab / từ khoá cũ bị bỏ; sau mỗi thao tác (kể cả bị server từ chối) danh sách được tải lại.
2. **`OrdersTab`**:
   - ô tìm kiếm (chờ ngừng gõ), dải tab Tất cả / Chờ giao / Đang giao / Đã giao / Hoàn thành / Đã hủy kèm số đơn;
   - thẻ đơn: mã, giờ tạo, trạng thái, khách, hàng, tổng tiền, tài xế (hoặc "Chưa gán tài xế");
   - bảng chi tiết với thao tác theo trạng thái: gán / đổi tài xế (chờ giao, đang giao), "Cho đi giao", "Đánh dấu đã giao", "Về chờ giao", "Hủy đơn" (bắt buộc lý do); đơn đã giao có câu nhắc chờ đối soát; đơn hoàn thành / đã hủy chỉ xem.
3. **Lối vào theo vai trò**: Nhân viên có tab "Đơn hàng" đứng đầu (`Đơn hàng, Ca làm, Cài đặt`); Quản lý vào từ "Thêm" (thanh dưới vẫn 4 tab).
4. `scripts/mobile-e2e-prepare.mjs`: bước chuẩn bị chừa lại một đơn chờ giao (seed chỉ có một), bước kiểm tra thêm đơn được gán rồi huỷ từ app.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 439/439 (409 test cũ, 30 test mới: 15 cubit, 15 màn hình gồm màn 360dp).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật (Postgres dùng một lần): Nhân viên đăng nhập, gán một đơn chờ giao cho tài xế rồi huỷ với lý do; Quản lý mở Đơn hàng từ "Thêm". Server có nhật ký `ORDER_ASSIGNED` và lý do huỷ của đúng đơn đó.

## Ghi chú

- Chưa có: tạo đơn (server chưa có API REST), đối soát, lọc theo ngày / tài xế (lớp dữ liệu đã hỗ trợ, màn hình chưa có nút).
