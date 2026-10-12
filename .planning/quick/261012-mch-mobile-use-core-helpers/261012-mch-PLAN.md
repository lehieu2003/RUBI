# Quick Task 261012-mch: App di động — dùng `MappingValidator` và `AppLogger`

**Date:** 2026-10-12
**Nguồn:** Hai việc dọn dẹp còn lại phía mobile: ba mapper mỗi cái tự giữ một bản `_nonEmpty` và tự viết câu "payload missing"; lỗi bất ngờ và lỗi bị nuốt không để lại dấu vết nào.

## Task 1 — Mapper dùng `MappingValidator`

**Files:** `core/network/mapping_validator.dart`, `features/*/data/mappers/*.dart`
- Bỏ ba bản `_nonEmpty`; 20 chỗ "X payload missing `f`" dùng `MappingValidator.missing`.
- `MappingValidator.nonEmpty` theo đúng luật mapper đang dùng (không trim), để không đổi hành vi.

## Task 2 — Ghi log

**Files:** `features/*/data/*_repository_impl.dart`, `auth_cubit.dart`, `auth_interceptor.dart`
- Lỗi bất ngờ ở repository: `AppLogger.error` kèm stack trace. Lỗi bị bỏ qua có chủ ý: `AppLogger.warning`.

## Verify

`flutter analyze`, `flutter test`: không test nào phải sửa ngoài test của `MappingValidator.nonEmpty`.
