---
status: complete
---

# Quick Task 261012-mlm Summary: sai mật khẩu báo nhầm "phiên đăng nhập hết hạn"

**Date:** 2026-10-12 · **Branch:** `fix/mobile-login-wrong-password-message` · **Status:** complete ✓

## Shipped

- Sai email hoặc mật khẩu ở màn đăng nhập hiện đúng câu của server: "Email hoặc mật khẩu không đúng".
- Các chỗ khác không đổi: 401 ở API thường vẫn là hết phiên; 429 vẫn báo thử lại sau.

## Verification

- Test của cubit nay dùng đúng failure mà repository trả (`AuthFailure(..., statusCode: 401)`): đỏ trước khi sửa với đúng câu "Phiên đăng nhập hết hạn…", xanh sau khi sửa.
- `flutter analyze`: không có vấn đề. `flutter test`: 228/228.

## Ghi chú

- Lỗi có từ trước, không do PR đổi mật khẩu (#54) gây ra.
- Chưa chạy trên máy/giả lập.
