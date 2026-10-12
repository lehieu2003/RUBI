---
status: complete
---

# Quick Task 261012-mee Summary: test end-to-end mobile trên giả lập

**Date:** 2026-10-12 · **Branch:** `test/mobile-emulator-e2e` · **Status:** complete ✓

## Shipped

1. **`mobile/integration_test/app_e2e_test.dart`**: một tài xế mới đi hết các luồng trên app thật — nhập sai mật khẩu (thấy "Email hoặc mật khẩu không đúng"), đăng nhập đúng thì bị giữ ở màn đổi mật khẩu, nhập sai mật khẩu hiện tại (thấy câu của server), đổi xong vào app, thấy đơn đang giao, bấm ĐÃ GIAO và xác nhận, sang tab Ca làm đăng ký ca cuối của ngày mai rồi huỷ rồi đăng ký lại, đăng xuất, đăng nhập bằng mật khẩu mới.
2. **`scripts/mobile-e2e-local.sh`**: một lệnh chạy tất cả. Server là web app build từ cùng cây mã, chạy cổng 3001 trên Postgres tạm trong Docker; app trên giả lập gọi qua `10.0.2.2:3001`. Không dùng `.env`.
3. **`scripts/mobile-e2e-prepare.mjs`**: tạo tài khoản tài xế (có cờ phải đổi mật khẩu) và một đơn đang giao cho tài xế đó; sau khi test chạy xong thì kiểm tra trên server: đơn đã DELIVERED, nhật ký ghi `ORDER_DELIVERED` đúng tên tài xế, ca `SLOT_21_24` đang chờ duyệt trong lịch của Quản lý. Chỉ chạy với server local.

## Verification

- Chạy `scripts/mobile-e2e-local.sh` trên giả lập Pixel 7 (Android 14): bài test qua, bước kiểm tra phía server qua.
- `flutter analyze`: không có vấn đề. `flutter test`: 277/277.

## Điều lượt chạy này xác nhận

- App gọi được server qua HTTP thường từ giả lập mà không cần sửa manifest.
- Hợp đồng dữ liệu giữa app và server khớp ở đăng nhập, đổi mật khẩu, danh sách đơn, xác nhận giao, lịch ca, đăng ký và huỷ ca.
- Token mới sau khi đổi mật khẩu được lưu và dùng tiếp.

## Ghi chú

- Không chạy trong CI: cần giả lập. `flutter test` thường không chạy thư mục `integration_test/`.
- Giả lập phải được bật sẵn; script đặt múi giờ của nó về giờ Việt Nam vì server tính "hôm nay" theo giờ đó.
- Khi cài bản test, Flutter thử gỡ `com.example.iceflow_mobile` và báo `DELETE_FAILED_INTERNAL_ERROR` vì app đăng ký với tên `com.iceflow.app`; vô hại, có từ trước.
- Chưa chạy trên điện thoại thật và chưa thử với server production.
