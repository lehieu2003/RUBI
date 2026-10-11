# Quick Task 261011-psf: Phiếu giao hàng in đúng thông tin xưởng

**Date:** 2026-10-11
**Nguồn:** Đối chiếu mã nguồn: phiếu in tiêu đề cứng "CÔNG TY TNHH ĐÁ LẠNH ICEFLOW — 123 Đường ABC…", không in ghi chú đơn, nút in ghi "K80 / A5" trong khi CSS chỉ có 80mm.

## Task 1 — Phiếu

**Files:** `src/components/order/print-slip.tsx`, `src/lib/actions/orders.ts`, `src/app/orders/page.tsx`, `src/app/orders/[id]/page.tsx`, `src/app/orders/[id]/order-detail-client.tsx`
- Tiêu đề phiếu lấy tên, địa chỉ, điện thoại từ bảng `Factory` (server action `loadSlipFactory` cho màn danh sách, đọc thẳng ở trang chi tiết). Không đổi schema, không đổi API.
- In ghi chú của đơn.
- Nhãn nút in: "K80".

## Task 2 — Test trình duyệt

**Files:** `e2e/print-slip.spec.ts`
- Phiếu ở `/orders` và `/orders/[id]` có thông tin xưởng và ghi chú, không còn chữ giữ chỗ.

## Verify

lint, typecheck, test, build, `npm run e2e:local` trên Postgres tạm.
