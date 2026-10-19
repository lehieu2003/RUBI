# Quick Task 261019-mfe Summary: Modularize API Endpoints by Feature

## Overview
Modularized API endpoints across both Web (Next.js) and Mobile (Flutter) applications so that each feature owns its own endpoint definitions instead of a monolithic central object (`API_ENDPOINTS`) or hardcoded strings scattered across repository implementations.

## Key Changes

### 1. Web (Next.js)
- **Directory created**: `src/lib/api-endpoints/` containing domain-specific endpoint definitions:
  - `auth.ts` (`AUTH_ENDPOINTS`)
  - `audit.ts` (`AUDIT_ENDPOINTS`)
  - `factory.ts` (`FACTORY_ENDPOINTS`)
  - `orders.ts` (`ORDER_ENDPOINTS`)
  - `customers.ts` (`CUSTOMER_ENDPOINTS`)
  - `products.ts` (`PRODUCT_ENDPOINTS`)
  - `inventory.ts` (`INVENTORY_ENDPOINTS`)
  - `assets.ts` (`ASSET_ENDPOINTS`)
  - `prices.ts` (`PRICE_ENDPOINTS`)
  - `drivers.ts` (`DRIVER_ENDPOINTS`)
  - `staff.ts` (`STAFF_ENDPOINTS`)
  - `schedule.ts` (`SCHEDULE_ENDPOINTS`)
  - `deposits.ts` (`DEPOSIT_ENDPOINTS`)
  - `reports.ts` (`REPORT_ENDPOINTS`)
  - `index.ts`: Aggregates and re-exports both individual domain endpoints and the unified `API_ENDPOINTS` object for backward compatibility.
- **Removed**: Monolithic `src/lib/api-endpoints.ts`.
- **Callers updated**: All pages, components, and providers in `src/` now import domain-specific endpoints directly from `@/lib/api-endpoints` or `@/lib/api-endpoints/<domain>`.

### 2. Mobile (Flutter)
- **Created per-feature endpoint classes** under `mobile/lib/features/<feature>/data/<feature>_endpoints.dart`:
  - `audit_endpoints.dart` (`AuditEndpoints`)
  - `auth_endpoints.dart` (`AuthEndpoints`)
  - `customers_endpoints.dart` (`CustomersEndpoints`)
  - `debt_endpoints.dart` (`DebtEndpoints`)
  - `driver_endpoints.dart` (`DriverEndpoints`)
  - `inventory_endpoints.dart` (`InventoryEndpoints`)
  - `orders_endpoints.dart` (`OrdersEndpoints`)
  - `products_endpoints.dart` (`ProductsEndpoints`)
  - `schedule_endpoints.dart` (`ScheduleEndpoints`)
  - `shells_endpoints.dart` (`ShellsEndpoints`)
  - `staff_endpoints.dart` (`StaffEndpoints`)
- **Updated repositories & APIs**:
  - `audit_repository_impl.dart`
  - `auth_api.dart`
  - `customers_repository_impl.dart`
  - `debt_repository_impl.dart`
  - `driver_repository_impl.dart`
  - `inventory_repository_impl.dart`
  - `order_entry_repository_impl.dart`
  - `orders_repository_impl.dart`
  - `products_repository_impl.dart`
  - `schedule_repository_impl.dart`
  - `shift_report_repository_impl.dart`
  - `team_schedule_repository_impl.dart`
  - `shells_repository_impl.dart`
  - `staff_repository_impl.dart`
- **Updated unit test mocks**:
  - `mobile/test/features/audit/data/audit_repository_impl_test.dart`
  - `mobile/test/features/debt/data/debt_repository_impl_test.dart`
  - `mobile/test/features/inventory/data/inventory_repository_impl_test.dart`

## Verification
- **Web Quality Gate**:
  - `npm run lint`: 0 errors
  - `npm run typecheck`: 0 errors (`tsc --noEmit -p tsconfig.json`)
  - `npm test`: 97 suites, 331 tests passed, 0 failures (`tsx tests/run-tests.ts`)
  - `npm run build`: 52 static & dynamic routes compiled successfully
- **Mobile Quality Gate**:
  - `flutter analyze`: No issues found (ran in 3.0s)
  - `flutter test`: 685 tests passed, 0 failures (ran in 17s)
- **CI Pre-checks**:
  - `bash scripts/validate.sh branch "refactor/feature-endpoints"`: passed
  - `bash scripts/validate.sh range origin/dev HEAD`: passed

