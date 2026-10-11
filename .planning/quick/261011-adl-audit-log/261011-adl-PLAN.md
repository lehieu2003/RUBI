# Quick Task 261011-adl: Nhật ký sửa đơn và công nợ

**Date:** 2026-10-11
**Nguồn:** User yêu cầu "Nhật ký sửa đơn và công nợ". Hiện không biết ai đã đổi trạng thái, gán tài xế, chốt đơn hay ghi nhận thu tiền.

## Task 1 — Schema

**Files:** `prisma/schema.prisma`, `prisma/migrations/20261011110000_add_audit_logs/`
- Bảng mới `audit_logs` và enum `AuditAction`. Chỉ thêm, không đụng dữ liệu cũ.

## Task 2 — Ghi nhật ký

**Files:** `src/lib/audit.ts`, `src/lib/actions/orders.ts`, `src/app/api/orders/**`, `src/app/api/customers/[id]/payments/route.ts`
- Mỗi thay đổi ghi một dòng trong cùng transaction: lên đơn, gán tài xế, đổi trạng thái, huỷ, tài xế xác nhận giao, chốt đơn (kèm chênh lệch thực giao và số nợ ghi), thu tiền.

## Task 3 — Đọc nhật ký

**Files:** `src/app/api/audit-logs/route.ts`, `src/lib/contracts/audit.ts`, `src/app/audit-log/page.tsx`, sidebar + bảng quyền
- `GET /api/audit-logs` (ADMIN, phân trang, lọc theo loại / đơn / khách). Màn "Nhật ký" cho Quản lý.

## Verify

lint, typecheck, test, build, migrate deploy trên DB trống + kiểm tra drift, `contract:verify`, e2e.
