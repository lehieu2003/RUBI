---
status: complete
---

# Quick Task 261012-mrs Summary: đăng nhập và điều hướng theo vai trò

**Date:** 2026-10-12 · **Branch:** `feat/mobile-role-shell` · **Status:** complete ✓

## Shipped

1. **Cả ba vai trò đăng nhập được app.** Bỏ câu "Tài khoản này chưa dùng được trên app".
2. **Tab theo vai trò** (`shellTabsFor`):

   | Vai trò | Tab |
   |---|---|
   | Tài xế | Hôm nay, Lịch sử, Ca làm, Cài đặt (như cũ) |
   | Nhân viên | Ca làm, Cài đặt |
   | Quản lý | Cài đặt (chưa có màn hình riêng; không có thanh dưới) |

3. `HomeShell` chuyển sang feature `home`; `AuthCubit` không còn cần `AuthStorage`.
4. Đổi mật khẩu, bắt buộc đổi mật khẩu, giao diện sáng/tối, đăng xuất dùng chung cho cả ba vai trò.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 329/329 (323 test cũ, thêm 6: tab theo vai trò, đăng nhập Nhân viên và Quản lý, luồng toàn app cho hai vai trò này).
- **Giả lập + server thật** (`scripts/mobile-e2e-local.sh`, Pixel 7 Android 14): bài test mở rộng qua — sau luồng của tài xế, Nhân viên đăng nhập vào thẳng "Ca làm" (lịch tải từ server cho đúng vai trò, 2 tab), Quản lý đăng nhập vào Cài đặt, không có thanh dưới. Bước kiểm tra phía server cũng qua.

## Ghi chú

- Quản lý hiện chỉ làm được: đổi mật khẩu, đổi giao diện, đăng xuất. Màn Duyệt ca, Kho lạnh, Công nợ (lớp dữ liệu đã có ở #64) là các bước kế.
- Nhân viên chưa có màn đơn hàng / lên đơn (phần lên đơn cần thêm API REST).
- Vai trò bị đổi khi app đang mở: app giữ tab cũ tới lần đăng nhập sau; trong lúc đó server từ chối các lời gọi của vai trò cũ.
- Lượt chạy giả lập dùng giả lập đang mở sẵn trên máy: nó cài bản test của app và đặt múi giờ giả lập về giờ Việt Nam.
