# Quick Task 261012-mmd: App di động — lớp dữ liệu cho Quản lý

**Date:** 2026-10-12
**Nguồn:** App dành cho cả ba vai trò (user, 2026-10-12). User chọn làm lớp dữ liệu trước, màn hình sau. Ba việc đầu của Quản lý đều đã có API: duyệt ca, kho lạnh, công nợ.

## Task 1 — Duyệt ca

**Files:** `features/schedule/**`
- `TeamScheduleRepository`: lịch cả nhóm theo tuần (`GET /api/schedule/assignments`), duyệt / từ chối (`POST /api/schedule/review`). `Shift` có thêm `id`.

## Task 2 — Kho lạnh

**Files:** `features/inventory/**` (mới)
- `InventoryRepository`: tồn kho kèm cảnh báo sắp hết, nhập mẻ, kiểm kho (`/api/inventory`).

## Task 3 — Công nợ

**Files:** `features/debt/**` (mới)
- `DebtRepository`: báo cáo nợ, sổ nợ phân trang, ghi nhận thu tiền.

## Chung

`core/network/api_guard.dart`: khung try/catch + log dùng chung cho repository.

## Verify

`flutter analyze`, `flutter test`; chạy các repository với server thật trên Postgres tạm.
