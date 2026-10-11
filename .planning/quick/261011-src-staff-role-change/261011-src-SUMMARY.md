---
status: complete
---

# Quick Task 261011-src Summary: Quản lý đổi vai trò nhân sự

**Date:** 2026-10-11 · **Branch:** `feat/staff-role-change` · **Status:** complete ✓

## Shipped

1. **Ô Vai trò trong hộp thoại sửa nhân sự** (Nhân viên / Tài xế). Tài xế chuyển sang Nhân viên: hồ sơ tài xế ngừng hoạt động, đơn chưa giao được gỡ gán và thông báo cho Quản lý biết bao nhiêu đơn. Nhân viên chuyển sang Tài xế: có hồ sơ tài xế, nhận được đơn. Phần xử lý này đã có sẵn trong API; không đổi API, không đổi schema.
2. **Vai trò mới có hiệu lực ngay với người đang đăng nhập.** Trước đây token 7 ngày vẫn mang vai trò cũ: một nhân viên bị chuyển thành tài xế vẫn gọi được API văn phòng đến khi đăng nhập lại. Nay `getSession` đọc vai trò từ DB ở mỗi request.
3. **Lần tải trang kế tiếp đưa người đó về màn hình của vai trò mới**: `/api/auth/me` cấp lại cookie, trình duyệt rời màn hình cũ.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 279/279 · build xong.
- Chrome (Playwright, Postgres tạm trong Docker) 28/28, trong đó 2 bài mới của `e2e/staff-role.spec.ts`: tài xế đang đăng nhập trên điện thoại → Quản lý đổi sang Nhân viên → đơn chưa giao gỡ gán, không còn trong danh sách tài xế, phiên cũ gọi được API đơn hàng và bị từ chối ở API tài xế, tải lại trang thì sang `/dashboard` → đổi lại Tài xế thì ngược lại, chỉ một hồ sơ tài xế. API từ chối `role: ADMIN` (400).

## Ghi chú

- Vẫn không đổi được vai trò của Quản lý và không nâng ai lên Quản lý.
- Người đang mở sẵn một màn hình chỉ bị đưa đi khi tải lại trang; trong lúc đó các thao tác của vai trò cũ đã bị API từ chối.
- App di động: token mới (qua `/api/auth/refresh`) mang vai trò mới; chưa kiểm tra app tự chuyển màn hình.
- Hai unit test so khớp nguyên văn mã nguồn được cập nhật theo dạng mới (`tenant-session`, `staff`).
