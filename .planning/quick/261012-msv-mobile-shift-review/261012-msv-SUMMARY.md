---
status: complete
---

# Quick Task 261012-msv Summary: màn "Duyệt ca"

**Date:** 2026-10-12 · **Branch:** `feat/mobile-shift-review` · **Status:** complete ✓

## Shipped

1. **Tab "Duyệt ca"** là tab đầu của Quản lý (Duyệt ca, Cài đặt).
2. **Xem theo tuần và theo ngày**: thanh tuần, dải 7 ngày (chấm những ngày còn yêu cầu chờ duyệt), mở ở hôm nay.
3. **Mỗi ngày liệt kê các khung giờ có người**: tên, vai trò (Nhân viên / Tài xế), trạng thái. Yêu cầu chờ duyệt xếp trước và có hai nút Duyệt / Từ chối.
4. **"Duyệt tất cả"** cho mọi yêu cầu đang chờ trong tuần, có hỏi lại trước khi gửi.
5. Sau mỗi lần duyệt / từ chối, và khi server báo tháng đã chốt công (409), app tải lại lịch thật.
6. `WeekNavBar` và `WeekDayStrip` tách ra dùng chung cho "Ca làm" và "Duyệt ca".

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 348/348 (329 test cũ, 19 test mới): luật sắp xếp, cubit, màn hình (kể cả màn 360dp với tên dài).
- **Giả lập + server thật** (`scripts/mobile-e2e-local.sh`): tài xế xin ca cuối ngày mai trong app → Quản lý đăng nhập, vào "Duyệt ca", chọn ngày mai, bấm Duyệt → thấy "Đã duyệt 1 ca". Script kiểm tra lại trên server: ca đó ở trạng thái APPROVED.

## Ghi chú

- Quản lý chưa tự gán / gỡ ca cho người khác trên app, và chưa sửa được ca đã duyệt (trên web làm được).
- "Hôm nay" trên dải ngày của màn này lấy theo đồng hồ của máy (API này không trả ngày của server).
