# Quick Task 261011-lsa: Cảnh báo tồn kho thấp

**Date:** 2026-10-11
**Nguồn:** User yêu cầu "Cảnh báo tồn kho thấp". Hiện màn Kho lạnh chỉ tô đỏ khi tồn đã âm.

## Task 1 — Schema

**Files:** `prisma/schema.prisma`, `prisma/migrations/20261011100000_add_product_min_stock/`
- Cột `products.min_stock` (nullable): mức cảnh báo của từng sản phẩm; null = không cảnh báo. Chỉ thêm cột.

## Task 2 — API

**Files:** `src/lib/inventory.ts`, `src/app/api/inventory/route.ts`, `src/app/api/products/route.ts`, `src/lib/contracts/*`
- Tạo/sửa sản phẩm nhận `minStock`. `GET /api/inventory` trả thêm `sellable`, `minStock`, `lowStock`.
- Cảnh báo so với số **còn bán được** (tồn trên sổ trừ đơn chưa đối soát), vì kho chỉ bị trừ lúc đối soát.

## Task 3 — Màn hình

**Files:** `src/components/pricing/product-table.tsx`, `src/app/inventory/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-client.tsx`
- Ô "Cảnh báo khi tồn còn" ở Sản phẩm & giá; băng cảnh báo, nhãn "Sắp hết" và cột "Còn bán được" ở Kho lạnh; thẻ Tồn kho lạnh ở Tổng quan chuyển đỏ.

## Verify

lint, typecheck, test, build, migrate deploy trên DB trống + kiểm tra drift, `contract:verify`, e2e.
