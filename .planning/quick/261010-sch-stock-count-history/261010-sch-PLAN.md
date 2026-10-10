# Quick Task 261010-sch: Lưu lịch sử kiểm kho

**Date:** 2026-10-10
**Nguồn:** PR #34 cho kiểm kho nhưng chỉ thay số dư. User yêu cầu lưu lịch sử kiểm kho.

## Task 1 — Schema

**Files:** `prisma/schema.prisma`, `prisma/migrations/20261010160000_add_stock_counts/`
- Bảng mới `stock_counts`: sản phẩm, số trên sổ, số đếm, ghi chú, người kiểm, thời điểm. Chỉ thêm bảng, không đụng dữ liệu cũ.

## Task 2 — API

**Files:** `src/app/api/inventory/route.ts`, `src/app/api/inventory/counts/route.ts`, `src/lib/contracts/inventory.ts`
- Kiểm kho (`mode: SET`) ghi một dòng lịch sử trong cùng transaction; nhận thêm `note`.
- `GET /api/inventory/counts` (ADMIN, phân trang).

## Task 3 — Màn Kho lạnh

**Files:** `src/app/inventory/page.tsx`
- Ô ghi chú trong hộp thoại kiểm kho; bảng "Lịch sử kiểm kho" bên dưới.

## Verify

lint, typecheck, test, build, migrate deploy trên DB trống + kiểm tra drift, `contract:verify`, kịch bản trình duyệt.
