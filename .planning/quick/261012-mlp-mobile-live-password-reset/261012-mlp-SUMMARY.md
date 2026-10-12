---
status: complete
---

# Quick Task 261012-mlp Summary: đặt lại mật khẩu khi app đang mở

**Date:** 2026-10-12 · **Branch:** `feat/mobile-live-password-reset` · **Status:** complete ✓

## Shipped

- Khi server từ chối một lời gọi vì tài khoản phải đổi mật khẩu (403, `code: PASSWORD_CHANGE_REQUIRED`), app tự chuyển sang màn Đổi mật khẩu ở chế độ bắt buộc, thay vì để các danh sách báo lỗi.
- Token được giữ nguyên, không đăng xuất. Lỗi 403 khác (không đủ quyền) không kích hoạt việc này.
- `User.copyWith` để bật/tắt cờ.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 277/277 (273 test cũ, 4 test mới): interceptor, cubit, và luồng toàn app (đang ở trong app → server báo phải đổi mật khẩu → màn đổi mật khẩu có nút Đăng xuất).

## Ghi chú

- App chỉ biết khi có một lời gọi API bị từ chối (mở tab, kéo tải lại, xác nhận giao…), không có kênh đẩy từ server.
- Chưa chạy trên máy/giả lập và chưa gọi server thật.
