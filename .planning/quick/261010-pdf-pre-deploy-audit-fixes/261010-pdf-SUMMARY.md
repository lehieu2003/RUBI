---
status: complete
---

# Quick Task 261010-pdf Summary: Sửa các lỗi cần xử lý trước khi deploy

**Date:** 2026-10-10 · **Commits:** `5a5ae6a`, `d0d0659`, `f95813c`, `04c8064` trên `fix/pre-deploy-audit-fixes` · **Status:** complete ✓

## Shipped

1. **Confirm giao hàng** chỉ nhận đơn SHIPPING (409 `ORDER_NOT_SHIPPING`), lần ghi lặp lại điều kiện trạng thái; đơn đã DELIVERED trả thành công không đổi.
2. **Danh sách đơn của tài xế** giữ đơn SHIPPING từ ngày trước; DELIVERED lọc theo `deliveredAt` (thiếu thì theo `createdAt`).
3. **bulk-assign** mở cho STAFF và chỉ gán cho tài xế còn hoạt động; **xoá nhân sự** tắt luôn `Driver`.
4. **saveOrder** tính giá ở server, yêu cầu ADMIN/STAFF, kiểm tra khách và sản phẩm thuộc nhà máy.
5. **/settle** liệt kê mọi đơn DELIVERED chờ đối soát.
6. **Bảo trì**: ngày sai trả 400.

## Verification

- `npm run lint` 0 lỗi (67 cảnh báo, như trước) · `tsc --noEmit` 0 lỗi · suite **225/225** · `next build` xong.
- `contract:verify` **50/50** contract, 134 lượt gọi, trên server build + Postgres tạm (Docker, cổng 55432), có thêm các lượt kiểm 409 của confirm và STAFF gán tài xế.
- Gọi trực tiếp: đơn SHIPPING tạo hôm qua hiện trong danh sách tài xế; confirm 200, lặp lại 200; đơn COMPLETED/CANCELLED confirm trả 409 và giữ nguyên trạng thái; đơn đó có trong `?status=DELIVERED`; server action với `unitPrice: 1` lưu 3 × 12.000 = 36.000; sản phẩm/khách lạ bị từ chối, không tạo đơn; ngày bảo trì sai 400, đúng 201; xoá tài khoản tài xế → `drivers.isActive = false`, gán cho tài xế đó trả 404.

## Chưa kiểm

- Màn `/settle` và drawer lên đơn chưa được bấm thử trên trình duyệt (chỉ kiểm qua API, build và test nguồn).
- Fixture lỗi 409 của `confirmDelivery` chưa được ghi lại (`contract:verify --record`).

## Sau code review (cùng ngày)

- Route `status`: văn phòng đánh dấu DELIVERED thì ghi `deliveredAt`, mở lại đơn thì xoá — nếu không, đơn ngày trước do văn phòng đánh dấu sẽ rơi khỏi danh sách tài xế.
- `saveOrder`: một lượt truy vấn song song, chỉ lấy giá của sản phẩm được đặt; sản phẩm chưa có giá thì từ chối thay vì bán 0đ.
- `/settle`: báo thành công và đóng hộp thoại trước khi tải lại, lỗi tải lại không còn bị báo thành "Chốt đơn thất bại".
- Ngày bảo trì: chỉ nhận ISO timestamp hoặc ngày lịch có thật (`2026-02-31` trả 400).
- Kiểm lại: suite 226/226, `contract:verify` 50/50, gọi trực tiếp từng trường hợp trên Postgres tạm.
- Để lại: thẻ "đã đối soát hôm nay" chỉ đếm đơn tạo hôm nay; đơn đang giao của tài xế bị vô hiệu hoá không tự gỡ gán; `/settle` tải đơn DELIVERED hôm nay hai lần.
