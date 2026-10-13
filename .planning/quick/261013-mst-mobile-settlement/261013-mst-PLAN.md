# Quick Task 261013-mst: App di động — Đối soát cho Quản lý

**Date:** 2026-10-13
**Nguồn:** Việc kế tiếp đã thống nhất sau màn Đơn hàng: Đối soát, lớp dữ liệu trước rồi tới màn hình.

## Task

**Files:** `mobile/lib/features/orders/**`, `mobile/lib/features/home/presentation/shell_tabs.dart`, `mobile/lib/core/localization/strings.dart`
- Lớp dữ liệu: `OrdersRepository.settle` — `PATCH /api/orders/{id}/reconcile`.
- `OrdersCubit.settle`, màn `SettlementScreen` (đơn đã giao chờ chốt, bảng nhập số thực giao từng dòng).
- Quản lý vào từ "Thêm" → "Đối soát".

## Verify

`flutter analyze`, `flutter test`, và `scripts/mobile-e2e-local.sh` trên emulator với server thật trên Postgres dùng một lần.
