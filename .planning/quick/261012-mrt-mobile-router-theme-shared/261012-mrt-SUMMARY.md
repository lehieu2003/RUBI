---
status: complete
---

# Quick Task 261012-mrt Summary: Mobile — router, theme, shared widgets

**Date:** 2026-10-12 · **Branch:** `refactor/mobile-router-theme-shared` · **Status:** complete ✓

## Shipped

| Trước | Sau |
|---|---|
| `lib/router.dart` | `core/router/app_router.dart`, `route_names.dart`, `app_router_refresh.dart` |
| chuỗi `'/login'`, `'/home'` viết tay | `RouteNames.login`, `RouteNames.home` |
| `_AuthListenable` (riêng cho AuthCubit) | `AppRouterRefresh(stream)` dùng được cho stream bất kỳ |
| `ThemeData(...)` trong `app.dart` | `core/theme/app_theme.dart` (`AppTheme.light`) |
| `features/driver/presentation/widgets/error_views.dart` | `shared/widgets/error_views.dart` |

Test chuyển theo (`test/core/router/`), thêm một test cho `AppRouterRefresh`.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 228/228 (227 test cũ, 1 test mới).
- Không đổi hành vi, không đổi màu.

## Ghi chú

- `core/router/app_router.dart` import màn hình của các feature (router phải biết màn hình). `core.dart` vì thế không export `app_router.dart`, chỉ export `route_names` và `app_router_refresh`, để feature dùng `core.dart` không kéo theo vòng import.
- Tên file là `route_names.dart` (user gọi là "router name").
- Chưa chạy app trên máy/giả lập.
