---
status: complete
---

# Quick Task 261013-msd Summary: Vỏ bao trên app

**Date:** 2026-10-13 · **Branch:** `feat/mobile-shell-deposits` (xếp chồng trên `feat/mobile-shift-report`) · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu**: feature `shells` — `ShellBalance`, `ShellsRepository` (`GET/PATCH /api/deposits/shells`): danh sách, ghi thêm (cộng vào tổng), sửa tổng (`mode: SET`).
2. **Màn "Vỏ bao"** ("Thêm" → "Vỏ bao", chỉ Quản lý): tổng số vỏ khách đang giữ và tổng tiền cọc; từng khách với số đã giao / đã thu, số còn giữ và tiền cọc.
3. **Bấm một khách**: "Ghi thêm" (giao thêm, thu về) hoặc "Sửa tổng" (mở sẵn số đang lưu). Chặn trước khi gửi: không nhập gì, thu về nhiều hơn số đang giữ, tổng thu lớn hơn tổng giao. Lưu xong tải lại để lấy số server tính.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 631/631 (618 test cũ, 13 test mới; test repository đọc response thật của server).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Quản lý giao thêm 3 vỏ cho Vựa Hải Sản Năm Căn; server trả tổng đã giao 43.

## Ghi chú

- Danh sách chỉ có khách đã phát sinh vỏ (server trả vậy): ghi vỏ lần đầu cho một khách mới vẫn phải làm trên web.
- Feature nhỏ nên gọn trong ba thư mục `domain` / `data` / `presentation`, không tách `entities`, `dto`, `mappers`.
