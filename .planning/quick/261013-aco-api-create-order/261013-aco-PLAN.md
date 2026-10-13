# Quick Task 261013-aco: API tạo đơn cho app di động

**Date:** 2026-10-13
**Nguồn:** Nhân viên cần lên đơn trên app; web chỉ tạo đơn qua server action nên app chưa có gì để gọi.

## Task

**Files:** `src/app/api/orders/route.ts`, `src/app/api/customers/[id]/prices/route.ts` (mới), `src/lib/actions/orders.ts`, `src/lib/contracts/{orders,customers}.ts`
- `POST /api/orders`: lên đơn, đi qua đúng `saveOrder` của web (server tự tính giá, ghi nhật ký).
- `GET /api/customers/{id}/prices`: sản phẩm đang bán kèm giá của khách và số còn bán được, cho form lên đơn.
- Contract, fixture, OpenAPI, bộ xác minh contract.

## Verify

`npm run test`, `lint`, `typecheck`; `contract:verify --record` với server thật trên Postgres dùng một lần.
