import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/data/dto/staff_dtos.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';

/// DTO → entity cho tài khoản. Thiếu field bắt buộc hoặc vai trò lạ → `Err`:
/// không đoán vai trò hay trạng thái khóa của một tài khoản.
abstract final class StaffMapper {
  static Result<StaffAccount> fromDto(StaffAccountDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Account', 'id'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Account', 'name'));
    final email = MappingValidator.nonEmpty(dto.email);
    if (email == null) return Err(MappingValidator.missing('Account', 'email'));
    final role = UserRole.fromName(dto.role);
    if (role == null) {
      return Err(UnexpectedFailure('Account payload has unknown role `${dto.role}`'));
    }
    final isActive = dto.isActive;
    if (isActive == null) {
      return Err(MappingValidator.missing('Account', 'isActive'));
    }
    return Ok(
      StaffAccount(
        id: id,
        name: name,
        email: email,
        role: role,
        isActive: isActive,
        phone: MappingValidator.nonEmpty(dto.phone),
      ),
    );
  }
}
