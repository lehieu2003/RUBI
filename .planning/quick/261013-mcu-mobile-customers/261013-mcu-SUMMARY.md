---
status: complete
---

# Quick Task 261013-mcu Summary: Khách hàng trên app

**Date:** 2026-10-13 · **Branch:** `feat/mobile-customers` · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu** (commit đầu): feature `customers` — `Customer`, `CustomerPrice`, `CustomersRepository` (`GET /api/customers`, `GET /api/customers/{id}/prices`, `POST /api/customers`).
2. **Màn "Khách hàng"**: danh bạ, tìm ngay trên máy theo tên (không cần gõ dấu), mã hoặc số điện thoại; kéo để tải lại.
3. **Màn chi tiết**: số điện thoại (bấm để gọi), địa chỉ, bảng giá áp cho khách (sản phẩm chưa có giá ghi rõ "Chưa có giá").
4. **Chỉ Quản lý**: nút "Thêm" (mã, tên, số điện thoại, địa chỉ; trùng mã thì hộp vẫn mở với câu của server) và nút "Sổ nợ và thu tiền" ở màn chi tiết, mở màn sổ nợ đã có.
5. **Lối vào**: Nhân viên có tab "Khách hàng" (thanh dưới: Đơn hàng, Khách hàng, Ca làm, Cài đặt); Quản lý vào từ "Thêm".

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 542/542 (517 test cũ, 25 test mới; test repository đọc response thật của server).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Nhân viên tìm "minh tam", xem bảng giá, không có nút thêm và không có sổ nợ; Quản lý thêm khách `KH-APP` rồi mở sổ nợ của khách vừa thu tiền. Server có khách `KH-APP` đúng tên và số điện thoại.

## Ghi chú

- Feature `customers` không dùng lại code của `orders` (danh sách khách cho màn lên đơn) để các feature vẫn độc lập với nhau; phần ghép với sổ nợ nằm ở `home`.
- Chưa có: sửa / khóa khách (server chưa có API), đặt giá riêng cho khách (API bảng giá chưa cho biết giá nào là giá riêng).
