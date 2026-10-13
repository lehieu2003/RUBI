# Quick Task 261013-msf: App di động — Nhân sự cho Quản lý

**Date:** 2026-10-13
**Nguồn:** Bước hai của "làm tiếp tính năng trên app": Quản lý chưa tạo hay khóa tài khoản được trên điện thoại.

## Task

**Files:** `mobile/lib/features/staff/**` (mới), `mobile/lib/features/home/presentation/shell_tabs.dart`
- Lớp dữ liệu trước: danh sách tài khoản, tạo, sửa (tên, số điện thoại, vai trò, khóa, đặt lại mật khẩu).
- Màn "Nhân sự" trong "Thêm".

## Verify

`flutter analyze`, `flutter test`, `scripts/mobile-e2e-local.sh` trên emulator.
