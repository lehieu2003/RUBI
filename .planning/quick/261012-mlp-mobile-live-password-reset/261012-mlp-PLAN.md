# Quick Task 261012-mlp: App di động — Quản lý đặt lại mật khẩu khi app đang mở

**Date:** 2026-10-12
**Nguồn:** Chỗ hổng ghi lại ở PR #54: khi Quản lý đặt lại mật khẩu trong lúc tài xế đang dùng app, server trả 403 `PASSWORD_CHANGE_REQUIRED` cho mọi API, app chỉ hiện câu lỗi trong từng danh sách và chỉ đưa sang màn đổi mật khẩu ở lần mở app sau.

## Task

**Files:** `core/network/auth_events.dart`, `core/network/auth_interceptor.dart`, `features/auth/presentation/cubit/auth_cubit.dart`, `features/auth/domain/entities/user.dart`
- Interceptor nhận ra 403 có `code: PASSWORD_CHANGE_REQUIRED` và báo qua `AuthEvents`.
- `AuthCubit` bật cờ `mustChangePassword`; luật redirect sẵn có đưa người dùng sang màn đổi mật khẩu.

## Verify

`flutter analyze`, `flutter test`; test luồng toàn app.
