---
status: complete
---

# Quick Task 261013-mcp Summary: giá riêng của khách

**Date:** 2026-10-13 · **Branch:** `feat/mobile-customer-prices` (xếp chồng trên `feat/mobile-products-prices`) · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu**: `CustomerPrice` có thêm `basePrice` và `customPrice`; `CustomersRepository.setCustomPrice` (`POST /api/prices/customer/override`) và `removeCustomPrice` (`DELETE`).
2. **Màn chi tiết khách**: dòng nào đang dùng giá riêng thì ghi "Giá riêng · Mặc định 12.000đ" (Nhân viên cũng thấy, chỉ xem).
3. **Quản lý** bấm một dòng giá: hộp mở sẵn giá đang áp, hiện giá mặc định để so; "Lưu" đặt giá riêng, "Dùng giá mặc định" gỡ nó. Xong thì bảng giá tải lại.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 600/600 (593 test cũ, 7 test mới; test repository đọc response thật của server, trong đó có một khách đang có giá riêng).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Quản lý đặt giá riêng 11.111đ cho sản phẩm đầu của Đại Lý Nước Ngọt Minh Tâm; server trả `customPrice` và `price` đều là 11111.

## Ghi chú

- Giá riêng áp cho đơn lên từ lúc đặt; đơn đã lên giữ giá cũ (hộp nhập có nhắc).
