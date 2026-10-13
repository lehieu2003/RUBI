// DTOs cho quản lý tài khoản: `GET/POST /api/staff`, `PATCH /api/staff/{id}`
// (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`staff_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'staff_dtos.g.dart';

/// Một tài khoản trong `data.users` / `data.user`.
@JsonSerializable(createToJson: false)
class StaffAccountDto {
  const StaffAccountDto({
    this.id,
    this.name,
    this.email,
    this.phone,
    this.role,
    this.isActive,
  });

  factory StaffAccountDto.fromJson(Map<String, dynamic> json) =>
      _$StaffAccountDtoFromJson(json);

  final String? id;
  final String? name;
  final String? email;

  /// `null` hợp lệ: chưa có số điện thoại.
  final String? phone;
  final String? role;
  final bool? isActive;
}
