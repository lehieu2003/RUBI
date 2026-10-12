# Quick Task 261012-mee: App di động — test end-to-end trên giả lập với server thật

**Date:** 2026-10-12
**Nguồn:** Bảy PR mobile gần đây (#47, #50, #52–#56, #58, #59) chỉ được kiểm tra bằng unit/widget test với repository giả. Chưa lần nào app chạy trên thiết bị và nói chuyện với server thật.

## Task

**Files:** `mobile/integration_test/app_e2e_test.dart`, `scripts/mobile-e2e-local.sh`, `scripts/mobile-e2e-prepare.mjs`, `mobile/pubspec.yaml`
- Bài test lái app thật trên giả lập Android: sai mật khẩu, bắt buộc đổi mật khẩu, xác nhận giao, đăng ký và huỷ ca, đăng xuất và đăng nhập lại.
- Script một lệnh: dựng server từ chính cây mã này trên Postgres tạm (Docker), tạo tài khoản tài xế và đơn cần cho bài test, chạy test, rồi kiểm tra lại phía server.

## Verify

Chạy script từ đầu tới cuối trên giả lập.
