# Quick Task 261012-mma: App di động — tab "Thêm" và màn "Nhật ký" của Quản lý

**Date:** 2026-10-12
**Nguồn:** Thanh dưới của Quản lý đã có 4 tab sau #68; thêm màn nữa không vừa. User chọn theo đề xuất: tab "Thêm" gom các màn ít dùng. Một tab "Thêm" chỉ chứa Cài đặt thì chưa có ý nghĩa, nên làm cùng màn kế tiếp là Nhật ký (API đã có).

## Task 1 — Lớp dữ liệu nhật ký (làm trước)

**Files:** `features/audit/{domain,data}/**`
- `AuditRepository.getEntries({filter, page})` trên `GET /api/audit-logs`.

## Task 2 — Tab "Thêm" và màn Nhật ký

**Files:** `features/audit/presentation/**`, `features/home/presentation/shell_tabs.dart`, `settings_tab.dart`
- Quản lý: Duyệt ca, Kho lạnh, Công nợ, Thêm. "Thêm" = lối vào Nhật ký + toàn bộ phần Cài đặt.
- Màn Nhật ký: lọc Tất cả / Đơn hàng / Công nợ, tải dần theo trang.

## Verify

`flutter analyze`, `flutter test`; `scripts/mobile-e2e-local.sh` trên giả lập, Quản lý đọc nhật ký của chính các thao tác vừa làm.
