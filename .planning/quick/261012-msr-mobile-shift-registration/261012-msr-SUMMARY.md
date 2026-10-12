---
status: complete
---

# Quick Task 261012-msr Summary: App di động — tab "Ca làm"

**Date:** 2026-10-12 · **Branch:** `feat/mobile-shift-registration` · **Status:** complete ✓

## Shipped

1. **Tab thứ tư "Ca làm"** trong thanh dưới (Hôm nay / Lịch sử / Ca làm / Cài đặt).
2. **Xem lịch tuần**: thanh "◀ Tuần 12/10 – 18/10 ▶", dải 7 ngày (ngày có ca của mình được chấm), mở ở hôm nay.
3. **Mỗi ngày 8 khung giờ 3 tiếng**: giờ, trạng thái ca của mình (Đã duyệt / Chờ duyệt / Bị từ chối), tên những người đã có ca.
4. **Thao tác**: Đăng ký (ca trống), Huỷ (ca đang chờ duyệt), Đăng ký lại (ca bị từ chối). Ca đã duyệt không có nút.
5. **Khoá khung giờ theo đúng luật của web và server**: Đã qua, Đã qua giờ (ca của hôm nay đã kết thúc), Đã chốt công, Đã đủ người (tính riêng theo vai trò).
6. **Lời nhắc và số ca trong tuần** theo trạng thái; kéo xuống để tải lại.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 273/273 (244 test cũ, 29 test mới): luật ca, cubit, màn hình.
- Test bố cục trên màn hình 360dp với tên dài và đủ mọi trạng thái đã bắt được một lỗi tràn (trạng thái nằm cùng dòng với giờ); đã sửa bằng cách đưa trạng thái xuống dòng riêng.

## Ghi chú

- Chưa chạy trên máy/giả lập và chưa gọi server thật.
- Sau mỗi lần đăng ký / huỷ thành công, và khi server trả 409 (đủ người, đã duyệt, đã chốt công), app tải lại lịch thay vì tự đoán.
- Không đưa `code` của lỗi (`SHIFT_FULL`, `PAYROLL_LOCKED`) vào `ServerFailure`: app chỉ cần biết là 409 để tải lại, còn câu hiển thị là câu của server.
- Giờ "hôm nay" và "đã qua giờ" lấy theo server (giờ Việt Nam), không theo đồng hồ của máy; riêng tuần mở đầu tiên tính từ đồng hồ của máy.
- Tab chỉ dành cho tài xế như phần còn lại của app (nhân viên văn phòng chưa đăng nhập được app).
