---
status: complete
---

# Quick Task 261012-mcp Summary: App di động — màn đổi mật khẩu

**Date:** 2026-10-12 · **Branch:** `feat/mobile-change-password` · **Status:** complete ✓

## Shipped

1. **Bắt buộc đổi ở lần đăng nhập đầu**: tài khoản có cờ `mustChangePassword` (vừa được Quản lý tạo hoặc đặt lại mật khẩu) bị router giữ ở màn Đổi mật khẩu, cả khi đăng nhập lẫn khi mở lại app. Đổi xong vào thẳng app. Lối ra duy nhất là Đăng xuất.
2. **Tự đổi**: mục "Đổi mật khẩu" trong tab Cài đặt; đổi xong quay lại Cài đặt.
3. **Màn hình**: mật khẩu hiện tại, mật khẩu mới, nhập lại. Chặn trên máy: bỏ trống, dưới 8 ký tự, thiếu chữ hoặc số, trùng mật khẩu cũ, nhập lại không khớp. Lỗi của server (mật khẩu hiện tại sai, mật khẩu dễ đoán, thao tác quá nhanh, mất mạng) hiện nguyên câu tiếng Việt.
4. **`PasswordPolicy`** giống `src/lib/password.ts` của server, trừ danh sách mật khẩu dễ đoán (server quyết).

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 244/244 (228 test cũ, 16 test mới).
- Test luồng toàn app (router thật, cubit thật, repository giả): tài khoản mới → màn đổi mật khẩu → đổi → vào app → Cài đặt → mở lại màn đổi mật khẩu → quay lại.
- Bỏ luật redirect "có cờ thì giữ ở màn đổi mật khẩu": 2 test đỏ.

## Ghi chú

- Chưa chạy trên máy/giả lập và chưa gọi server thật.
- Quản lý đặt lại mật khẩu khi tài xế đang mở app: app chưa tự chuyển sang màn đổi mật khẩu. Các danh sách sẽ báo câu lỗi 403 của server; lần mở app kế tiếp thì bị giữ ở màn đổi mật khẩu.
- Không thêm use case riêng: `AuthCubit` vốn gọi thẳng `AuthRepository` cho login/restore/logout.
