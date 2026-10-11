# Quick Task 261011-src: Quản lý đổi vai trò nhân sự

**Date:** 2026-10-11
**Nguồn:** User: "admin có thể update role nhân sự". `PATCH /api/staff/{id}` đã nhận `role` (STAFF/DRIVER) nhưng màn Cài đặt chỉ sửa được tên và số điện thoại.

## Task 1 — Màn Cài đặt

**Files:** `src/app/settings/page.tsx`
- Hộp thoại "Sửa thông tin nhân sự" có thêm ô Vai trò (Nhân viên / Tài xế). Chỉ gửi `role` khi có đổi. Báo số đơn bị gỡ gán khi một tài xế thôi làm tài xế.
- Không cho nâng lên Quản lý: tài khoản Quản lý duy nhất tạo bằng `npm run admin:create`.

## Task 2 — Phiên đang mở theo vai trò mới

**Files:** `src/lib/auth.ts`, `src/app/api/auth/me/route.ts`, `src/lib/auth-provider.tsx`
- JWT sống 7 ngày và mang vai trò cũ. `getSession` lấy vai trò từ DB; `/api/auth/me` cấp lại cookie khi vai trò trong cookie đã cũ; trình duyệt rời màn hình mà vai trò mới không được vào.

## Verify

lint, typecheck, test, build, `npm run e2e:local` trên Postgres tạm.
