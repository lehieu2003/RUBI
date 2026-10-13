# Quick Task 261013-mfp: App di động — gõ số thực giao, hỏi lại khi bỏ đơn đang nhập

**Date:** 2026-10-13
**Nguồn:** Hai việc còn treo: ô số thực giao ở Đối soát chỉ có nút giảm / tăng; thoát màn lên đơn khi đã nhập số lượng không hỏi lại.

## Task

**Files:** `mobile/lib/features/orders/presentation/**`
- `QuantityStepper` dùng chung cho màn lên đơn và bảng đối soát (gõ số được ở cả hai).
- Màn lên đơn: đã nhập số lượng thì hỏi lại trước khi thoát.

## Verify

`flutter analyze`, `flutter test`, `scripts/mobile-e2e-local.sh` trên emulator.
