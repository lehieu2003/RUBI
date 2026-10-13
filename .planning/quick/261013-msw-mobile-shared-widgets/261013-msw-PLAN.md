# Quick Task 261013-msw: App di động — widget dùng chung và AppHeader

**Date:** 2026-10-13
**Nguồn:** `shared/widgets` chỉ có `error_views.dart` trong khi các màn lặp lại cùng một đoạn giao diện; header mặc định bị chê đơn điệu.

## Task

**Files:** `mobile/lib/shared/widgets/**` (mới), các màn trong `mobile/lib/features/**/presentation`
- Tạo `AppHeader`, `AppButton`, `LoadingView`, `EmptyView`, `LoadMoreButton`, `SearchField`, `showMessage`.
- Thay vào mọi chỗ đang lặp. Không đổi hành vi.

## Verify

`flutter analyze`, `flutter test` (bộ test cũ không sửa), `scripts/mobile-e2e-local.sh` trên emulator kèm ảnh chụp màn hình để xem header.
