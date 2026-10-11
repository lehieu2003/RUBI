---
status: complete
---

# Quick Task 261011-lsa Summary: Cảnh báo tồn kho thấp

**Date:** 2026-10-11 · **Branch:** `feat/low-stock-alert` · **Status:** complete ✓

## Shipped

1. **Mức cảnh báo theo từng sản phẩm** (`products.min_stock`, migration `20261011100000_add_product_min_stock`, chỉ `ADD COLUMN`). Quản lý đặt ở Sản phẩm & giá, ô "Cảnh báo khi tồn còn"; để trống là không cảnh báo.
2. **Cảnh báo tính trên số còn bán được** = tồn trên sổ trừ các đơn chưa đối soát, cùng cách tính với ngăn lên đơn. Tồn trên sổ chỉ giảm lúc đối soát, nên so với nó thì cảnh báo sẽ trễ một ngày.
3. **Kho lạnh**: băng "Sắp hết hàng" liệt kê sản phẩm, nhãn "Sắp hết" trên dòng, cột mới "Còn bán được".
4. **Tổng quan** (Quản lý và Nhân viên): thẻ "Tồn kho lạnh" chuyển đỏ và ghi "Sắp hết: …".
5. **API**: `minStock` trong tạo/sửa sản phẩm và trong mọi đối tượng Product; `GET /api/inventory` thêm `sellable`, `minStock`, `lowStock`.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 279/279 · build xong.
- `prisma migrate deploy` trên DB trống áp đủ 10 migration; không lệch giữa schema và DB.
- `contract:verify` 54/54, 168 lượt gọi; `contract:docs --check` khớp.
- Chrome (Playwright, Postgres tạm) 30/30, trong đó 4 bài mới của `e2e/low-stock.spec.ts`: đặt mức 20 → còn bán được 30 thì chưa báo → thêm đơn 12 bao thì Kho lạnh và Tổng quan (cả Quản lý lẫn Nhân viên) báo "còn 18" trong khi sổ không đổi → nhập thêm 10 bao thì hết báo → xoá mức thì tắt cảnh báo.

## Ghi chú

- Fixture của 6 endpoint được thêm trường mới bằng tay (không ghi lại toàn bộ để tránh đổi id hàng loạt).
- Chưa có thông báo đẩy/Zalo; cảnh báo chỉ hiện khi mở màn hình.
- App di động nhận thêm trường `minStock` trong Product; chưa kiểm tra app.
