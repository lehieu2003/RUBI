# Quick Task 261010-inv: Tồn kho luỹ kế và kiểm kho

**Date:** 2026-10-10
**Nguồn:** Tồn kho chỉ đọc bản ghi của hôm nay nên đầu ngày về 0 và có thể âm. User chốt: tồn cuối ngày tự chuyển thành tồn đầu ngày hôm sau; Quản lý kiểm kho định kỳ để chỉnh chênh lệch (hao hụt do tan chảy, vỡ), không bắt nhập lại mỗi sáng.

## Task 1 — Số dư luỹ kế

**Files:** `src/lib/inventory.ts` (mới), `src/app/api/inventory/route.ts`, `src/app/api/orders/[id]/reconcile/route.ts`, `src/app/dashboard/page.tsx`
- Mỗi dòng `inventory` là số dư cuối ngày của một sản phẩm. Tồn hiện tại = dòng mới nhất. Lần biến động đầu tiên trong ngày mở dòng của hôm nay từ số dư đó.
- Không đổi schema, không migration.

## Task 2 — Kiểm kho

**Files:** `src/app/inventory/page.tsx`
- Nút "Kiểm kho" theo từng sản phẩm: nhập số đếm thực tế, hiện chênh lệch, lưu bằng `mode: SET` sẵn có.

## Verify

lint, typecheck, test (có test đơn vị cho số dư), build, `contract:verify`, kịch bản trình duyệt giả lập qua ngày.
