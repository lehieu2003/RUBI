---
status: complete
---

# Quick Task 261011-adl Summary: Nhật ký sửa đơn và công nợ

**Date:** 2026-10-11 · **Branch:** `feat/audit-log` · **Status:** complete ✓

## Shipped

1. **Bảng `audit_logs`** qua migration `20261011110000_add_audit_logs` (`CREATE TYPE`, `CREATE TABLE`, index, khoá ngoại tới nhà máy). Không có khoá ngoại tới người dùng, đơn hay khách: nhật ký phải sống lâu hơn chúng, tên người thực hiện được chép vào dòng.
2. **Bảy loại dòng**, ghi trong cùng transaction với thay đổi: lên đơn (sản phẩm, số lượng, tổng tiền), gán tài xế, đổi trạng thái (cũ → mới), huỷ đơn (kèm lý do), tài xế xác nhận giao, chốt đơn (dòng nào giao thiếu/thừa, số nợ ghi), thu tiền (số tiền, ghi chú, còn nợ).
3. **`GET /api/audit-logs`** — chỉ Quản lý, phân trang, mới nhất trước; lọc `type=ORDER|DEBT`, `orderId`, `customerId`.
4. **Màn "Nhật ký"** trong menu của Quản lý: thời gian, người thực hiện, thao tác, mã đơn (bấm mở đơn), khách hàng, nội dung; lọc Tất cả / Đơn hàng / Công nợ.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 281/281 · build xong.
- `prisma migrate deploy` trên DB trống áp đủ 10 migration; không lệch giữa schema và DB.
- `contract:verify` 55/55, 172 lượt gọi; ghi fixture mới cho `listAuditLogs`; `contract:docs --check` khớp.
- Chrome (Playwright, Postgres tạm) 31/31, trong đó 5 bài mới của `e2e/audit-log.spec.ts`: nhân viên lên đơn, gán, cho đi giao → tài xế xác nhận → Quản lý chốt thiếu 1 bao và thu 5.000đ → nhân viên huỷ một đơn khác → Quản lý đọc đủ 5 dòng của đơn theo thứ tự mới nhất trước, đúng người, đúng nội dung; lọc Công nợ / Đơn hàng; nhân viên không có menu, không vào được địa chỉ, API trả 403.
- Xem ảnh chụp màn Nhật ký.

## Ghi chú

- Chỉ ghi từ lúc triển khai: các thay đổi trước đó không có nhật ký.
- Chưa ghi: đơn bị gỡ gán khi khoá tài xế / đổi vai trò, thay đổi giá, kho, vỏ bao, nhân sự.
- Hệ thống hiện không có chức năng sửa số lượng của đơn đã lên; nếu thêm sau thì cần ghi nhật ký ở đó.
- Lên đơn (đường nóng) thêm một lệnh ghi trong transaction, không thêm lượt đọc nào: tên sản phẩm lấy từ truy vấn kiểm tra sản phẩm sẵn có.
- Chưa có xuất CSV, tìm kiếm theo chữ, hay lọc theo ngày/người.
