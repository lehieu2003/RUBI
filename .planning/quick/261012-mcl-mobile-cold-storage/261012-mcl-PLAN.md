# Quick Task 261012-mcl: App di động — màn "Kho lạnh" của Quản lý

**Date:** 2026-10-12
**Nguồn:** Màn hình thứ hai của Quản lý (thứ tự đã thống nhất: Duyệt ca → Kho lạnh → Công nợ). Lớp dữ liệu có từ #64.

## Task

**Files:** `features/inventory/presentation/**`, `features/home/presentation/shell_tabs.dart`, `strings.dart`
- Tab "Kho lạnh": tổng tồn, từng sản phẩm (tồn trên sổ, còn bán được), cảnh báo sắp hết.
- Nhập mẻ sản xuất và kiểm kho từ sheet trên từng sản phẩm.

## Verify

`flutter analyze`, `flutter test`; `scripts/mobile-e2e-local.sh` trên giả lập, Quản lý nhập một mẻ.
