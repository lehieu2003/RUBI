---
status: complete
---

# Quick Task 261012-mdn Summary: ghi chú của đơn và tự làm mới

**Date:** 2026-10-12 · **Branch:** `feat/mobile-driver-notes-refresh` · **Status:** complete ✓

## Shipped

1. **Ghi chú của đơn trên thẻ giao hàng**: khung màu riêng dưới địa chỉ, tối đa 4 dòng. Có ở tab Hôm nay và Lịch sử. Đơn không có ghi chú thì không có khung.
2. **Tự làm mới**: mở lại app từ nền thì tab Hôm nay tải lại danh sách, vẫn giữ các đơn đang hiện trong lúc tải.
3. Sau khi xác nhận đã giao, thẻ đơn vẫn giữ ghi chú.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 284/284 (277 test cũ, 7 test mới): mapper, thẻ đơn (kể cả ghi chú rất dài trên màn 320dp), cubit, tab.

## Ghi chú

- Đơn bị huỷ có ghi chú dạng `[HỦY: lý do]`, nhưng đơn huỷ không nằm trong danh sách của tài xế nên không hiện.
- Không tự làm mới theo chu kỳ khi app đang mở sẵn trên màn hình: vẫn cần kéo xuống hoặc đổi tab.
- Chưa chạy lại bài test trên giả lập cho thay đổi này.
