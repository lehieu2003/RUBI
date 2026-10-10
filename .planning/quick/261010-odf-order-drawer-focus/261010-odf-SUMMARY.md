---
status: complete
---

# Quick Task 261010-odf Summary: Drawer lên đơn mở ra với con trỏ ở ô tìm khách

**Date:** 2026-10-10 · **Branch:** `fix/order-drawer-focus` · **Status:** complete ✓

## Shipped

- `Drawer` bắt đầu ở phần tử có `data-autofocus`; drawer không đánh dấu (chi tiết đơn, tài sản) giữ nguyên hành vi cũ.
- Ô tìm khách trong drawer lên đơn được đánh dấu, nên mở drawer là gõ tên khách được ngay.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 220/220 · build xong.
- Chrome (Playwright, Postgres tạm): từ `/orders` (nhân viên) và `/dashboard` (Quản lý), mở drawer → con trỏ ở ô tìm khách → gõ tên, Enter, gõ số lượng, Enter → đơn được lưu, không dùng chuột sau khi mở. Drawer chi tiết đơn vẫn bắt đầu ở nút đóng, Esc vẫn đóng.
