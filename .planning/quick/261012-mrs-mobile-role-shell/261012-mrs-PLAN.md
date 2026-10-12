# Quick Task 261012-mrs: App di động — đăng nhập và thanh điều hướng cho cả ba vai trò

**Date:** 2026-10-12
**Nguồn:** App dành cho cả ba vai trò (user, 2026-10-12). Hiện `AuthCubit.login` chặn mọi vai trò khác Tài xế, và `HomeShell` chỉ có tab của tài xế. User để tôi chọn việc làm trước; khung này là nền cho mọi màn hình của Quản lý và Nhân viên.

## Task

**Files:** `features/auth/presentation/cubit/auth_cubit.dart`, `features/home/presentation/**` (mới, `home_shell.dart` chuyển từ feature `driver`), `core/router/*`
- Bỏ chặn vai trò ở đăng nhập.
- `shellTabsFor(role)`: tab theo vai trò. Tài xế giữ 4 tab; Nhân viên có Ca làm + Cài đặt; Quản lý có Cài đặt.
- Một tab thì không vẽ thanh dưới.

## Verify

`flutter analyze`, `flutter test`; chạy `scripts/mobile-e2e-local.sh` trên giả lập với bài test mở rộng cho Nhân viên và Quản lý.
