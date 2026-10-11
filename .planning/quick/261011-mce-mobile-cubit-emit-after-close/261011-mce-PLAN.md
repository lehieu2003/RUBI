# Quick Task 261011-mce: App di động emit sau khi cubit đã đóng

**Date:** 2026-10-11
**Nguồn:** User gặp `StateError (Bad state: Cannot emit new states after calling close)` tại `HistoryCubit._fetch` khi chạy app.

## Task 1 — Chốt `isClosed`

**Files:** `mobile/lib/features/driver/presentation/cubit/history_cubit.dart`, `today_orders_cubit.dart`, `mobile/lib/features/auth/presentation/cubit/auth_cubit.dart`
- Sau mỗi `await` mà phía sau có `emit`: `if (isClosed) return;`. Màn hình đã đóng thì kết quả tải về bị bỏ.

## Task 2 — Test

**Files:** `mobile/test/features/**/cubit/*_test.dart`
- Đóng cubit khi lời gọi mạng chưa trả về, rồi cho nó trả về: không ném lỗi, state không đổi.

## Verify

`flutter test`, `flutter analyze`; test mới phải đỏ khi bỏ phần sửa.
