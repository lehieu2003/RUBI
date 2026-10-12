---
status: complete
---

# Quick Task 261012-mma Summary: tab "Thêm" và màn "Nhật ký"

**Date:** 2026-10-12 · **Branch:** `feat/mobile-more-audit-log` · **Status:** complete ✓

## Shipped

1. **Tab "Thêm"** thay cho "Cài đặt" trên thanh dưới của Quản lý: Duyệt ca, Kho lạnh, Công nợ, Thêm. Trong "Thêm": thẻ tài khoản, lối vào Nhật ký, rồi giao diện sáng/tối, đổi mật khẩu, đăng xuất như cũ. Tài xế và Nhân viên không đổi (vẫn là "Cài đặt").
2. **Màn "Nhật ký"**: ai đã làm gì với đơn hàng và công nợ, lúc nào. Mỗi dòng có thao tác, nội dung, người thực hiện, mã đơn, khách. Lọc Tất cả / Đơn hàng / Công nợ; "Xem thêm" để tải trang kế. Chỉ đọc.
3. **Lớp dữ liệu nhật ký** (`AuditRepository`), commit riêng trước phần màn hình. Mã thao tác giữ nguyên chuỗi của server: loại mới thêm sau vẫn hiện được.
4. `SettingsTab` nhận `title` và `menu`, để "Thêm" dùng lại nguyên phần cài đặt.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 395/395 (379 test cũ, 16 test mới): repository, cubit (kể cả đổi bộ lọc nhanh), màn hình (kể cả màn 360dp), tab theo vai trò.
- **Giả lập + server thật** (`scripts/mobile-e2e-local.sh`): sau khi duyệt ca, nhập mẻ và thu tiền, Quản lý vào "Thêm" → "Nhật ký", thấy dòng thu tiền vừa ghi ("Thu thử từ app"); lọc "Đơn hàng" thì thấy dòng tài xế xác nhận giao và không còn dòng thu tiền.

## Quy ước từ nay

Thanh dưới không quá 4 tab cho bất kỳ vai trò nào (có test giữ). Màn mới của Quản lý (đơn hàng, đối soát…) thêm vào "Thêm", không thêm tab.

## Ghi chú

- Nhật ký chưa lọc theo ngày hay theo người, và bấm vào mã đơn chưa mở đơn (app chưa có màn đơn hàng cho Quản lý).
