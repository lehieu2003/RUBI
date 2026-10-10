# Quick Task 261010-odf: Drawer lên đơn mở ra với con trỏ ở ô tìm khách

**Date:** 2026-10-10
**Nguồn:** Thấy khi chạy end-to-end trên trình duyệt cho PR #30: mở drawer, con trỏ nằm ở nút "Đóng", nhân viên phải bấm chuột vào ô tìm khách trước khi gõ.

## Task 1

**Files:** `src/components/ui/drawer.tsx`, `src/components/order/search-bar.tsx`, `tests/components/drawer-focus.test.ts`
- `Drawer` ưu tiên phần tử có `data-autofocus`, không có thì giữ như cũ (phần tử focus được đầu tiên).
- Ô tìm khách của `SearchBar` gắn `data-autofocus`.

## Verify

lint, typecheck, test, build; mở drawer trên Chrome và lên một đơn chỉ bằng bàn phím.
