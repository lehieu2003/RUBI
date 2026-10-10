# Quick Task 261010-prd: Quản lý sản phẩm (thêm, sửa, ngừng bán)

**Date:** 2026-10-10
**Nguồn:** Sản phẩm chỉ đến từ seed hoặc sửa tay trong database; Quản lý không tự thêm loại đá hay ngừng bán được. User chốt phạm vi: thêm / sửa / ngừng bán, không xoá cứng, chỉ Quản lý, gộp vào màn `/config/prices` và đưa lại vào menu.

## Task 1 — API

**Files:** `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/lib/contracts/products.ts`, `api/openapi/*`, `scripts/verify-api-contracts.ts`
- `POST /api/products` (ADMIN): tạo sản phẩm kèm giá chung bắt buộc; trùng tên + cỡ trả 409 `PRODUCT_EXISTS`.
- `PATCH /api/products/{id}` (ADMIN): đổi tên, đơn vị, cỡ, `isActive`; đổi cỡ khi đã có đơn trả 409 `PRODUCT_HAS_ORDERS`. Không có DELETE.

## Task 2 — Màn hình

**Files:** `src/app/config/prices/page.tsx`, `src/components/pricing/product-table.tsx` (thay `global-prices-table.tsx`), `src/components/dashboard/sidebar.tsx`
- "Sản phẩm & giá" hiện trong menu Quản lý; liệt kê cả sản phẩm ngừng bán.

## Task 3 — Lưới lên đơn

**Files:** `src/components/order/order-matrix.tsx`
- Phát hiện khi thử trên trình duyệt: lưới ghi cứng Đá Bi / Đá Viên × 5-10-20kg nên sản phẩm khác không lên đơn được. Dựng lưới từ danh mục.

## Verify

lint, typecheck, test, build, `contract:verify --record` trên Postgres tạm, kịch bản trình duyệt cho Quản lý và Nhân viên.
