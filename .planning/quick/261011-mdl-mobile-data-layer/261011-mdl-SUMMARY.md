---
status: complete
---

# Quick Task 261011-mdl Summary: Data layer mobile — đổi mật khẩu và đăng ký ca

**Date:** 2026-10-11 · **Branch:** `feat/mobile-password-schedule-data` · **Status:** complete ✓ (chỉ data layer; UI chờ user kiểm tra)

## Shipped

1. **Đổi mật khẩu** (feature `auth`): `AuthRepository.changePassword` → `POST /api/auth/password`, thay token đang lưu bằng token mới server trả về. Lỗi 400/429 giữ nguyên message tiếng Việt của server; token cũ không bị đụng khi thất bại.
2. **`User.mustChangePassword`** đọc từ login/me (thiếu → `false`).
3. **Đăng ký ca** (feature mới `schedule`): entity `WeekSchedule`, `SchedulePerson`, `Shift`, enum `ShiftSlot` (8 khung 3 tiếng), `ShiftStatus`; `ScheduleRepository.getWeek / requestShift / withdrawShift` trên `GET/POST/DELETE /api/schedule/my`; DTO + mapper. Khung giờ, trạng thái, vai trò lạ là lỗi, không suy mặc định.
4. **json_serializable** cho toàn bộ DTO của app (`auth`, `driver`, `schedule`): `fromJson` được sinh ra, file `*.g.dart` được commit; sửa DTO xong chạy `dart run build_runner build`.

## Verification

- `flutter analyze`: không lỗi. `flutter test`: 201/201.
- Fixture test lấy theo `api/openapi/schedule.yaml`, `auth.yaml` và `api/openapi/fixtures/responses`.
- Chưa chạy với server thật.

## Ghi chú

- Chưa có: use case, cubit, đăng ký DI (`injector.dart`), màn hình — thuộc bước UI.
- `code` của lỗi (`SHIFT_FULL`, `PAYROLL_LOCKED`, `PASSWORD_CHANGE_REQUIRED`) chưa được đưa vào `ServerFailure`; hiện chỉ có message và status.
- CI "Quality Gate" không chạy Flutter.
