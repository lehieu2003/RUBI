---
status: complete
---

# Quick Task 261013-mes Summary: màn lên đơn

**Date:** 2026-10-13 · **Branch:** `feat/mobile-order-entry-screen` (xếp chồng trên `feat/mobile-order-entry-data`) · **Status:** complete ✓

## Shipped

1. **Nút "Lên đơn"** trên thanh đầu của màn Đơn hàng (Nhân viên: tab đầu; Quản lý: "Thêm" → "Đơn hàng").
2. **`OrderEntryScreen`**, hai bước trong một màn:
   - *Chọn khách*: ô tìm có sẵn con trỏ; lọc ngay trên máy theo tên (không cần gõ dấu), mã hoặc số điện thoại.
   - *Nhập đơn*: mỗi sản phẩm đang bán một dòng — giá của khách, số còn bán được (tô đỏ khi hết hoặc đặt quá), ô gõ số lượng và nút giảm / tăng; sản phẩm chưa có giá bị khoá kèm câu báo. Ghi chú cho tài xế. Thanh dưới: tạm tính và "Lưu đơn".
   - Lưu xong: đóng màn, báo mã đơn và tổng tiền server tính, tải lại danh sách.
3. **Chống gửi trùng**: nút khoá khi đang gửi; rớt mạng thì nhắc "xem lại danh sách đơn trước khi lưu lại, kẻo trùng đơn" thay vì mời bấm lại.
4. `foldVietnamese` (`core/extensions/search_text.dart`): chữ thường, bỏ dấu.
5. **Đăng xuất xoá các câu báo còn treo** (`app.dart`): trước đây câu báo của phiên trước theo sang người kế tiếp và đè lên nút ở đáy màn hình.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 504/504 (473 test cũ, 31 test mới).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Nhân viên gõ "gio bien" tìm ra Quán Nhậu Gió Biển, đặt 2 bao, ghi chú, lưu; rồi gán đơn đó cho tài xế và huỷ. Server: nhật ký có `ORDER_CREATED`, `ORDER_ASSIGNED` và lý do huỷ của cùng một đơn.

## Phát hiện khi chạy emulator

- Bản đầu dùng nút nổi ở góc dưới: câu báo ở đáy màn hình che mất nút → dời lên thanh đầu.
- Câu báo của phiên tài xế còn treo sau khi đổi tài khoản, đè lên "Lưu đơn" → mục 5.
- Dòng tạm tính bị cắt chữ và số tiền không canh phải → sửa bố cục.

## Ghi chú

- Tạm tính là theo bảng giá lúc mở form; con số chốt là của server.
- Thoát màn khi đã nhập số lượng không hỏi lại.
- Không chặn đặt quá số còn bán được (chỉ tô đỏ), như web.
