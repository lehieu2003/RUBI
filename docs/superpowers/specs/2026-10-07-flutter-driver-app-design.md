# Spec: IceFlow Mobile — App Flutter cho mọi role, Phase 1 = Tài xế (2026-10-07)

**Mục tiêu:** Xây **app mobile Flutter của IceFlow** — một app duy nhất phục vụ mọi role (tài xế, staff, kế toán, chủ xưởng), song song với web Next.js hiện có (không thay thế). **Phase 1 lộ diện phần tài xế trước**: đăng nhập, xem đơn giao hôm nay, xác nhận giao kèm GPS, xem lịch sử. Phase 2+ bổ sung tính năng cho các role khác vào **cùng app này** (cùng APK, không làm app riêng). Web giữ nguyên 100% — mobile là một client mới cùng gọi chung backend.

**Đã chốt với user (2026-10-07):**

| Quyết định | Lựa chọn |
|---|---|
| Phạm vi tổng | **Một app mobile duy nhất cho mọi role**; triển khai phase-by-phase — Phase 1 = tài xế trước; Phase 2+ (staff order entry, accountant, owner reports) thêm dần vào cùng app |
| Nền tảng Phase 1 | **Android only**, phát hành **APK trực tiếp** (qua Zalo), không qua Play Store |
| Đăng nhập driver | **Email/mật khẩu** (không dùng share-token) — tạo nền auth Bearer JWT tái dùng Phase 2+ |
| Offline | **Online-only** Phase 1; mất mạng → thông báo rõ + retry. Offline cache/queue là phase sau nếu thực tế đòi hỏi |
| State management Flutter | **flutter_bloc** (Cubit cho state đơn giản), DI bằng `get_it` (đăng ký thủ công) |
| Kiến trúc Flutter | **Clean Architecture feature-first** (presentation → domain ← data) |
| Vị trí code | Thư mục `mobile/` **trong repo IceFlow-SaaS** |

**Lưu ý constraint:** `AGENTS.md` ghi "One codebase (Next.js/React), no native mobile" — spec này **supersede** constraint đó theo quyết định của owner (2026-10-07). Cần cập nhật AGENTS.md/STACK.md khi kết thúc Phase 1.

## 1. Kiến trúc tổng thể

```
┌─────────────┐  Authorization:   ┌──────────────────────────┐
│ Flutter App │  Bearer <jwt>     │ Next.js API (hiện có)    │
│  mobile/    │ ────────────────► │ middleware + getSession  │──► Prisma ──► Postgres (Supabase)
└─────────────┘  HTTPS            │ đọc Bearer HOẶC cookie   │
                                  │ (additive, web giữ cookie│
                                  │  flow y nguyên)          │
```

- **Một nguồn sự thật:** toàn bộ business logic (tenant guard Prisma `$extends`, RBAC `requireRole`, subscription gate, đối soát → nợ + kho) nằm ở server Next.js. Flutter chỉ là client mới.
- Mobile gọi các API route hiện có; thay đổi backend **100% additive** (mục 3). Luồng cookie của web không đổi hành vi.
- **Một app, điều hướng theo role:** sau login, shell quyết định destination theo role session (Phase 1: DRIVER → 3 tab tài xế). Phase 2+ thêm destination cho STAFF/ACCOUNTANT/ADMIN vào cùng shell — không phải viết lại khung app. Response envelope `{ data }` / error shapes không nhất quán giữa các endpoint: **mobile normalize ở data layer**, không sửa backend vì chuyện cosmetic.

## 2. Kiến trúc Flutter (Clean Architecture, feature-first)

```
mobile/lib/
├── main.dart                 # bootstrap: dotenv(dart-define), DI, runApp
├── core/
│   ├── network/              # dio client, AuthInterceptor (gắn Bearer; 401 → refresh 1 lần → logout)
│   ├── error/                # sealed Failure {AuthFailure, NetworkFailure, ServerFailure, ValidationFailure}
│   │                         #   + bảng message tiếng Việt tập trung
│   ├── storage/              # SecureStorage wrapper (flutter_secure_storage): JWT access token (sliding refresh — không có refresh-token riêng, xem B3)
│   ├── result/               # sealed Result<T> (Success | Failure) — Dart 3, không thêm dep
│   ├── usecase/              # base UseCase<In, Out>
│   └── config/               # AppConfig đọc --dart-define (API_BASE_URL, APP_ENV)
└── features/
    ├── auth/
    │   ├── domain/           # entity User, AuthRepository (abstract), Login/GetSession/Logout use cases
    │   ├── data/             # AuthApi (dio), DTO + mapper, AuthRepositoryImpl
    │   └── presentation/     # AuthCubit, LoginScreen
    └── driver/
        ├── domain/           # entity Order/OrderItem/CustomerInfo, DriverRepository,
        │                     #   GetTodayOrders/ConfirmDelivery/GetHistory use cases
        ├── data/             # DriverApi, DTO + mapper, DriverRepositoryImpl
        └── presentation/     # TodayOrdersCubit, HistoryCubit, các màn S2–S5
```

**Quy tắc layer:**
- `domain/` là Dart thuần — **không import** dio/flutter/flutter_bloc; test được 100%.
- `data/` impl repository; bắt mọi exception dio → map sang `Failure`; trả `Result<T>`.
- `presentation/` chỉ nhận `Result`/state object, map `Failure` → message VN từ bảng tập trung.
- **Exception không vượt qua layer.** Quy tắc 401 xử lý tập trung ở AuthInterceptor, tầng trên không cần biết.

**Packages Phase 1** (tối thiểu): `flutter_bloc`, `get_it`, `equatable`, `dio`, `flutter_secure_storage`, `geolocator`, `url_launcher`, `go_router`, `intl`; dev: `bloc_test`, `mocktail`, `flutter_launcher_icons`.

**Điều hướng:** `go_router` StatefulShellRoute, bottom nav 3 tab: Hôm nay / Lịch sử / Cài đặt. Chưa đăng nhập → LoginScreen; token hết hạn không cứu được → về LoginScreen. Shell là **role-aware**: Phase 1 chỉ có destination DRIVER; Phase 2+ thêm destination theo role mà không đổi khung navigation/auth.

## 3. Thay đổi backend (100% additive, web không đổi hành vi)

| # | Thay đổi | File | Chi tiết |
|---|---|---|---|
| B1 | Middleware + session đọc Bearer | `src/middleware.ts`, `src/lib/auth.ts` | Nếu có header `Authorization: Bearer <jwt>` → verify token đó; không có → đọc cookie `auth_token` như cũ (header ưu tiên). `getSession()` giữ re-check `user.isActive` mỗi lần gọi → deactive user có hiệu lực tức thì trên mobile. Claims Bearer = claims cookie, không thêm quyền. |
| B2 | Login trả token trong body | `POST /api/auth/login` | Body response thêm `token` (JWT 7 ngày) cạnh user info hiện có; cookie vẫn set; rate limit 5/min/IP giữ nguyên. Web client không đọc field này → zero impact. |
| B3 | Refresh sliding session | `POST /api/auth/refresh` (mới) | Bearer token còn hạn vào → verify + check `isActive` → trả JWT mới 7 ngày trong body. App gọi chủ động khi mở app + khi gặp 401. Không có refresh-token table/rotation Phase 1 (ghi roadmap Phase 2). |
| B4 | API driver — verify + bổ sung tối thiểu | `GET /api/driver/orders` | Verify khi viết plan: (a) session mode có nhận `?date=` chưa (token mode có sẵn) — nếu chưa thì thêm; (b) response có kèm `OrderItem` chưa — nếu chưa, thêm field additive. Nếu cần chi tiết đơn: thêm `GET /api/driver/orders/[id]` scope đúng đơn của tài xế đó, role DRIVER. Nguyên tắc: **nhỏ nhất đủ dùng**. |

**Không đổi:** tenant guard, RBAC path-based + `requireRole`, `requireActiveSubscription` (mobile chịu cùng luật web — hết hạn subscription vẫn chặn write), impersonation block, rate limits.

**Test backend (vitest, suite có sẵn):** middleware nhận Bearer; login trả token trong body; refresh (token hết hạn → 401, user !isActive → 401, thành công → token mới); `?date=` session mode; **regression: luồng cookie web hoạt động y nguyên**.

## 4. Màn hình & luồng UX (UI 100% tiếng Việt, light theme, chữ to nút to)

App name: **IceFlow** (một app cho mọi role — Phase 1 chỉ lộ diện tính năng tài xế). Driver minimal tech — ít bước nhất có thể.

| Màn | Nội dung |
|---|---|
| S1 Đăng nhập | Email + mật khẩu, validate + lỗi VN ("Sai email hoặc mật khẩu"). Token lưu secure storage; mở app sau đó tự vào Home nếu còn hạn. |
| S2 Tab Hôm nay | Danh sách đơn SHIPPING/DELIVERED hôm nay (pull-to-refresh). Card: tên khách, badge trạng thái (Đang giao/Đã giao — đơn đã giao chìm xuống cuối), địa chỉ, tóm tắt items + tổng tiền. Nút **📞 Gọi** (tel:) và **🧭 Chỉ đường** (mở Google Maps theo địa chỉ — không dựng map trong app, web đã có map riêng, YAGNI). |
| S3 Xác nhận giao | Tap "✓ ĐÃ GIAO" → bottom sheet confirm → bắt GPS tự động (`geolocator`; từ chối quyền → vẫn xác nhận với `gps: null` — đúng hành vi web cho phép) → API → snackbar "Đã xác nhận giao ✅" → card cập nhật ngay trong list. Xin quyền vị trí đúng lúc bấm lần đầu, kèm giải thích VN. |
| S4 Tab Lịch sử | Chọn ngày (mặc định hôm qua, tối đa 30 ngày), list read-only, hiện trạng thái cuối. Không nút thao tác. |
| S5 Tab Cài đặt | Tên tài xế + tên nhà máy, Đăng xuất (xoá token), phiên bản app. |

**Trạng thái chung mọi màn:** loading (skeleton/spinner), empty ("Hôm nay chưa có đơn giao 🎉"), mất mạng (banner "Không có kết nối" + Thử lại), lỗi action (message VN). Token hết hạn: tự refresh 1 lần → fail → về S1.

**Bloc mapping:** `AuthCubit` (login/session/logout), `TodayOrdersCubit` (load/refresh/confirm — confirm cập nhật đúng card + reorder), `HistoryCubit` (theo ngày). State `Loading/Loaded/Error` với `equatable`.

## 5. Bảo mật

- JWT access token ở **`flutter_secure_storage`** (Android Keystore/EncryptedSharedPreferences) — không có refresh-token riêng trong Phase 1 (B3 là sliding session). Logout hoặc refresh fail → xoá sạch. Không bao giờ dùng SharedPreferences/plain file cho token.
- **Không secret nào trong APK.** `API_BASE_URL` qua `--dart-define`. Bảo mật thật nằm ở server; client chỉ giữ JWT có hạn.
- Mobile không được ưu đãi gì hơn web: rate limit, bcrypt, `isActive` re-check, tenant guard, RBAC — giữ nguyên (mục 3).
- Dev qua HTTP cleartext (`http://10.0.2.2:3001` từ Android emulator) chỉ phép ở **debug** (network security config giới hạn đúng 10.0.2.2); **release build chỉ HTTPS**.
- Cert pinning: **không làm** Phase 1 (YAGNI, rủi ro cert rotation) — backlog.

## 6. Error handling (tóm tắt)

Sealed `Failure` + `Result<T>` ở Dart 3 (không thêm dep); data layer map lỗi dio → Failure; presentation map Failure → message VN từ 1 bảng tập trung; 401 → refresh 1 lần → fail thì logout. Chi tiết ở mục 2.

## 7. Testing (TDD khi implement — mỗi task có verify riêng)

| Tầng | Công cụ | Phạm vi Phase 1 |
|---|---|---|
| Domain use cases | `mocktail`, pure Dart | Login, GetTodayOrders, ConfirmDelivery, GetHistory |
| Data (mapper/repo) | `mocktail` + dio mock | DTO→entity, map Failure, retry-401 logic |
| Bloc | `bloc_test` | AuthCubit, TodayOrdersCubit (load/refresh/confirm đúng card + reorder), HistoryCubit |
| Widget | `flutter_test` | Login form validate, DeliveryCard trạng thái + nút |
| Backend | vitest | B1–B4 + regression cookie flow |

Cổng ra mỗi milestone: `flutter analyze` + `flutter test` xanh và `npm test` xanh (khi đụng backend).

## 8. Build & release

- App id `com.iceflow.app`, version `1.0.0+1` (pubspec). Icon + splash cơ bản ngay Phase 1 (`flutter_launcher_icons`).
- **Signing:** release keystore nằm **ngoài repo**, đường dẫn + password qua `key.properties` (gitignored). Không phát hành bằng debug keystore.
- Lệnh: `flutter build apk --release --dart-define=API_BASE_URL=<prod>` → 1 fat APK (~4 tài xế, per-ABI để sau).
- Phân phối: gửi APK qua Zalo; tài xế bật "cài từ nguồn không xác định".

## 9. Lộ trình thực thi Phase 1 (milestones)

| # | Milestone | Kết quả kiểm chứng |
|---|---|---|
| M0 | Scaffold `mobile/`, khung Clean Architecture, dio/get_it/bloc/go_router wiring | `flutter analyze` + `flutter test` xanh; app chạy màn trống trên emulator |
| M1 | Backend B1–B3 (+ B4 nếu rõ ngay) | vitest xanh + regression web xanh; login web vẫn OK |
| M2 | Feature auth (S1): login, secure storage, AuthInterceptor | Test xanh; login thật trên emulator → vào Home trống |
| M3 | Feature driver (S2+S3+S5): đơn hôm nay, confirm GPS, cài đặt/logout | Test xanh; trên emulator confirm được đơn demo, GPS ghi nhận |
| M4 | Lịch sử (S4) + verify/extend `?date=` (B4) | Test xanh; xem đơn ngày quá khứ được |
| M5 | Polish chuỗi VN + empty/error states + icon; build APK release | APK cài được máy Android thật, chạy trọn luồng theo QA checklist |

Sau M5 → cập nhật AGENTS.md/STACK.md (constraint mobile), tổng kết Phase 1.

## 10. Việc cần verify khi viết plan (không chặn spec)

1. `GET /api/driver/orders` session mode có nhận `?date=` không; response có `OrderItem` không.
2. Có cần `GET /api/driver/orders/[id]` cho chi tiết đơn không, hay list đã đủ dữ liệu card.
3. Endpoint confirm (`PATCH /api/orders/[id]/confirm`) nhận role DRIVER qua Bearer session đúng như qua share-token không.
4. Định dạng GPS gửi lên (khớp `{ gps: {lat,lng} }` của web).

## 11. Ngoài phạm vi Phase 1 (vào CÙNG app ở các phase sau — không phải app riêng)

iOS, Play Store, offline cache/sync, push notification (FCM), dark mode, map trong app, refresh-token rotation; tính năng theo role: staff order entry, accountant/settle, owner reports — mỗi phase có chu trình brainstorm→spec→plan riêng, tái dùng nền auth Bearer + shell role-aware của Phase 1.
