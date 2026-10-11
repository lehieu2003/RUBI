import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/data/dto/auth_dtos.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

/// Chuyển [UserDto] → domain [User].
///
/// Trả `Err(UnexpectedFailure)` thay vì ném exception; role lạ/không có
/// KHÔNG BAO GIỜ được suy mặc định (VD: thành DRIVER) — dữ liệu phải thật.
abstract final class UserMapper {
  static Result<User> fromDto(UserDto dto) {
    final id = _nonEmpty(dto.id);
    if (id == null) {
      return const Err(UnexpectedFailure('User payload missing `id`'));
    }
    final email = _nonEmpty(dto.email);
    if (email == null) {
      return const Err(UnexpectedFailure('User payload missing `email`'));
    }
    final name = _nonEmpty(dto.name);
    if (name == null) {
      return const Err(UnexpectedFailure('User payload missing `name`'));
    }

    final role = UserRole.fromName(dto.role);
    if (role == null) {
      return Err(UnexpectedFailure('Unknown role: ${dto.role}'));
    }

    return Ok(
      User(
        id: id,
        email: email,
        name: name,
        role: role,
        factoryId: dto.factoryId,
        // Thiếu cờ → false: nếu server thật sự đòi đổi mật khẩu thì các API
        // khác vẫn trả 403 kèm message, không có gì bị mở khoá nhầm.
        mustChangePassword: dto.mustChangePassword ?? false,
      ),
    );
  }

  static String? _nonEmpty(String? value) =>
      (value == null || value.isEmpty) ? null : value;
}
