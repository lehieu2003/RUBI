---
status: complete
---

# Quick Task 261012-mcl Summary: màn "Kho lạnh"

**Date:** 2026-10-12 · **Branch:** `feat/mobile-cold-storage` (xếp trên `feat/mobile-shift-review`) · **Status:** complete ✓

## Shipped

1. **Tab "Kho lạnh"** cho Quản lý (Duyệt ca, Kho lạnh, Cài đặt).
2. **Tổng tồn** (số bao, khối lượng) và **từng sản phẩm đang bán**: tồn trên sổ, còn bán được. Tồn âm hiện đỏ kèm lời nhắc.
3. **Cảnh báo sắp hết**: khung đỏ liệt kê sản phẩm ("còn bán được 18 Bao (mức cảnh báo 20)") và nhãn "Sắp hết" trên thẻ. Cờ này do server tính, app không tự tính lại.
4. **Nhập mẻ** (số lượng > 0) và **Kiểm kho** (số đếm ≥ 0, ghi chú tuỳ chọn) từ sheet trên từng sản phẩm; xong thì báo tồn mới và tải lại cả kho.
5. Kéo xuống để tải lại.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 362/362 (348 test cũ, 14 test mới): cubit và màn hình. Bài test màn 360dp với tên sản phẩm dài bắt được hai nút thao tác tràn ngang; đã cho xuống dòng (Wrap).
- **Giả lập + server thật** (`scripts/mobile-e2e-local.sh`): sau khi duyệt ca, Quản lý mở "Kho lạnh" (tồn tải từ server), nhập một mẻ 5, thấy câu "Đã nhập 5 …". Cả bài test và bước kiểm tra phía server đều qua.

## Ghi chú

- Mức cảnh báo vẫn đặt trên web (Sản phẩm & giá); app chỉ hiển thị.
- Chưa có lịch sử kiểm kho trên app.
- Số trong màn này định dạng kiểu Việt Nam (dấu chấm ngăn nghìn) bằng một hàm nhỏ trong file, chưa dùng `intl`.
