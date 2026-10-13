---
status: complete
---

# Quick Task 261013-msw Summary: widget dùng chung và AppHeader

**Date:** 2026-10-13 · **Branch:** `refactor/mobile-shared-widgets` · **Status:** complete ✓

## Shipped

1. **`AppHeader`** thay `AppBar` ở cả 12 màn: nền màu chủ đạo chuyển sắc nhẹ, bo hai góc dưới, tiêu đề đậm canh trái, dòng mô tả tuỳ chọn (đang dùng ở Đơn hàng, Đối soát, Nhật ký), `actions` tuỳ chọn. Bản tối dùng tông trầm.
2. **`AppButton`**: rộng hết chỗ, cao 48dp; `variant` (primary / secondary / text), `icon`, `loading`, `danger`. Thay 6 chỗ (xác nhận giao, thu tiền, chốt đơn, các thao tác của đơn, huỷ đơn, đăng xuất ở màn đổi mật khẩu).
3. **`LoadingView`** (12 chỗ), **`EmptyView`** (7 chỗ), **`LoadMoreButton`** (4 chỗ), **`SearchField`** (2 chỗ, gồm cả phần chờ ngừng gõ), **`messenger.showMessage`** (6 chỗ).
4. README: bảng các widget dùng chung.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 462/462 — 450 test cũ qua mà **không sửa dòng nào**, 12 test mới cho các widget dùng chung (gồm độ tương phản chữ / nền của header ở bản sáng và tối, màn 320dp).
- `scripts/mobile-e2e-local.sh` trên emulator: qua hết; ảnh chụp trong lúc chạy cho thấy header mới ở các màn Ca làm, Đơn hàng, Công nợ.

## Thay đổi nhìn thấy được

- Header mọi màn (chủ ý).
- Nút "Xác nhận chốt" khi đang gửi: vòng xoay đứng cạnh chữ thay vì thay chữ.
- Nút "Thu tiền", "Xác nhận đã giao": như cũ.

## Ghi chú

- Chưa gom: các nút trong hộp thoại và trong bảng nhập kho / thu tiền (kích thước riêng), ba snackbar không thay câu đang hiện.
