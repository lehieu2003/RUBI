# Quick Task 261013-mes: App di động — màn lên đơn cho Quản lý và Nhân viên

**Date:** 2026-10-13
**Nguồn:** Lớp dữ liệu lên đơn đã có (261013-moe); đây là màn hình trên đó.

## Task

**Files:** `mobile/lib/features/orders/presentation/**`, `mobile/lib/core/extensions/search_text.dart` (mới), `mobile/lib/app.dart`
- `OrderEntryCubit` + `OrderEntryScreen`: chọn khách (tìm ngay trên máy, không dấu), nhập số lượng theo giá của khách, ghi chú, lưu.
- Nút "Lên đơn" trên màn Đơn hàng.

## Verify

`flutter analyze`, `flutter test`, và `scripts/mobile-e2e-local.sh` trên emulator với server thật trên Postgres dùng một lần.
