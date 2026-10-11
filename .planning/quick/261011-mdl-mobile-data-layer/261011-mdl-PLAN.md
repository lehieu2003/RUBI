# Quick Task 261011-mdl: Data layer mobile — đổi mật khẩu và đăng ký ca

**Date:** 2026-10-11
**Nguồn:** User yêu cầu "Implement phần data layer cho mobile" — data layer + test trước, user kiểm tra xong mới làm UI.

**Phạm vi (giả định):** hai nhóm endpoint tài xế dùng được mà app Flutter chưa có data layer: `POST /api/auth/password` và `GET/POST/DELETE /api/schedule/my`. Không có UI, cubit, use case, đăng ký DI — để bước UI.

## Task 1 — Đổi mật khẩu (feature `auth`)

**Files:** `mobile/lib/features/auth/{data,domain}/**`, test tương ứng
- `AuthRepository.changePassword` gọi `POST /api/auth/password`, lưu token mới server trả về.
- `User.mustChangePassword` đọc từ login/me (server chặn mọi API khác bằng 403 khi cờ này bật).

## Task 2 — Đăng ký ca (feature mới `schedule`)

**Files:** `mobile/lib/features/schedule/{data,domain}/**`, test tương ứng
- Entity `WeekSchedule`, `SchedulePerson`, `Shift`, enum `ShiftSlot`, `ShiftStatus`.
- `ScheduleRepository`: `getWeek`, `requestShift`, `withdrawShift`; DTO + mapper theo đúng kiểu feature `driver`.

## Verify

`flutter analyze`, `flutter test` (CI hiện không chạy Flutter).
