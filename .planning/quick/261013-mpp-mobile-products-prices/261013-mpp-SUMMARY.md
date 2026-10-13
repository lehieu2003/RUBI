---
status: complete
---

# Quick Task 261013-mpp Summary: Sản phẩm & giá trên app

**Date:** 2026-10-13 · **Branch:** `feat/mobile-products-prices` (xếp chồng trên `feat/api-read-prices`) · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu** (commit đầu): feature `products` — `Product`, `ProductsRepository` (`GET /api/prices/global`, `POST /api/products`, `PATCH /api/products/{id}`, `POST /api/prices/global`).
2. **Màn "Sản phẩm & giá"** ("Thêm" → "Sản phẩm & giá", chỉ Quản lý): sản phẩm đang bán rồi tới nhóm "Đã ngừng bán"; mỗi dòng có tên kèm cỡ, đơn vị, mức cảnh báo tồn kho và giá mặc định. Sản phẩm đang bán mà chưa có giá được tô đỏ.
3. **Thêm sản phẩm**: tên, cỡ bao, đơn vị (mặc định "Bao"), giá, mức cảnh báo (tuỳ chọn).
4. **Bấm một sản phẩm**: đổi giá (ô mở sẵn giá cũ, kèm câu nhắc đơn đã lên giữ giá cũ); sửa tên, đơn vị, mức cảnh báo (để trống là tắt cảnh báo); ngừng bán (có hỏi lại) hoặc bán lại.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 593/593 (570 test cũ, 23 test mới; test repository đọc response thật của server).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Quản lý đổi giá mặc định của sản phẩm đầu thành 12.345đ; server trả đúng giá đó ở `GET /api/prices/global`.

## Ghi chú

- Không cho đổi cỡ bao trên app (server từ chối với sản phẩm đã có đơn).
- Giá riêng của từng khách chưa làm trong bước này; API đã sẵn (`customPrice`).
