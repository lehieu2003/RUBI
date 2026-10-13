---
status: complete
---

# Quick Task 261013-mst Summary: Đối soát cho Quản lý

**Date:** 2026-10-13 · **Branch:** `feat/mobile-settlement` · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu** (commit riêng, đứng trước): `OrdersRepository.settle(order, actualQty)` — `PATCH /api/orders/{id}/reconcile`. Luôn gửi đủ mọi dòng của đơn (dòng không sửa lấy số đặt), vì server chỉ ghi nợ và trừ kho các dòng nó nhận được.
2. **`OrdersCubit.settle`**: chốt xong hay bị từ chối đều tải lại danh sách.
3. **`SettlementScreen`** ("Thêm" → "Đối soát", chỉ Quản lý):
   - các đơn đã giao chờ chốt, kèm số đơn đang chờ, tìm kiếm, "Xem thêm";
   - bấm một đơn: số thực giao từng dòng (mở ra bằng số đặt, nút giảm / tăng, không xuống dưới 0, số lệch được tô nổi), số tiền sẽ ghi nợ tính lại theo từng lần bấm, câu nhắc không sửa lại được, nút "Xác nhận chốt".
4. Thẻ đơn và nhãn trạng thái tách ra `presentation/widgets/order_card.dart` để màn Đơn hàng và màn Đối soát dùng chung.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 450/450 (439 test cũ, 11 test mới: 2 repository, 2 cubit, 7 màn hình gồm màn 360dp).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật (Postgres dùng một lần): sau khi tài xế giao đơn, Quản lý vào "Đối soát", giảm một bao ở dòng đầu rồi chốt. Server: đơn `COMPLETED`, dòng đầu có số thực giao = số đặt − 1, nhật ký có `ORDER_SETTLED`.

## Ghi chú

- Menu "Thêm" của Quản lý giờ có ba mục (Đơn hàng, Đối soát, Nhật ký) nên trên màn hình thấp phải cuộn mới tới Đăng xuất.
- Số thực giao chỉnh bằng nút giảm / tăng, chưa gõ số trực tiếp được.
