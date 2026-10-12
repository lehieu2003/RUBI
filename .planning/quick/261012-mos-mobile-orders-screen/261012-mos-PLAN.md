# Quick Task 261012-mos: App di động — màn Đơn hàng cho Quản lý và Nhân viên

**Date:** 2026-10-12
**Nguồn:** Việc kế tiếp đã thống nhất: Đơn hàng trước, lớp dữ liệu (261012-mod) rồi tới màn hình.

## Task

**Files:** `mobile/lib/features/orders/presentation/**` (mới), `mobile/lib/features/home/presentation/shell_tabs.dart`, `mobile/lib/core/localization/strings.dart`
- `OrdersCubit`: danh sách theo tab trạng thái kèm số đếm, tìm kiếm, tải thêm, gán tài xế, đổi trạng thái, huỷ.
- `OrdersTab`: ô tìm kiếm, dải tab trạng thái, thẻ đơn, bảng chi tiết với các thao tác theo trạng thái.
- Nhân viên: tab "Đơn hàng" đứng đầu thanh dưới. Quản lý: vào từ "Thêm" (thanh dưới đã đủ 4 tab).

## Verify

`flutter analyze`, `flutter test`, và `scripts/mobile-e2e-local.sh` trên emulator với server thật trên Postgres dùng một lần.
