# Quick Task 261013-fpf: Test trình duyệt "mở bảng giá riêng từ ngăn khách hàng" chập chờn

**Date:** 2026-10-13
**Nguồn:** `e2e/access.spec.ts:42` làm đỏ cổng web 5 trong ~28 lượt CI gần đây, trên những PR không đụng tới web.

## Task

- Tìm nguyên nhân (không chỉ chạy lại).
- Sửa đúng chỗ, thêm test giữ lỗi không quay lại.

## Verify

Tái hiện trên máy rồi chạy lại sau khi sửa: `scripts/e2e-local.sh access` trên Postgres dùng một lần.
