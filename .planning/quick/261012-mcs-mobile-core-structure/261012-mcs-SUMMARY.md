---
status: complete
---

# Quick Task 261012-mcs Summary: Sắp lại `mobile/lib/core`

**Date:** 2026-10-12 · **Branch:** `refactor/mobile-core-structure` · **Status:** complete ✓

## Shipped

| Trước | Sau |
|---|---|
| `lib/injector.dart`, `lib/injector.config.dart` | `core/di/injection_container.dart`, `.config.dart` |
| `core/network/network_module.dart`, `StorageModule` trong `app_preferences.dart` | `core/di/injection_modules.dart` |
| `core/config/app_config.dart` (`AppConfig.apiBaseUrl`) | `core/constants/api_constants.dart` (`ApiConstants.baseUrl`, `.timeout`) |
| `core/error/failure.dart` | `core/network/api_failure.dart` |
| `core/error/failure_messages.dart` | `core/network/api_failure_messages.dart` |
| `mapDioError` trong `auth_interceptor.dart` | `core/network/api_error_decoder.dart` |
| các bước khởi động trong `main.dart` | `core/bootstrap/app_startup.dart` |
| `TodayStatus`, `HistoryStatus` | `core/view_state/view_status.dart` (`ViewStatus`) |
| `Theme.of(context).colorScheme` / `.textTheme` ở 20 chỗ | `core/extensions/build_context_extensions.dart` |
| `core/usecase/usecase.dart` (một dòng TODO) | xoá |
| — | `core/core.dart` |

Giữ nguyên: `localization/`, `result/`, `storage/`. Test chuyển theo: `test/core/di/`, `test/core/network/api_error_decoder_test.dart` (tách khỏi test của interceptor).

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 215/215, cùng số test như trước.
- Không đổi hành vi: chỉ chuyển chỗ, đổi tên và gom phần trùng.

## Ghi chú

- Không tạo `pagination/`, `patch/`, `services/`, `auth/`, `mapping_validator`, `legacy_auth_cleanup`, `package_composition`: app chưa có code nào để đặt vào.
- Không chạy `dart format` trên toàn bộ: repo không theo kiểu format mặc định hiện tại, chạy sẽ đổi hơn 1.300 dòng không liên quan.
- Các file vẫn import theo từng file, chưa chuyển sang `core.dart`.
- Chưa chạy app trên máy/giả lập.
