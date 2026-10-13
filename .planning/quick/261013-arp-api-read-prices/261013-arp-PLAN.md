# Quick Task 261013-arp: API đọc giá cho app di động

**Date:** 2026-10-13
**Nguồn:** Màn "Sản phẩm & giá" và giá riêng của khách trên app cần đọc giá; server chỉ có API ghi giá (web đọc thẳng database khi dựng trang).

## Task

**Files:** `src/app/api/prices/global/route.ts`, `src/app/api/customers/[id]/prices/route.ts`, contract, fixture, OpenAPI, bộ xác minh
- `GET /api/prices/global`: mọi sản phẩm kèm giá mặc định, kể cả sản phẩm ngừng bán.
- `GET /api/customers/{id}/prices`: thêm `basePrice` và `customPrice`.

## Verify

`npm run test`, `lint`, `typecheck`; `contract:verify --record` với server thật trên Postgres dùng một lần.
