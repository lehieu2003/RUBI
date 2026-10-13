---
status: complete
---

# Quick Task 261013-moe Summary: lớp dữ liệu lên đơn

**Date:** 2026-10-13 · **Branch:** `feat/mobile-order-entry-data` · **Status:** complete ✓ (chỉ data layer; chưa có màn hình)

## Shipped

1. Entity `CustomerOption`, `PricedProduct` (`price` và `sellable` có thể `null`; `canOrder`), `CreatedOrder` (`code`).
2. **`OrderEntryRepository`**:
   - `getCustomers` — `GET /api/customers` (không phân trang: màn lên đơn tìm ngay trên máy);
   - `getPriceList(customerId)` — `GET /api/customers/{id}/prices`;
   - `createOrder(customerId, quantities, notes)` — `POST /api/orders`; chỉ gửi dòng lớn hơn 0, không gửi giá, không có dòng nào thì báo lỗi ngay mà không gọi server.
3. Đăng ký DI.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 473/473 (462 test cũ, 11 test mới).
- Test đọc thẳng response thật của server đã ghi (`listCustomers`, `listCustomerPrices`, `createOrder`, và lỗi 404 của `listCustomerPrices`).

## Ghi chú

- Chống gửi trùng khi rớt mạng để ở tầng màn hình (khoá nút khi đang gửi; lỗi mạng thì nhắc xem lại danh sách đơn trước khi gửi lại).
