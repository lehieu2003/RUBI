# Quick Task 261015-dra: Báo cáo công nợ cộng trong database

**Date:** 2026-10-15
**Nguồn:** Scan N+1 / SQL injection — `GET /api/reports/debt` đọc toàn bộ sổ nợ của mọi khách rồi cộng trong JS; sổ nợ tăng ~20-35k dòng/năm.

## Task

**Files:** `src/app/api/reports/debt/route.ts`, `tests/api/debt-report.test.ts`
- Đổi `include: { debtLedger: true }` sang `customerDebtLedger.groupBy({ by: ['customerId', 'type'], _sum: { amount }, _max: { createdAt } })`, cùng cách `customers/[id]/payments` tính nợ.
- Response giữ nguyên: `{ customerId, customerName, outstandingDebt, lastPaymentDate }[]`, chỉ khách còn nợ > 0, nợ nhiều nhất trước.
- `customers/debt-export`: ngoài phạm vi (chưa có màn nào gọi) — chỉ ghi nhận.

## Verify

`npm run lint`, `npx tsc --noEmit`, `npm test`. Không chạy trên Supabase production.
