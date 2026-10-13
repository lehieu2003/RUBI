# Quick Task 261013-mcu: App di động — Khách hàng

**Date:** 2026-10-13
**Nguồn:** Bước đầu của "làm tiếp tính năng trên app": Nhân viên chưa xem được khách hàng; Quản lý chưa thêm được khách trên app.

## Task

**Files:** `mobile/lib/features/customers/**` (mới), `mobile/lib/features/home/presentation/shell_tabs.dart`
- Lớp dữ liệu trước: danh sách khách, bảng giá của một khách, thêm khách.
- Màn danh sách (tìm trên máy), màn chi tiết (liên hệ, bảng giá), hộp thêm khách và lối vào sổ nợ cho Quản lý.

## Verify

`flutter analyze`, `flutter test`, `scripts/mobile-e2e-local.sh` trên emulator.
