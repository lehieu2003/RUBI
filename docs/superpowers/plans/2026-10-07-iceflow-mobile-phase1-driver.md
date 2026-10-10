# IceFlow Mobile — Phase 1 (Tài xế) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Flutter Android "IceFlow" — Phase 1 lộ diện tính năng tài xế: đăng nhập email/password, xem đơn giao hôm nay, xác nhận giao kèm GPS, xem lịch sử; backend chỉ thêm Bearer JWT support (additive).

**Architecture:** Flutter Clean Architecture feature-first (`lib/core/` + `lib/features/`), Bloc + get_it, dio. App gọi Next.js API hiện có; `getSession()`/middleware đọc Bearer JWT (header ưu tiên, cookie fallback). Một nguồn sự thật ở server.

**Tech Stack:** Flutter 3.47.5 / Dart 3.13, flutter_bloc, get_it, dio, go_router, flutter_secure_storage, geolocator, url_launcher; backend: Next.js 15, jose JWT, vitest-style node:test.

**Spec:** `docs/superpowers/specs/2026-10-07-flutter-driver-app-design.md`

## Kết quả verify mục 10 của spec (đã đọc code thật)

1. `GET /api/driver/orders` **đã nhận `?date=` ở cả session lẫn token mode** (filter theo `createdAt`), response **đã kèm `orderItems` + `product`** → backend KHÔNG cần sửa gì cho B4.
2. KHÔNG cần `GET /api/driver/orders/[id]` — list response đủ dữ liệu card (customer.name/address/phone, items, total, status).
3. `PATCH /api/orders/[id]/confirm` hiện dùng `Authorization: Bearer` cho **driver share-token** (không phải JWT!) → B1 **bắt buộc** thêm nhánh: Bearer là JWT hợp lệ → đi đường session (`getSessionDriver()`); ngược lại giữ nguyên share-token logic.
4. GPS payload: `{ gps: { lat: number, lng: number } | null }` (zod `.nullable().optional()`); response envelope `{ success, data: { success, orderId, status, deliveryGps } }`.

**Response fixtures (exact, cho DTO/mapper):**

- `POST /api/auth/login` (sau B2): `{ success: true, data: { user: { id, email, name, role, factoryId }, token: "<jwt>" } }`
- `GET /api/auth/me`: `{ success: true, data: { user: { id, email, name, role, factoryId, isActive }, factory?…, subscription?… } }` — mapper chỉ đọc `user`.
- `GET /api/driver/orders?date=YYYY-MM-DD`: `{ success: true, data: { driver: { id, name }, orders: [ { id, total: number, status: "SHIPPING"|"DELIVERED", createdAt, deliveredAt|null, driverName, customer: { id, name, address, phone, … }, orderItems: [ { id, quantity, unitPrice: number, lineTotal: number, product: { id, name, sizeKg, unit, … } } ] } ] } }`
- Lỗi mọi endpoint: `{ success: false, error: "<message>", code?: string }` (401 Unauthorized / 403 Forbidden / 404 / 429 Too Many Requests).

## Global Constraints

- Flutter 3.47.5 stable, Dart 3.13; Android only; `minSdk = 24`; applicationId `com.iceflow.app`; app label `IceFlow`; version `1.0.0+1`.
- UI string 100% tiếng Việt, đặt trong bảng tập trung `lib/core/error/failure_messages.dart` (+ `lib/core/localization/strings.dart` cho UI copy). Không chuỗi UI tiếng Anh hardcode trong widget.
- Không secret trong APK; `API_BASE_URL` qua `--dart-define` (dev: `http://10.0.2.2:3001` — emulator trỏ host; release: HTTPS). Cleartext chỉ phép debug, giới hạn 10.0.2.2 (network security config).
- Backend thay đổi 100% additive; luồng cookie web không đổi hành vi; không sửa envelope, tenant guard, RBAC, rate limit hiện có.
- Backend test: `npm test` (tsx `tests/run-tests.ts`, pattern source-check regex như `tests/api/driver-token-route.test.ts`); Flutter: `flutter analyze` + `flutter test` phải xanh trước khi commit mỗi task.
- Commit sau mỗi task, message conventional (`feat(mobile): …` / `feat(api): …`).
- Giới hạn môi trường: KHÔNG có Xcode đầy đủ → không task iOS nào; không cần device thật cho M0–M4 (emulator Android đủ); Java 21 có sẵn.

## Review Focus (input lớp spec ngầm hiểu, mỗi dòng gắn test ở task sở hữu)

1. **Driver User không có `Driver` profile** (chưa link) → `GET /api/driver/orders` trả 401 "Driver profile not found" → mobile phải refresh 1 lần, gặp 401 lần 2 thì logout về login + message VN, KHÔNG loop refresh. *(Task 3 test interceptor, Task 9 test repo error mapping)*
2. **Token hết hạn khi mở app** → `restoreSession` 401 → về LoginScreen im lặng (không crash, không toast lỗi). *(Task 10 test AuthCubit.restore)*
3. **Từ chối quyền vị trí (cả permanently denied)** → confirm vẫn thành công với `gps: null`. *(Task 4 test LocationService null, Task 14 widget test confirm)*
4. **Login bằng role ≠ DRIVER** (staff/admin) → từ chối đăng nhập Phase 1 với message "Tài khoản này chưa dùng được trên app" (role check ở client từ login response). *(Task 10 bloc_test)*
5. **Login 429 rate-limit (5/phút/IP)** → message VN "Quá nhiều lần thử. Vui lòng thử lại sau ít phút." không phải lỗi chung chung. *(Task 11 widget test + bảng message)*

---

# M0 — Scaffold & Core

### Task 1: Scaffold Flutter + khung thư mục

**Files:**
- Create: `mobile/` (flutter create), `mobile/lib/core/…`, `mobile/lib/features/{auth,driver}/{domain,data,presentation}/` (placeholder `.dart` per folder, giữ cây thư mục)
- Modify: `mobile/android/app/build.gradle.kts` (applicationId, minSdk), `mobile/pubspec.yaml` (deps, version `1.0.0+1`)

**Interfaces:**
- Produces: project `mobile/` chạy được; deps cài sẵn cho mọi task sau; applicationId `com.iceflow.app`.

- [ ] **Step 1:** Ở repo root: `flutter create mobile --project-name iceflow_mobile --platforms android` ; `cd mobile && flutter pub add flutter_bloc get_it equatable dio flutter_secure_storage geolocator url_launcher go_router intl` ; `flutter pub add --dev bloc_test mocktail flutter_launcher_icons`
- [ ] **Step 2:** Sửa `android/app/build.gradle.kts`: `minSdk = 24`, `applicationId = "com.iceflow.app"`; sửa `AndroidManifest.xml`: `android:label="IceFlow"`, `INTERNET` permission; `pubspec.yaml`: `version: 1.0.0+1`
- [ ] **Step 3:** Tạo cây thư mục + placeholder (mỗi file chỉ `// TODO(M<n>)` comment): `lib/core/{config,network,error,storage,location,usecase}/`, `lib/features/{auth,driver}/{domain,data,presentation}/`
- [ ] **Step 4:** Sửa `mobile/test/widget_test.dart` thành smoke test: app placeholder home render text "IceFlow"
- [ ] **Step 5:** Run: `flutter analyze && flutter test` — Expected: PASS, 0 issue
- [ ] **Step 6:** Commit `chore(mobile): scaffold flutter project, clean-arch folders, deps`

### Task 2: Core — AppConfig, Failure, Result, AuthStorage

**Files:**
- Create: `mobile/lib/core/config/app_config.dart`, `mobile/lib/core/error/failure.dart`, `mobile/lib/core/error/failure_messages.dart`, `mobile/lib/core/result/result.dart`, `mobile/lib/core/storage/auth_storage.dart`
- Test: `mobile/test/core/failure_messages_test.dart`, `mobile/test/core/result_test.dart`

**Interfaces:**
- Produces (dùng bởi mọi task sau):
  - `class AppConfig { static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3001'); }`
  - `sealed class Failure`; subclasses: `AuthFailure(String message, {int? statusCode})`, `NetworkFailure()`, `ServerFailure(String message, {int? statusCode})`, `ValidationFailure(String message)`, `UnexpectedFailure(String message)`
  - `String failureMessage(Failure f)` — map VN: NetworkFailure→"Không có kết nối. Vui lòng thử lại.", 429→"Quá nhiều lần thử. Vui lòng thử lại sau ít phút.", AuthFailure 401→"Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."…
  - `sealed class Result<T>`: `Ok<T>(T value)` / `Err<T>(Failure failure)`; helpers `when(ok:, err:)`, `isOk`
  - `class AuthStorage { Future<void> saveToken(String token); Future<String?> readToken(); Future<void> clear(); }` (wrap `FlutterSecureStorage`, key `'auth_token'`)

- [ ] **Step 1:** Viết test: `failureMessage` trả đúng chuỗi VN cho từng Failure subclass + statusCode 429; `Result` pattern matching ok/err
- [ ] **Step 2:** Run `flutter test test/core/` — Expected: FAIL (chưa có file)
- [ ] **Step 3:** Implement 5 file theo Interfaces trên
- [ ] **Step 4:** Run `flutter analyze && flutter test test/core/` — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): core failure/result/app-config/secure-storage`

### Task 3: Network — Dio client + AuthInterceptor (refresh 1 lần)

**Files:**
- Create: `mobile/lib/core/network/auth_interceptor.dart`, `mobile/lib/core/network/api_client.dart` (factory dựng Dio), `mobile/lib/core/network/auth_events.dart` (broadcast logout)
- Modify: `mobile/pubspec.yaml` (+dev `http_mock_adapter`)
- Test: `mobile/test/core/network/auth_interceptor_test.dart`

**Interfaces:**
- Consumes: `AuthStorage` (Task 2), `AppConfig` (Task 2)
- Produces: `Dio createApiClient({required AuthStorage authStorage, required AuthEvents authEvents})` — baseUrl từ AppConfig, JSON headers
  - `AuthInterceptor`: có token → gắn `Authorization: Bearer <token>`; gặp **401** (trừ request tới `/api/auth/login`, `/api/auth/refresh`): (a) nếu request chưa đánh dấu `retried` → gọi `POST /api/auth/refresh` qua **dio instance riêng không interceptor**, lưu token mới, retry request gốc 1 lần; (b) refresh fail hoặc request đã retried mà vẫn 401 → `authStorage.clear()` + `authEvents.emitLogout()` và trả lỗi đi tiếp
  - `class AuthEvents { Stream<void> get onLogout; void emitLogout(); }`
- Lỗi dio → `Failure`: quy ước mapping tập trung `Failure mapDioError(Object error, {String? serverMessage})` đặt trong `auth_interceptor.dart` — `ConnectionError/timeout`→NetworkFailure; status≥500→ServerFailure(server error body); 400/403/404→ServerFailure; 401→AuthFailure; `DioException.badResponse` đọc `{error}` từ body làm message.

- [ ] **Step 1:** Viết test với `http_mock_adapter`: (1) có token → header Bearer đúng; (2) 401 → gọi refresh 1 lần → retry với token mới → thành công; (3) 401 + refresh 401 → clear storage + emitLogout; (4) 401 hai lần liên tiếp (retry xong vẫn 401) → clear + emitLogout, không refresh lần 2; (5) ConnectionError → NetworkFailure
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement `AuthInterceptor`, `mapDioError`, `createApiClient`, `AuthEvents`
- [ ] **Step 4:** Run `flutter analyze && flutter test test/core/` — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): dio client + auth interceptor with single-retry refresh`

### Task 4: LocationService — GPS, fail → null

**Files:**
- Create: `mobile/lib/core/location/location_service.dart`
- Test: `mobile/test/core/location/location_service_test.dart`

**Interfaces:**
- Produces: `class GeoPoint { final double lat; final double lng; }`
  - `class LocationService { LocationService({GeolocatorFacade? geo}); Future<GeoPoint?> getCurrentPosition(); }` — request permission (`LocationPermission.whenInUse`), từ chối hoặc exception bất kỳ → trả `null`, không throw. Wrap static calls của geolocator trong `class GeolocatorFacade { Future<LocationPermission> checkPermission(); Future<LocationPermission> requestPermission(); Future<Position> getPosition(); }` để mock được.

- [ ] **Step 1:** Test mocktail: (1) permission granted → GeoPoint đúng; (2) permission denied → null; (3) facade throw → null
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): location service with null-safe fallback`

---

# M1 — Backend Bearer JWT (additive)

### Task 5: B1 — `getSession()` + middleware đọc Bearer

**Files:**
- Modify: `src/lib/auth.ts:43-78` (`getSession`), `src/middleware.ts:8-10`
- Test: `tests/auth/bearer-session.test.ts` (mới, pattern source-check như `tests/api/driver-token-route.test.ts`)

**Interfaces:**
- Produces: `getSession()` đọc `headers().get('authorization')` (prefix `Bearer `, không phân biệt hoa thường) **trước**, fallback cookie `auth_token` như cũ; mọi caller hiện tại không đổi chữ ký. Middleware: `const authHeader = request.headers.get('authorization'); const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : request.cookies.get('auth_token')?.value;`

- [ ] **Step 1:** Viết `tests/auth/bearer-session.test.ts` source-check: `src/lib/auth.ts` chứa `headers()` + parse `Bearer` + vẫn còn `cookieStore.get('auth_token')`; `src/middleware.ts` chứa parse `authorization` trước `cookies.get('auth_token')`
- [ ] **Step 2:** Run `npm test` — Expected: FAIL (file test mới fail vì chưa sửa code)
- [ ] **Step 3:** Implement sửa `getSession()` (import `headers` từ `next/headers`, đọc Bearer trước cookie — phần verify JWT + isActive + impersonation giữ nguyên) và middleware (chỉ đổi nguồn token, mọi logic redirect/RBAC sau đó giữ nguyên)
- [ ] **Step 4:** Run `npm test && npm run typecheck` — Expected: PASS (toàn bộ suite cũ xanh = web regression)
- [ ] **Step 5:** Commit `feat(api): bearer JWT support in getSession + middleware (additive, cookie flow unchanged)`

### Task 6: B2 — Login trả token trong body

**Files:**
- Modify: `src/app/api/auth/login/route.ts:59-67`
- Test: `tests/auth/login-body-token.test.ts`

**Interfaces:**
- Produces: response body `apiSuccess({ user: {…như cũ}, token })` — `token` từ `signJWT` đã có ở route; cookie + rate limit + mọi validation giữ nguyên.

- [ ] **Step 1:** Test source-check: route chứa `token,` trong `apiSuccess({...})`, vẫn gọi `setSessionCookie`, vẫn có `rateLimit`
- [ ] **Step 2:** Run `npm test` — Expected: FAIL
- [ ] **Step 3:** Implement: thêm `token` vào body (1 dòng)
- [ ] **Step 4:** Run `npm test` — Expected: PASS
- [ ] **Step 5:** Commit `feat(api): login response includes JWT in body for non-browser clients`

### Task 7: B3 — Endpoint refresh (sliding session)

**Files:**
- Create: `src/app/api/auth/refresh/route.ts`
- Test: `tests/api/auth-refresh.test.ts`

**Interfaces:**
- Consumes: `getSession()` (Task 5 — Bearer-aware), `signJWT` (`src/lib/auth.ts`), `rateLimit`/`getIpFromRequest`, `apiSuccess`/`apiError`
- Produces: `POST /api/auth/refresh` — rate limit **30/phút/IP**; `const session = await getSession(); if (!session) return apiError('Unauthorized', 401);` → `signJWT({ userId: session.userId, email: session.email, name: session.name, role: session.role, factoryId: session.factoryId })` → `apiSuccess({ token })`. isActive đã được getSession re-check sẵn.

- [ ] **Step 1:** Test source-check: file mới tồn tại, `export async function POST`, dùng `getSession()`, có `rateLimit`, trả `apiSuccess({ token`, có nhánh 401 `apiError('Unauthorized', 401)`
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement route (~20 dòng)
- [ ] **Step 4:** Run `npm test && npm run typecheck` — Expected: PASS
- [ ] **Step 5:** Commit `feat(api): sliding-session refresh endpoint for mobile clients`

### Task 8: B1b — Confirm route nhận JWT Bearer (đi đường session)

**Files:**
- Modify: `src/app/api/orders/[id]/confirm/route.ts:32-41`
- Test: `tests/api/driver-confirm-jwt.test.ts`

**Interfaces:**
- Consumes: `verifyJWT` (`src/lib/auth.ts`)
- Produces: thứ tự phân giải driver trong confirm: (1) `authHeader` Bearer mà `verifyJWT(slice(7))` trả session hợp lệ → `getSessionDriver()` (nhờ Task 5, getSession đọc đúng Bearer; role DRIVER + profile check đã có trong `getSessionDriver`); (2) Bearer không phải JWT → driver share-token lookup **như cũ**; (3) body `{token}` → share-token **như cũ**; (4) cuối cùng → `getSessionDriver()` cookie path như cũ.

- [ ] **Step 1:** Test source-check: confirm route chứa `verifyJWT(`, có nhánh gọi `getSessionDriver()` khi Bearer là JWT, VẪN giữ `prismaAuth.driver.findUnique({ where: { token` (share-token path) và body token path
- [ ] **Step 2:** Run `npm test` — Expected: FAIL
- [ ] **Step 3:** Implement nhánh JWT-first trong khối phân giải auth (diff ~6 dòng; logic ownership/GPS sau đó không đổi)
- [ ] **Step 4:** Run `npm test` — Expected: PASS (gồm regression `tests/api/driver-confirm.test.ts` cũ)
- [ ] **Step 5:** Commit `feat(api): order confirm accepts logged-in driver via Bearer JWT session`

**🏁 Gate M1:** `npm test` xanh toàn bộ + `npm run typecheck` xanh. Web login + driver share-link chưa đổi hành vi (regression tests cũ xanh).

---

# M2 — Feature Auth (Flutter)

### Task 9: Auth domain + data

**Files:**
- Create: `mobile/lib/features/auth/domain/entities/user.dart` (+ enum `UserRole`), `mobile/lib/features/auth/domain/repositories/auth_repository.dart`, `mobile/lib/features/auth/domain/usecases/login.dart`, `…/restore_session.dart`, `…/logout.dart`
- Create: `mobile/lib/features/auth/data/dto/auth_dtos.dart`, `mobile/lib/features/auth/data/mappers/user_mapper.dart`, `mobile/lib/features/auth/data/auth_api.dart`, `mobile/lib/features/auth/data/auth_repository_impl.dart`
- Test: `mobile/test/features/auth/data/auth_repository_impl_test.dart`, `mobile/test/features/auth/data/user_mapper_test.dart`

**Interfaces:**
- Consumes: `createApiClient`, `AuthStorage`, `mapDioError` (Task 3); fixtures login/me từ phần đầu plan
- Produces:
  - `enum UserRole { admin, accountant, staff, driver, superAdmin; static UserRole fromName(String?) }`
  - `class User { final String id; final String email; final String name; final UserRole role; final String? factoryId; }`
  - `abstract class AuthRepository { Future<Result<User>> login({required String email, required String password}); Future<Result<User?>> restoreSession(); Future<Result<void>> logout(); }`
  - Impl: login → `POST /api/auth/login` → parse `data.user` + `data.token` → `authStorage.saveToken(token)` → User; restoreSession → không token → `Ok(null)`; có token → `GET /api/auth/me` → 200 → User, 401 → `authStorage.clear()` + `Ok(null)` (im lặng, đúng Review Focus 2); logout → `POST /api/auth/logout` (bỏ qua kết quả) + `authStorage.clear()` → `Ok(null)`
  - Mapper chỉ đọc `user` trong response me; số/tiền không liên quan auth.

- [ ] **Step 1:** Viết test mapper (fixture JSON từ đầu plan → User đúng role DRIVER) + repo test với `http_mock_adapter`: login thành công lưu token; login 401 → `Err(AuthFailure)` message từ server ("Email hoặc mật khẩu không đúng"); restoreSession 401 → `Ok(null)` + token cleared; restoreSession không token → Ok(null) không gọi network
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement domain (pure Dart) + data layer
- [ ] **Step 4:** Run `flutter analyze && flutter test` — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): auth domain + data layer with bearer token storage`

### Task 10: AuthCubit + DI + go_router redirect

**Files:**
- Create: `mobile/lib/features/auth/presentation/cubit/auth_cubit.dart`, `mobile/lib/injector.dart`, `mobile/lib/app.dart` (MaterialApp.router), `mobile/lib/router.dart`
- Modify: `mobile/lib/main.dart` (bootstrap: `configureDependencies()`, runApp)
- Test: `mobile/test/features/auth/presentation/cubit/auth_cubit_test.dart`, `mobile/test/router_test.dart`

**Interfaces:**
- Consumes: `AuthRepository` (Task 9), `AuthEvents` (Task 3)
- Produces:
  - `class AuthState extends Equatable`: `AuthUnknown` | `Authenticated(User user)` | `Unauthenticated({String? message})`
  - `class AuthCubit extends Cubit<AuthState>`: `restore()` (gọi restoreSession; `Ok(null)` → Unauthenticated); `login(email, password)` — **Review Focus 4**: `user.role != UserRole.driver` → emit `Unauthenticated(message: 'Tài khoản này chưa dùng được trên app')` + `authStorage.clear()`; thành công → Authenticated; `logout()` → Unauthenticated; nghe `authEvents.onLogout` → emit Unauthenticated
  - `void configureDependencies()` (get_it: AuthStorage, AuthEvents, Dio, LocationService, AuthApi, AuthRepository, AuthCubit — registerLazySingleton/Factory)
  - Router: `/login` → LoginScreen; `/home` → HomeShell; redirect theo `AuthCubit` stream (bridge `GoRouterRefreshStream`): unknown → chờ; Unauthenticated → `/login`; Authenticated → `/home`

- [ ] **Step 1:** bloc_test: restore có session → Authenticated; restore không session → Unauthenticated; login đúng DRIVER → Authenticated; login role STAFF → Unauthenticated + message đúng (Review Focus 4); onLogout event → Unauthenticated. Router test: state mỗi kiểu → route đích đúng
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement cubit + injector + router + app
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): auth cubit, DI wiring, role-aware router redirects`

### Task 11: LoginScreen (S1)

**Files:**
- Create: `mobile/lib/features/auth/presentation/screens/login_screen.dart`, `mobile/lib/core/localization/strings.dart` (bảng copy UI tập trung)
- Test: `mobile/test/features/auth/presentation/screens/login_screen_test.dart`

**Interfaces:**
- Consumes: `AuthCubit`, `failureMessage` (Task 2), `strings.dart`
- Produces: LoginScreen — 2 TextField (email validator, password), nút "Đăng nhập"; submit → `cubit.login`; `Unauthenticated(message)` → SnackBar/Text lỗi; `Authenticated` → router tự redirect. Thương hiệu: text "IceFlow" + icon placeholder.

- [ ] **Step 1:** Widget test: (1) submit khi email/password rỗng → hiện lỗi validate, KHÔNG gọi cubit; (2) submit hợp lệ → gọi đúng `login(email, password)`; (3) state lỗi "Sai email hoặc mật khẩu không đúng" (fixture AuthFailure 401) → text lỗi hiển thị; (4) 429 → message "Quá nhiều lần thử…" (Review Focus 5); (5) đang submit → nút disabled + spinner
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement LoginScreen + strings.dart
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): login screen with VN validation and error messages`

---

# M3 — Feature Driver (S2, S3, S5)

### Task 12: Driver domain + data

**Files:**
- Create: `mobile/lib/features/driver/domain/entities/delivery_order.dart` (+ `OrderItem`, `enum OrderStatus { shipping, delivered }`), `mobile/lib/features/driver/domain/repositories/driver_repository.dart`, `mobile/lib/features/driver/domain/usecases/get_orders_for_date.dart`, `…/confirm_delivery.dart`
- Create: `mobile/lib/features/driver/data/dto/driver_dtos.dart`, `mobile/lib/features/driver/data/mappers/order_mapper.dart`, `mobile/lib/features/driver/data/driver_repository_impl.dart`
- Test: `mobile/test/features/driver/data/order_mapper_test.dart`, `mobile/test/features/driver/data/driver_repository_impl_test.dart`

**Interfaces:**
- Consumes: `createApiClient`, `mapDioError` (Task 3); fixture `GET /api/driver/orders` từ đầu plan; confirm response fixture
- Produces:
  - `class DeliveryOrder { final String id; final OrderStatus status; final double total; final String customerName; final String customerAddress; final String customerPhone; final List<OrderItem> items; final DateTime createdAt; final DateTime? deliveredAt; }`
  - `class OrderItem { final String productName; final double quantity; final double unitPrice; final double lineTotal; }` (hiển thị: productName + quantity + lineTotal; tiền format `intl` `#,##0đ` — làm ở presentation)
  - `OrderStatus.fromName('SHIPPING'|'DELIVERED'|khác)` — giá trị lạ → shipping (an toàn hiển thị, đơn lạ vẫn thao tác được)
  - `abstract class DriverRepository { Future<Result<List<DeliveryOrder>>> getOrders(DateTime date); Future<Result<void>> confirmDelivery({required String orderId, GeoPoint? gps}); }`
  - Impl: `getOrders` → `GET /api/driver/orders?date=yyyy-MM-dd` (UTC+7: format ngày local — dùng `intl` `DateFormat('yyyy-MM-dd').format(date)`, giữ nguyên behavior server filter `createdAt`); `confirmDelivery` → `PATCH /api/orders/{id}/confirm` body `{'gps': gps == null ? null : {'lat': gps.lat, 'lng': gps.lng}}`; 401 → `Err(AuthFailure)` (interceptor đã xử lý refresh/logout trước đó — Review Focus 1 không loop đã pin ở Task 3)

- [ ] **Step 1:** Test mapper với fixture đầy đủ (2 orders: SHIPPING + DELIVERED, items 2 dòng, deliveredAt null) + repo test: getOrders 200 → list đúng; getOrders 401 → AuthFailure; confirmDelivery gps null → body `{"gps": null}`; confirmDelivery có gps → body đúng; confirm 404 → ServerFailure
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): driver domain + data layer with order mapper`

### Task 13: TodayOrdersCubit + HistoryCubit

**Files:**
- Create: `mobile/lib/features/driver/presentation/cubit/today_orders_cubit.dart`, `mobile/lib/features/driver/presentation/cubit/history_cubit.dart`
- Test: `mobile/test/features/driver/presentation/cubit/today_orders_cubit_test.dart`, `…/history_cubit_test.dart`

**Interfaces:**
- Consumes: `GetOrdersForDate`, `ConfirmDelivery` use cases, `LocationService` (Task 4)
- Produces:
  - `class TodayOrdersState extends Equatable { final TodayStatus status; final List<DeliveryOrder> orders; final String? errorMessage; final String? confirmingOrderId; }` enum `TodayStatus { loading, loaded, error }`
  - `class TodayOrdersCubit extends Cubit<TodayOrdersState>`: `load()` (mặc định ngày hôm nay, server-local), `refresh()`, `confirm(orderId)`: emit `confirmingOrderId` → `LocationService.getCurrentPosition()` → use case `confirmDelivery(orderId, gps)` → thành công: cập nhật order trong list (`status: delivered`, `deliveredAt: now`) + **reorder delivered xuống cuối** + clear confirming; thất bại: giữ nguyên list + `errorMessage` từ `failureMessage`
  - `class HistoryState { final HistoryStatus status; final DateTime selectedDate; final List<DeliveryOrder> orders; final String? errorMessage; }` — `HistoryCubit`: `selectDate(DateTime)` (chặn tương lai; chặn > 30 ngày trước → giữ ngày hợp lệ gần nhất + errorMessage "Chỉ xem được trong 30 ngày gần nhất") + load

- [ ] **Step 1:** bloc_test: load success → loaded đúng thứ tự (SHIPPING trước DELIVERED); load error → error + message; confirm thành công → order chuyển delivered + xuống cuối + không còn confirming; confirm thất bại → list KHÔNG đổi + errorMessage; HistoryCubit selectDate hôm qua → load; selectDate 40 ngày trước → errorMessage + giữ ngày; selectDate tương lai → chặn
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement (mock `LocationService` trong test bằng `mocktail`)
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): today orders + history cubits with confirm flow state`

### Task 14: UI Driver — HomeShell, TodayTab, ConfirmSheet, SettingsTab (S2, S3, S5)

**Files:**
- Create: `mobile/lib/features/driver/presentation/screens/home_shell.dart` (bottom nav 3 tab), `…/today_tab.dart`, `…/widgets/delivery_card.dart`, `…/widgets/confirm_sheet.dart`, `…/history_tab.dart` (placeholder list, đầy đủ ở M4), `…/settings_tab.dart`
- Modify: `mobile/lib/router.dart` (`/home` → HomeShell), `mobile/test/widget_test.dart` (giữ smoke test hợp lệ)
- Test: `mobile/test/features/driver/presentation/screens/delivery_card_test.dart`, `…/today_tab_test.dart`, `…/confirm_sheet_test.dart`

**Interfaces:**
- Consumes: `TodayOrdersCubit`, `AuthCubit` (tên user + logout), `url_launcher` (`tel:$phone`, Google Maps `https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}`), `strings.dart`
- Produces: TodayTab — AppBar "Đơn hôm nay" + RefreshIndicator; ListView DeliveryCard: tên khách + badge (Đang giao xanh/Đã giao xám, delivered xếp cuối — cubit đảm bảo), địa chỉ, tóm tắt items ("2 đá 10kg, 1 đá 5kg"), tổng "350.000đ", hàng nút [📞 Gọi] [🧭 Chỉ đường] + nút chính "✓ ĐÃ GIAO" (ẩn khi delivered); empty → "Hôm nay chưa có đơn giao 🎉"; error → message + nút "Thử lại"; banner mất mạng khi `NetworkFailure` (Review Focus: nhìn thấy được). ConfirmSheet: "Xác nhận đã giao cho {tên}?" + [Xác nhận] → `cubit.confirm(orderId)`; thành công → pop + SnackBar "Đã xác nhận giao ✅". SettingsTab: tên + email từ AuthCubit, nút "Đăng xuất" (confirm dialog), "Phiên bản 1.0.0"

- [ ] **Step 1:** DeliveryCard widget test: SHIPPING render đủ tên/địa chỉ/items/tổng/nút; DELIVERED ẩn nút confirm + badge xám. TodayTab test: state loading → spinner; empty → text 🎉; error → "Thử lại" gọi `load()`; pull-refresh gọi `refresh()`. ConfirmSheet test: bấm Xác nhận → cubit.confirm được gọi (Review Focus 3: mock LocationService trả null → cubit vẫn gọi confirmDelivery với gps null — pin ở đây qua cubit đã test Task 13, widget chỉ bảo đảm flow bấm)
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement UI (Material 3, light theme, text scale to: title 18, body 16, nút cao ≥ 48dp)
- [ ] **Step 4:** Run `flutter analyze && flutter test` — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): driver home shell, today list, confirm sheet, settings`

**🏁 Gate M3:** trên emulator (`PORT=3001 npm run dev` + `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001`): login bằng tài khoản DRIVER thật (user có Driver profile) → thấy đơn demo (tạo qua web) → bấm ĐÃ GIAO → đơn chuyển trạng thái → web thấy DELIVERED + GPS trong order detail.

---

# M4 — Lịch sử (S4)

### Task 15: HistoryTab UI

**Files:**
- Modify: `mobile/lib/features/driver/presentation/screens/history_tab.dart` (điền UI thật thay placeholder)
- Test: `mobile/test/features/driver/presentation/screens/history_tab_test.dart`

**Interfaces:**
- Consumes: `HistoryCubit` (Task 13), `DeliveryCard` (Task 14 — chế độ read-only: ẩn nút Gọi/Chỉ đường/ĐÃ GIAO)
- Produces: HistoryTab — row chọn ngày: nút "◀" / label ngày (dd/MM/yyyy) / nút "▶"; chọn ≤ hôm qua, ≥ 30 ngày trước; chạm label → `showDatePicker` (firstDate: today-30, lastDate: yesterday); list read-only + empty "Không có đơn trong ngày này"

- [ ] **Step 1:** Widget test: build → cubit đã chọn hôm qua; bấm "◀" → `selectDate(day-1)`; bấm label → date picker mở với range đúng; list error → message; 30-day clamp đã pin ở Task 13
- [ ] **Step 2:** Run — Expected: FAIL
- [ ] **Step 3:** Implement
- [ ] **Step 4:** Run — Expected: PASS
- [ ] **Step 5:** Commit `feat(mobile): history tab with date navigation (30-day window)`

**🏁 Gate M4:** emulator: chuyển tab Lịch sử → hôm qua hiện đúng đơn; tua ra ngoài 30 ngày → bị chặn + message.

---

# M5 — Polish & Release

### Task 16: App identity + strings sweep

**Files:**
- Modify: `mobile/pubspec.yaml` (flutter_launcher_icons config), `mobile/android/app/src/main/AndroidManifest.xml`, icon asset `mobile/assets/icon/iceflow_icon.png` (tạo PNG 1024 từ text "I" nền xanh băng — script đơn giản hoặc asset tĩnh)
- Create: `mobile/android/app/src/main/res/xml/network_security_config.xml`
- Modify: `mobile/android/app/src/main/AndroidManifest.xml` (cleartext config), `mobile/lib/core/localization/strings.dart` (bổ sung thiếu sót)
- Test: sweep là verification task — không test mới

**Interfaces:**
- Produces: app label "IceFlow", icon launcher custom, cleartext chỉ debug + chỉ 10.0.2.2 (`android:networkSecurityConfig`; release dùng mặc định = HTTPS only)

- [ ] **Step 1:** Tạo icon PNG (đơn giản: chữ I trắng nền #0EA5E9), config `flutter_launcher_icons` + `dart run flutter_launcher_icons`
- [ ] **Step 2:** `network_security_config.xml`: debug cho cleartext `10.0.2.2`; manifest gắn config
- [ ] **Step 3:** Sweep: `grep -rn "Text(" mobile/lib --include="*.dart"` — mọi string UI nằm trong `strings.dart` hoặc là tiếng Việt; sửa lệ
- [ ] **Step 4:** Run `flutter analyze && flutter test` — Expected: PASS
- [ ] **Step 5:** Commit `chore(mobile): app identity, launcher icon, cleartext restricted to debug emulator`

### Task 17: Release signing + build APK + QA checklist

**Files:**
- Create: `mobile/android/key.properties` (gitignored), keystore `~/.android/iceflow-release.jks` (NGOÀI repo)
- Modify: `mobile/android/app/build.gradle.kts` (signingConfig release đọc key.properties), `mobile/.gitignore` (+key.properties), `mobile/README.md` (hướng dẫn build + QA checklist)
- Test: verification task — deliverable là APK

**Interfaces:**
- Produces: lệnh build chuẩn: `flutter build apk --release --dart-define=API_BASE_URL=<prod-url>` → `mobile/build/app/outputs/flutter-apk/app-release.apk` signed

- [ ] **Step 1:** `keytool -genkeypair -v -keystore ~/.android/iceflow-release.jks -alias iceflow -keyalg RSA -keysize 2048 -validity 10000` (nhắc user lưu password an toàn — KHÔNG commit password)
- [ ] **Step 2:** `key.properties` (storeFile/storePassword/keyAlias/keyPassword) + `.gitignore`; sửa build.gradle.kts: `signingConfigs.release` + `buildTypes.release` dùng nó
- [ ] **Step 3:** Build release với `API_BASE_URL` prod URL thật (hỏi user nếu chưa có domain — nếu chưa có, build với URL staging/lan để QA) — Expected: BUILD SUCCESSFUL, file APK tồn tại
- [ ] **Step 4:** QA checklist (emulator + máy Android thật nếu có) chạy trọn luồng: (1) login driver; (2) xem đơn hôm nay; (3) Gọi + Chỉ đường mở app ngoài; (4) ĐÃ GIAO có GPS; (5) lịch sử 30 ngày; (6) logout; (7) airplane mode → banner + retry; (8) nhập sai password 6 lần → message 429; (9) khôi phục mạng → app hoạt động lại. Ghi kết quả vào `mobile/README.md`
- [ ] **Step 5:** Commit `chore(mobile): release signing, build pipeline, QA checklist`

**🏁 Gate M5 (kết thúc Phase 1):** APK signed cài được; QA checklist pass ≥ 8/9 (mục 9 chỉ fail nếu do env thật như domain chưa có — ghi rõ). Sau đó: cập nhật `AGENTS.md` + `docs/STACK.md` ghi nhận mobile app tồn tại (mobile constraint superseded), đề xuất Phase 2.
