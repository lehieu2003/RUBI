# Quick Task 261013-moe: App di động — lớp dữ liệu lên đơn

**Date:** 2026-10-13
**Nguồn:** Server đã có `POST /api/orders` và `GET /api/customers/{id}/prices` (261013-aco). Lớp dữ liệu trước, màn lên đơn sau.

## Task

**Files:** `mobile/lib/features/orders/{domain,data}/**` (thêm file `order_entry*`)
- `OrderEntryRepository`: danh sách khách, bảng giá của một khách kèm số còn bán được, lên đơn.

## Verify

`flutter analyze`, `flutter test` — test đọc response thật của server trong `api/openapi/fixtures/responses`.
