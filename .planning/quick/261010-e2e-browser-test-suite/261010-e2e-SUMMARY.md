---
status: complete
---

# Quick Task 261010-e2e Summary: Bộ test trình duyệt trong repo và CI

**Date:** 2026-10-10 · **Branch:** `test/e2e-browser-suite` · **Status:** complete ✓

## Shipped

- **26 bài test trình duyệt** trong `e2e/` (7 file): vòng đời một đơn qua ba vai trò, drawer lên đơn, danh mục sản phẩm, kho lạnh và kiểm kho, tài khoản nhân sự, vỏ bao, phân quyền.
- **`npm run e2e:local`**: dựng Postgres tạm trong Docker, migrate, seed, build, chạy app và chạy test; dọn sau khi xong. Từ chối chạy khi có gì đang nghe cổng 3000 (trừ khi `E2E_FORCE=1`), vì nó build vào `.next`.
- **CI**: thêm ba bước sau kiểm tra contract; bộ test dùng database riêng.
- **Seed**: tài xế thứ hai có tài khoản `taixe2@miendong.vn`; tài khoản `taixe1` mang cùng tên với hồ sơ tài xế.

## Về hai mục "tài xế không có tài khoản" và "tên tài xế bị ghi đè"

Cả hai đến từ dữ liệu seed, không phải từ code: app chỉ tạo tài xế kèm tài khoản, và chép tên tài khoản sang hồ sơ tài xế là hành vi đúng. Seed cũ tạo một tài xế không tài khoản và đặt hai tên khác nhau cho cùng một người. Đã sửa seed; dữ liệu đang có trên Supabase không đổi (seed không bao giờ chạy ở đó).

## Verification

- Cả bộ chạy 26/26 ba lần liên tiếp (khoảng 22 giây mỗi lần, không tính build).
- Phá thử: bỏ `data-autofocus` của ô tìm khách → 4 bài đỏ; khôi phục → xanh.
- Guard: địa chỉ không phải localhost (kể cả host Supabase) và thiếu biến môi trường đều bị từ chối trước khi chạy.
- `contract:verify` 54/54 với seed mới · lint 0 lỗi · typecheck 0 lỗi · suite đơn vị 276/276.

## Ghi chú

- Một bài (lọc lịch sử kiểm kho) từng trượt một lần vì trang đang tải có hai ô lọc trong tích tắc; đã cho test chờ trang ổn định.
- Chưa có test trình duyệt cho: in phiếu, báo cáo nợ và thu tiền, lịch trình và ca làm, đội xe, tài sản.
