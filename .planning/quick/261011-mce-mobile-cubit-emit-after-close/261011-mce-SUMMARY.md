---
status: complete
---

# Quick Task 261011-mce Summary: App di động emit sau khi cubit đã đóng

**Date:** 2026-10-11 · **Branch:** `fix/mobile-cubit-emit-after-close` · **Status:** complete ✓

## Shipped

1. **`HistoryCubit`**: rời tab Lịch sử khi đang tải không còn ném `StateError`.
2. **`TodayOrdersCubit`**: cùng lỗi ở `load`, `refresh` và `confirm`.
3. **`AuthCubit`**: cùng dạng ở `restore`, `login` (kể cả nhánh chặn vai trò) và `logout`.

Nguyên nhân: `BlocProvider` đóng cubit khi màn hình bị gỡ; lời gọi mạng đang chờ vẫn chạy tiếp tới `emit`.

## Verification

- `flutter test` 152/152 · `flutter analyze` không có vấn đề.
- 4 test mới (đóng cubit giữa lúc chờ mạng) đỏ với đúng lỗi này khi bỏ phần sửa, xanh khi có.

## Ghi chú

- Chưa chạy trên máy/giả lập.
- Nhánh `feat/mobile-password-schedule-data` (chưa đẩy) thêm `await _preferences.saveLastEmail` trước một `emit` trong `AuthCubit.login`; chỗ đó cần thêm chốt tương tự khi rebase.
