// DTOs cho các response của `/api/auth/*` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`auth_dtos.g.dart`; sửa file này xong
// chạy `dart run build_runner build`). Mọi field nullable, không validate:
// field SAI KIỂU ném TypeError ngay tại đây (cố tình để rẻ), và repository
// biến mọi exception — kể cả TypeError và lỗi secure-storage — thành
// `Err(UnexpectedFailure)` nên callers chỉ bao giờ thấy `Result`, không có
// exception nào xuyên lớp.
import 'package:json_annotation/json_annotation.dart';

part 'auth_dtos.g.dart';

/// Object `user` trong login/me response.
@JsonSerializable(createToJson: false)
class UserDto {
  const UserDto({
    this.id,
    this.email,
    this.name,
    this.role,
    this.factoryId,
    this.mustChangePassword,
  });

  factory UserDto.fromJson(Map<String, dynamic> json) =>
      _$UserDtoFromJson(json);

  final String? id;
  final String? email;
  final String? name;

  /// Giá trị server gửi: `ADMIN | STAFF | DRIVER`.
  final String? role;
  final String? factoryId;
  final bool? mustChangePassword;
}

/// `data` của `POST /api/auth/login`.
@JsonSerializable(createToJson: false)
class LoginDataDto {
  const LoginDataDto({this.user, this.token});

  factory LoginDataDto.fromJson(Map<String, dynamic> json) =>
      _$LoginDataDtoFromJson(json);

  final UserDto? user;

  /// JWT bearer token (bắt buộc trong contract 200, kiểm tra ở repository).
  final String? token;
}

/// `data` của `GET /api/auth/me` — mapper chỉ đọc `user`, bỏ qua field khác.
@JsonSerializable(createToJson: false)
class MeDataDto {
  const MeDataDto({this.user});

  factory MeDataDto.fromJson(Map<String, dynamic> json) =>
      _$MeDataDtoFromJson(json);

  final UserDto? user;
}

/// `data` của `POST /api/auth/password`.
@JsonSerializable(createToJson: false)
class ChangePasswordDataDto {
  const ChangePasswordDataDto({this.token});

  factory ChangePasswordDataDto.fromJson(Map<String, dynamic> json) =>
      _$ChangePasswordDataDtoFromJson(json);

  /// JWT mới (đã bỏ cờ `mustChangePassword`), thay cho token đang lưu.
  final String? token;
}
