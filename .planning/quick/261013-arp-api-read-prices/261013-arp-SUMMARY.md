---
status: complete
---

# Quick Task 261013-arp Summary: API đọc giá

**Date:** 2026-10-13 · **Branch:** `feat/api-read-prices` · **Status:** complete ✓ (chỉ server; app chưa gọi phần mới)

## Shipped

1. **`GET /api/prices/global`** (Quản lý): mọi sản phẩm của nhà máy với `price` (giá mặc định; `null` nếu chưa có), `minStock`, `isActive` — gồm cả sản phẩm đã ngừng bán để bật lại được. Theo tên rồi kích cỡ.
2. **`GET /api/customers/{id}/prices`**: thêm `basePrice` (giá mặc định) và `customPrice` (giá riêng của khách, `null` nếu không có). `price` vẫn là giá tính cho đơn (`customPrice ?? basePrice`), nên app bản đã phát hành chạy như cũ.
3. Contract `listGlobalPrices`, contract `listCustomerPrices` cập nhật; fixture mới và ghi lại; OpenAPI sinh lại; bộ xác minh contract kiểm cả hai.

## Verification

- `npm run test`: 297/297. `lint`: 0 lỗi. `typecheck`: sạch.
- `contract:verify --record` với server build từ nhánh này trên Postgres dùng một lần: 58/58 contract, 192 lượt gọi. Kiểm thêm: giá mặc định vừa đặt hiện đúng trong danh sách; sản phẩm ngừng bán vẫn có trong danh sách với `isActive: false`; đặt giá riêng thì `customPrice` / `basePrice` / `price` là 11000 / 12000 / 11000, gỡ giá riêng thì `customPrice` về `null` và `price` về 12000.
- Test lớp dữ liệu của app đọc fixture `listCustomerPrices` vừa ghi lại: vẫn qua.

## Ghi chú

- Không đổi schema. Thay đổi response chỉ là thêm trường.
