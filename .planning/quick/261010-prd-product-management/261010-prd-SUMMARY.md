---
status: complete
---

# Quick Task 261010-prd Summary: Quản lý sản phẩm (thêm, sửa, ngừng bán)

**Date:** 2026-10-10 · **Branch:** `feat/product-management` · **Status:** complete ✓

## Shipped

1. **API** — `POST /api/products` (kèm giá chung bắt buộc) và `PATCH /api/products/{id}`; chỉ ADMIN; không xoá cứng; trùng tên + cỡ và đổi cỡ của sản phẩm đã có đơn đều trả 409.
2. **Màn "Sản phẩm & giá"** (`/config/prices`) — thêm, sửa tên/đơn vị/cỡ/giá, ngừng bán và bán lại; có lại trong menu Quản lý.
3. **Lưới lên đơn** dựng từ danh mục: sản phẩm mới, và cả Đá Cây 50kg / Đá Mi 20kg của seed vốn không lên đơn được trên giao diện, giờ đều nhập được.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 240/240 · build xong.
- `contract:verify --record` trên DB mới seed: 52/52 contract, 141 lượt gọi; fixture ghi lại.
- Chrome (Playwright, Postgres tạm) 22/22: Quản lý thêm sản phẩm → trùng tên bị từ chối → Nhân viên không thấy menu và không vào được màn → Nhân viên lên đơn sản phẩm mới đúng giá → Quản lý sửa đơn vị và giá (cỡ bị khoá vì đã có đơn, đơn cũ giữ giá cũ) → ngừng bán thì drawer không còn hiện, đơn cũ vẫn hiện → bán lại.
- Lưới 5 cột cỡ bao vừa drawer trên máy tính (461/461px). Trên điện thoại 390px lưới cuộn ngang; trước thay đổi lưới 3 cột cũng đã cuộn.

## Chưa làm

- Sản phẩm đang có tồn kho hoặc đang nằm trong đơn chưa giao vẫn ngừng bán được, không có cảnh báo.
- Trang giá riêng của khách (`/customers/[id]`) vẫn chưa có link dẫn tới.
