---
status: complete
---

# Quick Task 261012-mdb Summary: màn "Công nợ"

**Date:** 2026-10-12 · **Branch:** `feat/mobile-debt` (xếp trên `feat/mobile-cold-storage`) · **Status:** complete ✓

## Shipped

1. **Tab "Công nợ"** cho Quản lý (Duyệt ca, Kho lạnh, Công nợ, Cài đặt).
2. **Tổng nợ** và **từng khách đang nợ** (nợ nhiều nhất trước): số nợ, lần trả gần nhất.
3. **Sổ nợ của một khách** (bấm vào khách): số còn nợ, các dòng ghi nợ (+, đỏ) và thu tiền (−) mới nhất trước, "Xem thêm" để tải trang kế.
4. **Thu tiền**: số tiền và ghi chú. Chặn trên máy số 0 và số vượt số đang nợ; server vẫn kiểm lại. Xong thì dòng mới lên đầu sổ, số còn nợ cập nhật theo server, và quay lại danh sách thì tải lại.
5. `formatVnd` / `formatQuantity` chuyển về `core/extensions/number_format.dart` để mọi feature dùng.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 379/379 (362 test cũ, 17 test mới): hai cubit và hai màn hình (kể cả màn 360dp với tên khách dài).
- **Giả lập + server thật** (`scripts/mobile-e2e-local.sh`): Quản lý mở "Công nợ" (báo cáo tải từ server), vào sổ nợ của khách đầu tiên, thu 1.000đ kèm ghi chú, thấy "Đã thu 1.000đ" và dòng −1.000đ trong sổ. Script kiểm tra trên server: nhật ký có dòng `DEBT_PAYMENT` với đúng ghi chú đó.

## Ghi chú

- Dòng ghi nợ không hiện ghi chú: server lưu ở đó một chuỗi kỹ thuật ("Order … delivered").
- Chưa có: tìm khách, lọc, xuất file, và phương thức thanh toán (tiền mặt / chuyển khoản) — phần cuối cũng chưa có trên web.
- Quản lý giờ có 4 tab; thêm màn nữa (đơn hàng, đối soát, nhật ký) thì thanh dưới sẽ chật, cần nghĩ lại cách điều hướng.
