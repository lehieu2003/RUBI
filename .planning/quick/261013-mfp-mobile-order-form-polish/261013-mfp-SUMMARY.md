---
status: complete
---

# Quick Task 261013-mfp Summary: gõ số thực giao, hỏi lại khi bỏ đơn đang nhập

**Date:** 2026-10-13 · **Branch:** `feat/mobile-order-form-polish` (xếp chồng trên `feat/mobile-order-filters`) · **Status:** complete ✓

## Shipped

1. **`QuantityStepper`** (`presentation/widgets/quantity_stepper.dart`): ô gõ số kèm nút giảm / tăng, tách ra từ màn lên đơn để bảng đối soát dùng chung.
2. **Đối soát**: số thực giao giờ gõ thẳng được (xoá trắng là 0; số 0 hiện rõ "0"); số lệch so với số đặt vẫn tô đỏ; bảng dâng lên theo bàn phím.
3. **Lên đơn**: đã nhập số lượng mà bấm quay lại (nút trên thanh đầu hay nút của máy) thì hỏi "Bỏ đơn đang nhập?" — "Ở lại" giữ nguyên, "Bỏ đơn" mới thoát. Chưa nhập gì thì thoát luôn.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 517/517 (512 test cũ, 5 test mới).
- `scripts/mobile-e2e-local.sh` trên emulator: qua hết (lên đơn và đối soát vẫn chạy với ô số lượng mới).

## Ghi chú

- Hai lần bấm giảm / tăng trong cùng một khung hình (dưới 16ms) chỉ tính một; người dùng thật không bấm nhanh tới mức đó.
