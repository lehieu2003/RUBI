---
status: complete
---

# Quick Task 261013-msr Summary: Bảng công trên app

**Date:** 2026-10-13 · **Branch:** `feat/mobile-shift-report` (xếp chồng trên `feat/mobile-customer-prices`) · **Status:** complete ✓

## Shipped

1. **Lớp dữ liệu** (commit đầu, trong feature `schedule`): `ShiftReport`, `ShiftReportRepository` (`GET /api/reports/shifts?month=`, `POST /api/reports/shifts/lock`). Vai trò lạ, thiếu số giờ hay khung giờ lạ đều là lỗi: đây là số liệu tính lương.
2. **Màn "Bảng công"** ("Thêm" → "Bảng công", chỉ Quản lý): chọn tháng (‹ ›), tổng ca đã duyệt và giờ công của tháng, từng người với số ca / giờ / ngày công, kèm số ca chờ duyệt và bị từ chối; mở một người ra để xem từng ngày với khung giờ.
3. **Chốt công**: nút "Chốt công tháng" (hỏi lại, nói rõ hệ quả); còn ca chờ duyệt thì màn nhắc duyệt hết trước và server từ chối. Tháng đã chốt hiện ngày chốt và nút "Mở lại tháng".

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 618/618 (600 test cũ, 18 test mới; test repository đọc response thật của server).
- `scripts/mobile-e2e-local.sh` trên emulator với server thật: Quản lý mở Bảng công, bảng của tháng này và tháng trước đều tải được. Kịch bản không chốt công (tháng đang test còn ca chờ duyệt).

## Ghi chú

- Menu "Thêm" giờ có bảy mục; kịch bản emulator không còn chờ thẻ tài khoản ở đầu menu sau khi menu đã cuộn.
