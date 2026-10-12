---
status: complete
---

# Quick Task 261012-mtm Summary: giao diện sáng / tối

**Date:** 2026-10-12 · **Branch:** `feat/mobile-theme-mode` · **Status:** complete ✓

## Shipped

1. **Mục "Giao diện" trong tab Cài đặt**: ba nút Theo máy / Sáng / Tối. Bấm là cả app đổi ngay.
2. **Nhớ lựa chọn** trên máy (shared_preferences, khoá `theme_mode`), áp dụng cả ở màn đăng nhập và sau khi đăng xuất.
3. **Bản tối** (`AppTheme.dark`) sinh từ cùng màu gốc với bản sáng. Mặc định là theo cài đặt của máy.
4. `ThemeCubit` (một bản cho cả app) đọc lựa chọn trước khung hình đầu tiên.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 287/287 (277 test cũ, 10 test mới): cubit, lưu/đọc, nút chọn trong Cài đặt (kể cả màn 320dp), và luồng toàn app (chọn Tối → cả app tối → chọn Sáng).
- Kết xuất thẻ đơn và tab Cài đặt ở cả hai chế độ với phông Roboto và xem bằng mắt: chữ, nút, nhãn trạng thái đều đọc được.

## Ghi chú

- Không màn hình nào dùng màu viết cứng, nên các màn hiện có theo bản tối mà không phải sửa.
- Lựa chọn lưu theo máy, không theo tài khoản.
- Chưa chạy trên giả lập / máy thật cho thay đổi này. `integration_test` đã được cập nhật theo chữ ký mới của `IceFlowApp`.
