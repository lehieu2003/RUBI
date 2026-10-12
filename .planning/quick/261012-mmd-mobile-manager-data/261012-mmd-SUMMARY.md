---
status: complete
---

# Quick Task 261012-mmd Summary: lớp dữ liệu cho Quản lý

**Date:** 2026-10-12 · **Branch:** `feat/mobile-manager-data` · **Status:** complete ✓ (chỉ data layer; chưa có màn hình)

## Shipped

1. **Duyệt ca** (feature `schedule`): `TeamScheduleRepository.getTeamWeek / reviewShifts`. `Shift` có thêm `id` (null với lịch tự đăng ký); ca thiếu id trong lịch của Quản lý bị coi là payload hỏng vì không duyệt được.
2. **Kho lạnh** (feature mới `inventory`): `Stock`, `StockItem` (tồn trên sổ, còn bán được, mức cảnh báo, cờ sắp hết do server tính); `InventoryRepository.getStock / recordProduction / recordCount`.
3. **Công nợ** (feature mới `debt`): `CustomerDebt`, `LedgerEntry`, `PaymentReceipt`; `DebtRepository.getDebts / getLedger / recordPayment`. Sổ nợ dùng `PageParams`, `PaginationDto`, `Paginated` của `core/pagination` (lần đầu được dùng).
4. **`core/network/api_guard.dart`**: `guardApi` gom khung "lỗi Dio → failure, lỗi khác → UnexpectedFailure + log" mà mỗi repository cũ tự viết; cùng `apiDataObject`, `apiDataList`, `apiMeta` để đọc envelope.
5. Ba repository được đăng ký DI (injectable).

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 331/331 (294 test cũ, 37 test mới) — fixture lấy theo `api/openapi/fixtures/responses`.
- **Chạy với server thật** (web app build từ cùng cây mã, Postgres tạm trong Docker), qua HTTP thật, không qua giả lập: tài xế xin ca → Quản lý thấy ca có id và duyệt → trạng thái thành đã duyệt; tài xế gọi API của Quản lý bị 403; đọc tồn kho, nhập mẻ +3, kiểm kho về 77; đọc báo cáo nợ, sổ nợ, thu 1.000đ (số còn nợ giảm đúng 1.000), thu vượt số nợ bị 409 với câu của server. Bài test tạm này không commit.

## Ghi chú

- Chưa có: cubit, màn hình, và việc cho Quản lý đăng nhập app (vẫn bị chặn ở `AuthCubit.login`).
- Chưa làm phía dữ liệu: Quản lý tự gán / gỡ ca (`POST /api/schedule/assignments`), lịch sử kiểm kho, danh sách đơn, đối soát, nhật ký.
- Các repository cũ (`auth`, `driver`, `schedule`) chưa chuyển sang `guardApi`.
- Tiền và số tồn: thiếu field hay giá trị lạ đều trả lỗi, không suy mặc định.
