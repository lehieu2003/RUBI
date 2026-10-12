# Quick Task 261012-mdb: App di động — màn "Công nợ" của Quản lý

**Date:** 2026-10-12
**Nguồn:** Màn hình thứ ba của Quản lý (thứ tự đã thống nhất: Duyệt ca → Kho lạnh → Công nợ). Lớp dữ liệu có từ #64.

## Task

**Files:** `features/debt/presentation/**`, `features/home/presentation/shell_tabs.dart`, `core/extensions/number_format.dart`, `strings.dart`
- Tab "Công nợ": tổng nợ, từng khách đang nợ.
- Màn sổ nợ của một khách (tải dần theo trang) và sheet ghi nhận thu tiền.

## Verify

`flutter analyze`, `flutter test`; `scripts/mobile-e2e-local.sh` trên giả lập, Quản lý thu một khoản.
