# Quick Task 261012-mcs: Sắp lại `mobile/lib/core` theo cấu trúc user gửi

**Date:** 2026-10-12
**Nguồn:** User gửi ảnh cấu trúc `core/` (auth, bootstrap, constants, di, extensions, network, pagination, patch, services, storage, view_state, `core.dart`) và yêu cầu follow theo.

## Task 1 — Chuyển code hiện có vào đúng chỗ

- `injector.dart`, `injector.config.dart`, `network_module.dart`, `StorageModule` → `core/di/` (`injection_container`, `injection_modules`).
- `config/app_config.dart` → `constants/api_constants.dart`.
- `error/failure.dart`, `error/failure_messages.dart` → `network/api_failure.dart`, `network/api_failure_messages.dart`; `mapDioError` tách khỏi `auth_interceptor.dart` → `network/api_error_decoder.dart`.
- Khởi động trong `main.dart` → `bootstrap/app_startup.dart`.

## Task 2 — Phần dùng chung mới

- `view_state/view_status.dart` thay `TodayStatus` và `HistoryStatus`.
- `extensions/build_context_extensions.dart` cho `Theme.of(context)`.
- `core.dart`.

## Không tạo

Thư mục chưa có code để chứa: `pagination/`, `patch/`, `services/`, `auth/`.

## Verify

`flutter analyze`, `flutter test`; không đổi hành vi.
