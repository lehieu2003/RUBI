---
status: complete
---

# Quick Task 261015-dra Summary: Báo cáo công nợ cộng trong database

**Date:** 2026-10-15 · **Branch:** `fix/debt-report-aggregate` · **Commit:** 88a85eb · **Status:** complete ✓

## Shipped

1. `GET /api/reports/debt`: không còn `include: { debtLedger: true }`. Danh sách khách (`id`, `name`) và `customerDebtLedger.groupBy` theo `customerId` + `type` (`_sum.amount`, `_max.createdAt`) chạy song song; ngày thu tiền gần nhất = `_max.createdAt` của nhóm PAYMENT. Response giữ nguyên.
2. Test source check mới: route phải dùng `groupBy` và không được include cả sổ nợ.

## Verification

- `npx tsc --noEmit`: sạch. `npm run lint`: 0 lỗi (warning có sẵn). `npm test`: 298/298.
- Postgres tạm (Docker), không đụng Supabase: chèn các ca biên vào sổ nợ (trả hết, trả dư, chỉ có nợ, nhiều lần thu không theo thứ tự, số lẻ), gọi `GET /api/reports/debt` qua HTTP với tài khoản Quản lý — kết quả trùng từng dòng với cách tính cũ.
- `scripts/mobile-e2e-local.sh` trên emulator: All tests passed (kịch bản có tab Công nợ: báo cáo, sổ nợ, thu tiền).
- CI Quality Gate trên PR #92: pass.

## Ghi chú

- `GET /api/customers/debt-export` vẫn include cả sổ nợ của mọi khách. Hiện chưa có màn nào gọi (chỉ có contract `src/lib/contracts/customers.ts`) — để nguyên, xử lý khi có người dùng (giới hạn theo thời gian như phần đơn hàng 6 tháng).
