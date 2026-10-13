---
status: complete
---

# Quick Task 261013-aco Summary: API tạo đơn cho app di động

**Date:** 2026-10-13 · **Branch:** `feat/api-create-order` · **Status:** complete ✓ (chỉ server; app chưa gọi)

## Shipped

1. **`POST /api/orders`** (Quản lý, Nhân viên): body `{ customerId, items: [{ productId, quantity }], notes? }`, trả 201 với `{ id, status, total, createdAt, customerName }`. Route gọi thẳng `saveOrder` — cùng một chỗ tính giá và ghi nhật ký với ngăn lên đơn của web, không có đường tạo đơn thứ hai.
   - Body không có giá; dòng số lượng 0 bị bỏ; phải có ít nhất một dòng lớn hơn 0.
   - 404 khách không tồn tại; 400 sản phẩm không tồn tại / ngừng bán / chưa có giá.
   - `notes` (tối đa 500 ký tự): dặn dò cho tài xế. Web chưa gửi trường này.
2. **`GET /api/customers/{id}/prices`** (Quản lý, Nhân viên): mọi sản phẩm đang bán với `price` (giá riêng của khách, không có thì giá chung; `null` nếu chưa có giá) và `sellable` (tồn sổ sách trừ đơn chưa đối soát; `null` nếu chưa từng có số tồn). Dùng lại `loadCustomerPrices` và `loadSellableStock` của web.
3. `saveOrder` trả thêm `status` khi thất bại (`OrderEntryError`), nhận thêm `notes`. Hành vi của web không đổi.
4. Contract `createOrder`, `listCustomerPrices`; 8 fixture mới; OpenAPI sinh lại; bộ xác minh contract gọi cả hai endpoint.

## Verification

- `npm run test`: 294/294 (7 test mới). `lint`: 0 lỗi (65 cảnh báo có từ trước). `typecheck`: sạch.
- `contract:verify --record` với server build từ nhánh này trên Postgres dùng một lần: 57/57 contract, 187 lượt gọi. Ngoài hình dạng response, nó kiểm: tổng tiền = 3 × giá trong bảng giá của khách; đơn lưu đúng một dòng (dòng 0 bị bỏ) và ghi chú; `sellable` giảm đúng 3 sau khi lên đơn; 400 / 401 / 403 / 404 đúng chỗ.

## Ghi chú

- Không kiểm tồn kho khi lên đơn (như web): đơn có thể vượt số còn bán được.
- Chưa có chống gửi trùng: app gửi lại sau khi mất mạng có thể tạo hai đơn. Cần tính khi làm màn lên đơn.
- Không đổi schema.
