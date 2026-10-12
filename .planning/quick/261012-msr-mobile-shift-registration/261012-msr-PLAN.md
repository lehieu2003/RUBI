# Quick Task 261012-msr: App di động — tab "Ca làm" (đăng ký ca)

**Date:** 2026-10-12
**Nguồn:** Việc tiếp theo phía mobile sau màn đổi mật khẩu. Tài xế phải lên web để đăng ký ca; lớp dữ liệu (`ScheduleRepository`) đã có từ PR #50.

## Task 1 — Luật và logic

**Files:** `features/schedule/domain/shift_rules.dart`, `presentation/cubit/schedule_cubit.dart`
- `ShiftRules.slotsOf`: 8 khung giờ của một ngày, ca của mình, ai đã có ca, và lý do khoá (đã qua, đã qua giờ, đã chốt công, đủ người) — cùng luật với web và server.
- `ScheduleCubit`: tải tuần, đổi tuần, chọn ngày, đăng ký / huỷ / xin lại.

## Task 2 — Màn hình

**Files:** `presentation/screens/schedule_tab.dart`, `home_shell.dart`, `strings.dart`
- Tab thứ tư "Ca làm": thanh tuần, dải 7 ngày, danh sách 8 khung giờ.

## Verify

`flutter analyze`, `flutter test`; test bố cục trên màn hình 360dp.
