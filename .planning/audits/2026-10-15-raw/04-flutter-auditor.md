## flutter-auditor report (verbatim content from agent)

**Architecture found:** flutter_bloc cubits via get_it + injectable (feature cubits @injectable factories per screen, repositories lazy singletons, AuthEvents singleton). Dio with one AuthInterceptor: attaches Bearer, single-flight refresh on 401, retries once via plain Dio, else forced logout. Base URL from --dart-define API_BASE_URL (default http://10.0.2.2:3001). Token in flutter_secure_storage; last email in shared_preferences. go_router 3 routes (/login, /home, /change-password) redirect from AuthCubit; role tabs via shellTabsFor; manager screens pushed imperatively. Tests: unit/bloc/widget with http_mock_adapter + mocktail under mobile/test; one e2e mobile/integration_test/app_e2e_test.dart against local server.

**Not covered:** staff, products, customer CRUD, audit log, shift report & shift review screens beyond cubits; schedule/shift-report contracts vs server; Android/iOS platform config; integration_test contents.

### Confirmed bugs

#### FL-1 Payment, shell "ghi thêm", production batch can be recorded twice after a lost response — Critical (Confirmed; trigger needs a response lost after server commit)
- Location: mobile/lib/core/network/api_error_decoder.dart:16-21; mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart:155-156; mobile/lib/features/debt/presentation/screens/customer_ledger_screen.dart:226-228; mobile/lib/features/shells/presentation/shells_screen.dart:177-179; mobile/lib/features/inventory/presentation/screens/inventory_tab.dart:339-341. Server non-idempotent: src/app/api/customers/[id]/payments/route.ts:51-53; src/app/api/deposits/shells/route.ts:97-100; src/app/api/inventory/route.ts:93-94. Contrast: order entry handles it — mobile/lib/features/orders/presentation/cubit/order_entry_cubit.dart:207-210.
- Evidence: api_error_decoder.dart:19 `case DioExceptionType.receiveTimeout:` → `return const NetworkFailure();`; customer_ledger_screen.dart:227-228 `submitting.value = false; error.value = result.message;`; shells/route.ts:98 `shellsOut: { increment: shellsOut ?? 0 },`
- Repro: Quản lý → Công nợ → customer → Thu tiền 100.000; delay 201 > 15s via proxy; sheet shows "Không có kết nối. Vui lòng thử lại.", button re-enabled; tap again → second PAYMENT.
- Fix: on NetworkFailure for these writes show "unsure" message like AppStrings.orderEntryUnsure, close sheet, reload from server; long-term idempotency key.
- Regression: test/features/debt/presentation/screens/debt_screens_test.dart (+ shells_test.dart, inventory_tab_test.dart).

#### FL-2 One customer with empty phone/address blocks a driver's whole delivery list — High (Confirmed)
- Location: mobile/lib/features/driver/data/mappers/order_mapper.dart:30-37; mobile/lib/core/network/mapping_validator.dart:9-10; mobile/lib/features/driver/data/driver_repository_impl.dart:48-49; mobile/lib/features/driver/presentation/screens/today_tab.dart:40-44. Server: src/lib/contracts/customers.ts:37-38 (optional); src/app/api/customers/route.ts:57.
- Evidence: customers/route.ts:57 `data: { code, name, address: address || '', phone: phone || '', ...`; order_mapper.dart:34-36 `final customerPhone = MappingValidator.nonEmpty(customer?.phone); if (customerPhone == null) { return Err(...missing('Order', 'customer.phone'));`; driver_repository_impl.dart:49 `return Err(failure);`
- Also Lịch sử (history_cubit.dart:94). Order-entry mapper accepts empty (order_entry_mapper.dart:21-23).
- Regression: test/features/driver/data/order_mapper_test.dart (case at :188-209 currently asserts Err).

#### FL-3 Refresh on 401 can never succeed → every session hard-expires 7 days after login — Medium (Confirmed)
- Location: mobile/lib/core/network/auth_interceptor.dart:68-90, :131-140; src/app/api/auth/refresh/route.ts:6-8, :19-24; src/lib/auth.ts:31, :57-59.
- Evidence: interceptor refreshes only after 401 with same token; refresh/route.ts:6-8 comment "exchanging a still-valid Bearer token … for a fresh 7-day JWT"; :20-23 `if (!session) { return apiError(..., 401);`. No proactive refresh in mobile/lib (grep).
- Fix: proactive refresh after restore()/on resume.

#### FL-4 /api/auth/me never returns 401 but client's silent-logout path depends on it — Medium (Confirmed)
- Location: mobile/lib/features/auth/data/auth_repository_impl.dart:84-87, :95-110; auth_cubit.dart:89-90; src/app/api/auth/me/route.ts:11-13, :20-22; api/openapi/auth.yaml:139-143; test mocks 401: mobile/test/features/auth/data/auth_repository_impl_test.dart:277-289.
- Evidence: me/route.ts:11-12 `if (!session) { return apiSuccess({ user: null });`; auth.yaml:143 "Never answers 401"; auth_repository_impl.dart:85-86 `if (meData.user == null) { return const Err(UnexpectedFailure('Me response missing data.user'));`
- Actual: "Có lỗi xảy ra" on every cold start with expired/locked token; dead token stays.

#### FL-5 Late restore() result can overwrite a just-succeeded login — Medium (High Confidence, timing)
- Location: mobile/lib/features/auth/presentation/cubit/auth_cubit.dart:82-91; mobile/lib/app.dart:43; mobile/lib/core/router/app_router.dart:21.
- Evidence: auth_cubit.dart:85 `if (isClosed) return;`; :90 `emit(Unauthenticated(message: failureMessage(failure)));`
- Fix: emit only if state is AuthUnknown.

#### FL-6 Ledger: balance not refreshed on pull-to-refresh; duplicate row after "Xem thêm" following a payment — Medium (Confirmed)
- Location: mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart:72-92, :135-146, :106-121; customer_ledger_screen.dart:164, :215; src/app/api/customers/[id]/ledger/route.ts:33-36 (offset pagination newest first).
- Evidence: ledger_cubit.dart:87 `outstandingDebt: state.outstandingDebt,`; :142 `entries: [value.entry, ...state.entries],` (nextPage unchanged).

#### FL-7 Today-tab refresh on resume can revert a just-confirmed delivery and clear double-tap guard — Low (High Confidence, timing)
- Location: mobile/lib/features/driver/presentation/screens/today_tab.dart:126-128; today_orders_cubit.dart:82-91, :106-140. Server repeat confirm no-op (confirm/route.ts:37-38).

#### FL-8 Role change while app open leaves old role's tabs, every call 403 — Low (Confirmed)
- Location: src/lib/auth.ts:74-76; mobile/lib/features/auth/presentation/cubit/auth_cubit.dart:58-70; mobile/lib/features/home/presentation/screens/home_shell.dart:23.

#### FL-9 Logout waits on the network before clearing session — Low (Confirmed)
- Location: mobile/lib/features/auth/data/auth_repository_impl.dart:124-131; api_constants.dart:14; server logout only clears cookie src/app/api/auth/logout/route.ts:5-7.

### Hypotheses
- FL-H1 "Driver not linked" returns 401 → interceptor refresh succeeds, retry 401 → forced logout loop for DRIVER with inactive/missing Driver row. src/app/api/orders/[id]/confirm/route.ts:21-23; src/app/api/driver/orders/route.ts:23-25; auth_interceptor.dart:97-103. Unverified whether /api/staff PATCH/DELETE can produce that state (src/app/api/staff/[id]/route.ts:128-155, :207 not fully read).
- FL-H2 Refresh finishing after logout can restore token — auth_interceptor.dart:80-90 saveToken without logout check.

### Handed off
- race: reconcile non-conditional update (reconcile/route.ts:44-46, :62-65).
- race/api: no idempotency on payments, shells ADD, inventory ADD.
- api: /api/reports/debt uses getSession directly, bypassing mustChangePassword 403 of requireSession — src/app/api/reports/debt/route.ts:9-18, src/lib/auth/helpers.ts:15-16.
- api: 401 used for authorization/data condition — confirm/route.ts:22, driver/orders/route.ts:24.
- api: refresh requires still-valid token; nobody refreshes proactively.
