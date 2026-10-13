---
status: complete
---

# Quick Task 261013-msf Summary: Nhân sự trên app

**Date:** 2026-10-13 · **Branch:** `feat/mobile-staff` (xếp chồng trên `feat/mobile-customers`) · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu** (commit đầu): feature `staff` — `StaffAccount`, `StaffRepository` (`GET/POST /api/staff`, `PATCH /api/staff/{id}`).
2. **Màn "Nhân sự"** ("Thêm" → "Nhân sự", chỉ Quản lý): mọi tài khoản với vai trò và email; tài khoản đã khóa có nhãn; tài khoản Quản lý chỉ xem.
3. **Tạo tài khoản**: chọn Nhân viên / Tài xế, họ tên, email, số điện thoại, mật khẩu tạm (kiểm theo cùng quy tắc mật khẩu của app trước khi gửi).
4. **Bấm một tài khoản**: sửa tên và số điện thoại; chuyển Nhân viên ↔ Tài xế; đặt lại mật khẩu; khóa / mở khóa. Chuyển vai trò và khóa có bước hỏi lại, nói trước rằng đơn đang giữ của tài xế sẽ trở về chưa gán; kết quả báo số đơn bị gỡ.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 570/570 (542 test cũ, 28 test mới; test repository đọc response thật của server).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Quản lý tạo tài khoản `nv-app@rubi.local` rồi khóa nó. Server có tài khoản đó là Nhân viên, đang khóa.

## Ghi chú

- Khóa dùng `PATCH isActive=false` (mở lại được), không dùng `DELETE`.
- Menu "Thêm" giờ có năm mục; trên màn hình thấp phải cuộn mới tới phần cài đặt.
