# Quick Task 261012-mrt: Mobile — thư mục router, theme và shared widgets

**Date:** 2026-10-12
**Nguồn:** User: tạo thêm folder shared widgets; router gồm app_router, router name, app router refresh; theme.

## Task 1 — `core/router/`

- `lib/router.dart` tách thành `app_router.dart` (bảng route + redirect theo phiên), `route_names.dart` (đường dẫn), `app_router_refresh.dart` (stream → Listenable).

## Task 2 — `core/theme/`

- `ThemeData` trong `app.dart` → `app_theme.dart`. Không đổi màu.

## Task 3 — `shared/widgets/`

- `ErrorView`, `ErrorBanner` rời feature `driver` → `lib/shared/widgets/error_views.dart`.

## Verify

`flutter analyze`, `flutter test`; không đổi hành vi.
