# Quick Task 261012-mcp: App di động — màn đổi mật khẩu

**Date:** 2026-10-12
**Nguồn:** Tài khoản tài xế do Quản lý tạo có cờ `mustChangePassword`; server trả 403 `PASSWORD_CHANGE_REQUIRED` cho mọi API ngoài `/api/auth/*`. App không xử lý, nên tài xế mới đăng nhập được mà không tải được đơn, phải lên web đổi mật khẩu. Lớp dữ liệu (`AuthRepository.changePassword`, `User.mustChangePassword`) đã có từ PR #50.

## Task 1 — Logic

**Files:** `auth_cubit.dart`, `password_policy.dart`, `core/router/*`
- `AuthCubit.changePassword` trả câu lỗi hoặc `null`; thành công thì tắt cờ.
- `RouteNames.changePassword`; redirect: có cờ thì chỉ ở được màn này.
- `PasswordPolicy` giống `src/lib/password.ts`.

## Task 2 — Màn hình

**Files:** `change_password_screen.dart`, `settings_tab.dart`, `strings.dart`
- Ba ô (hiện tại, mới, nhập lại), báo lỗi trên máy và lỗi của server. Bắt buộc đổi: có lời nhắc và nút đăng xuất. Tự đổi: mục "Đổi mật khẩu" trong Cài đặt.

## Verify

`flutter analyze`, `flutter test`; test luồng toàn app; bỏ luật redirect thì test phải đỏ.
