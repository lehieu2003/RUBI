# Quick Task 261013-mof: App di động — lọc đơn theo ngày và tài xế

**Date:** 2026-10-13
**Nguồn:** Việc còn treo sau màn Đơn hàng: lớp dữ liệu đã hỗ trợ lọc theo ngày / tài xế, màn hình chưa có nút.

## Task

**Files:** `mobile/lib/features/orders/presentation/**`
- `OrdersCubit`: `setDate`, `setDriver` (một tài xế hoặc đơn chưa gán), cộng dồn với tab và từ khoá.
- `OrderFilterBar`: hai chip dưới ô tìm kiếm của màn Đơn hàng.

## Verify

`flutter analyze`, `flutter test`, `scripts/mobile-e2e-local.sh` trên emulator.
