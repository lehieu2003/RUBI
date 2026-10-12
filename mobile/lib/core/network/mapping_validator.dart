import 'package:iceflow_mobile/core/network/api_failure.dart';

/// Kiểm tra field khi chuyển DTO → entity. Mapper trả
/// `Err(MappingValidator.missing(...))` cho payload thiếu/hỏng thay vì ném
/// exception.
abstract final class MappingValidator {
  /// Chuỗi như server gửi, hoặc `null` nếu thiếu hay rỗng. Không trim: tên,
  /// địa chỉ hiển thị đúng như dữ liệu gốc.
  static String? nonEmpty(String? value) =>
      (value == null || value.isEmpty) ? null : value;

  /// Thời điểm ISO 8601, hoặc `null` nếu thiếu hay không parse được.
  static DateTime? dateTime(String? value) =>
      value == null ? null : DateTime.tryParse(value);

  /// Lỗi cho field bắt buộc bị thiếu, VD `missing('Order', 'customer.name')`.
  static UnexpectedFailure missing(String payload, String field) =>
      UnexpectedFailure('$payload payload missing `$field`');
}
