# Quick Task 261019-mfe: Modularize API Endpoints by Feature in Web & Mobile

**Date:** 2026-10-19
**Nguồn:** Tách endpoints theo từng feature thay vì gộp chung monolithic `API_ENDPOINTS` trên web và hardcode chuỗi trong repository trên mobile.

## Task

### 1. Web (`src/lib/api-endpoints/`)
- Tách `src/lib/api-endpoints.ts` thành các file endpoint theo từng domain/feature trong thư mục `src/lib/api-endpoints/`:
  - `auth.ts`
  - `audit.ts`
  - `factory.ts`
  - `orders.ts`
  - `customers.ts`
  - `products.ts`
  - `inventory.ts`
  - `assets.ts`
  - `prices.ts`
  - `drivers.ts`
  - `staff.ts`
  - `schedule.ts`
  - `deposits.ts`
  - `reports.ts`
- Cung cấp `src/lib/api-endpoints/index.ts` re-export các feature endpoints và xuất `API_ENDPOINTS` hợp nhất để tương thích ngược.
- Cập nhật các caller trên web để import trực tiếp endpoint của feature tương ứng.

### 2. Mobile (`mobile/lib/features/*/data/*_endpoints.dart`)
- Tạo các lớp endpoint theo feature:
  - `audit_endpoints.dart`
  - `auth_endpoints.dart`
  - `customers_endpoints.dart`
  - `debt_endpoints.dart`
  - `driver_endpoints.dart`
  - `inventory_endpoints.dart`
  - `orders_endpoints.dart`
  - `products_endpoints.dart`
  - `schedule_endpoints.dart`
  - `shells_endpoints.dart`
  - `staff_endpoints.dart`
- Cập nhật các repository/api impl sử dụng các lớp endpoint này thay vì chuỗi hardcode.

## Verify

- Web Gate: `npm run lint && npm run build`
- Mobile Gate: `flutter analyze && flutter test`

