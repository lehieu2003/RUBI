# Quick Task 261012-msv: App di động — màn "Duyệt ca" của Quản lý

**Date:** 2026-10-12
**Nguồn:** Màn hình đầu tiên của Quản lý trên app (thứ tự đã thống nhất: Duyệt ca → Kho lạnh → Công nợ). Lớp dữ liệu có từ #64, khung theo vai trò từ #65.

## Task

**Files:** `features/schedule/domain/team_schedule_rules.dart`, `presentation/cubit/team_schedule_cubit.dart`, `presentation/screens/shift_review_tab.dart`, `presentation/widgets/week_widgets.dart`, `features/home/presentation/shell_tabs.dart`
- Tab "Duyệt ca": lịch cả nhóm theo tuần và theo ngày, duyệt / từ chối từng yêu cầu, duyệt tất cả.
- Thanh tuần và dải 7 ngày tách thành widget dùng chung với tab "Ca làm".

## Verify

`flutter analyze`, `flutter test`; `scripts/mobile-e2e-local.sh` trên giả lập, Quản lý duyệt ca tài xế vừa xin.
