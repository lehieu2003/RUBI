---
status: complete
---

# Quick Task 261010-sch Summary: Lưu lịch sử kiểm kho

**Date:** 2026-10-10 · **Branch:** `feat/stock-count-history` · **Status:** complete ✓

## Shipped

1. **Bảng `stock_counts`** qua migration `20261010160000_add_stock_counts` (chỉ `CREATE TABLE`, index và khoá ngoại).
2. **Mỗi lần kiểm kho được lưu**: số trên sổ đọc trong cùng transaction trước khi bị thay, số đếm, ghi chú, người kiểm.
3. **`GET /api/inventory/counts`** — chỉ Quản lý, phân trang, mới nhất trước, có `difference`.
4. **Màn Kho lạnh**: ô ghi chú khi kiểm kho và bảng "Lịch sử kiểm kho" (20 dòng, nút "Xem thêm").

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 253/253 · build xong.
- `prisma migrate deploy` trên DB trống áp đủ 8 migration; không lệch giữa schema và DB.
- `contract:verify` 53/53, 148 lượt gọi; ghi fixture mới cho `listStockCounts`.
- Chrome (Playwright, Postgres tạm) 9/9: kiểm kho Đá Viên 10kg 200 → 188 kèm ghi chú → dòng mới nhất hiện đủ sản phẩm, 200, 188, -12, ghi chú, tên người kiểm → nhập sản lượng không sinh dòng lịch sử → 27 dòng hiện 20 rồi "Xem thêm" ra đủ → nhân viên gọi API nhận 403.

## Ghi chú

- Migration được đặt tên `20261010160000` để xếp sau `20261010150000_drop_driver_share_link`; tên Prisma sinh theo giờ thật (13:55) sẽ xếp trước nó.
- Các lần kiểm kho làm trước khi có bảng này không có lịch sử.
- Chưa có lọc theo sản phẩm/khoảng ngày, tổng hao hụt theo kỳ, hay xuất CSV cho lịch sử.
