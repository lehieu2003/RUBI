# Quick Task 261012-mlm: App di động — sai mật khẩu lại báo "phiên đăng nhập hết hạn"

**Date:** 2026-10-12
**Nguồn:** User nhập sai mật khẩu ở màn đăng nhập, app hiện "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."

## Nguyên nhân

`/api/auth/login` trả 401 kèm "Email hoặc mật khẩu không đúng". Repository giữ đúng câu đó trong `AuthFailure(message, statusCode: 401)`, nhưng `failureMessage` đổi mọi `AuthFailure` 401 thành câu "phiên hết hạn". Test của cubit dùng `AuthFailure` không có `statusCode` nên không bắt được.

## Task

**Files:** `mobile/lib/features/auth/presentation/cubit/auth_cubit.dart`, test của nó
- `AuthCubit.login`: 401 thì hiện câu của server. Các API khác giữ nguyên cách xử lý 401.

## Verify

Test dùng đúng failure của repository: đỏ trước khi sửa, xanh sau khi sửa. `flutter analyze`, `flutter test`.
