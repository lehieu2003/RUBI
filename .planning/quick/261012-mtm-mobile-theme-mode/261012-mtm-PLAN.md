# Quick Task 261012-mtm: App di động — giao diện sáng / tối trong Cài đặt

**Date:** 2026-10-12
**Nguồn:** User: "add dark/light mode ở setting".

## Task

**Files:** `core/theme/theme_cubit.dart`, `core/theme/app_theme.dart`, `core/storage/app_preferences.dart`, `app.dart`, `main.dart`, `settings_tab.dart`, `strings.dart`
- Ba lựa chọn: Theo máy (mặc định), Sáng, Tối. Nhớ trên máy bằng shared_preferences.
- Bản tối sinh từ cùng màu gốc với bản sáng.
- Đọc lựa chọn trước khung hình đầu tiên để app không mở ra sáng rồi mới chuyển tối.

## Verify

`flutter analyze`, `flutter test`; xem ảnh kết xuất hai chế độ.
