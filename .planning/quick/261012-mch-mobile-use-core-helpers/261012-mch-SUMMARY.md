---
status: complete
---

# Quick Task 261012-mch Summary: dùng `MappingValidator` và `AppLogger`

**Date:** 2026-10-12 · **Branch:** `refactor/mobile-use-core-helpers` · **Status:** complete ✓

## Shipped

1. **Mapper**: `UserMapper`, `OrderMapper`, `ScheduleMapper` dùng chung `MappingValidator.nonEmpty` (bỏ ba bản riêng) và `MappingValidator.missing` cho 20 chỗ báo thiếu field. Câu lỗi giữ nguyên từng chữ.
2. **`MappingValidator.nonEmpty` không còn trim**: lúc tạo sẵn nó trim, khác với luật các mapper đang dùng. Chưa nơi nào gọi nên đổi không ảnh hưởng ai, và nhờ đó việc chuyển mapper không đổi hành vi.
3. **Log**: 9 chỗ repository biến lỗi bất ngờ thành `UnexpectedFailure` nay ghi `AppLogger.error` kèm stack trace; 4 chỗ lỗi bị bỏ qua có chủ ý (xoá token hết hạn, nhớ email, xoá token của vai trò bị chặn, làm mới token thất bại) ghi `AppLogger.warning`.

## Verification

- `flutter analyze`: không có vấn đề. `flutter test`: 277/277, không test nào của mapper hay repository phải sửa.

## Ghi chú

- Log đi qua `dart:developer`: thấy trong DevTools / console khi debug, không hiện cho người dùng và không gửi đi đâu.
- Nội dung log là tên thao tác và lỗi Dart (kiểu dữ liệu sai, lỗi bộ nhớ an toàn…), không có token hay mật khẩu.
- Không ghi log cho: đăng xuất khi server không trả lời (bình thường khi mất mạng), mở app gọi điện / chỉ đường thất bại (đã có thông báo trên màn hình).
