---
status: complete
---

# Quick Task 261013-mof Summary: lọc đơn theo ngày và tài xế

**Date:** 2026-10-13 · **Branch:** `feat/mobile-order-filters` · **Status:** complete ✓

## Shipped

1. **`OrdersCubit`**: `setDate(date)` (ngày tạo đơn, bỏ giờ phút; `null` = mọi ngày) và `setDriver(driver | unassignedOnly)`. Bộ lọc cộng dồn với tab trạng thái và từ khoá, áp cho cả danh sách, số đếm trên các tab và "Xem thêm".
2. **`OrderFilterBar`** dưới ô tìm kiếm của màn Đơn hàng:
   - chip ngày: mở lịch (không chọn được ngày mai), đang lọc thì hiện ngày và dấu ✕ để bỏ;
   - chip tài xế: hộp chọn "Mọi tài xế" / "Chưa gán tài xế" / từng tài xế, đang lọc thì hiện tên và dấu ✕.
3. Màn Đối soát dùng chung cubit nhưng không hiện hai chip này.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 512/512 (504 test cũ, 8 test mới).
- `scripts/mobile-e2e-local.sh` trên emulator: qua hết (kiểm không vỡ luồng cũ; kịch bản chưa bấm vào hai chip).
