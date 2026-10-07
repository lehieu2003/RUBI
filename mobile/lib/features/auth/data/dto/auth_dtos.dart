// DTOs cho các response của `/api/auth/*` (envelope `{ success, data|error }`).
//
// Chỉ parse dạng nullable, không validate — validation nằm ở `UserMapper`
// và repository, nên payload dị dạng luôn thành `Err(UnexpectedFailure)`,
// không bao giờ ném exception xuyên lớp.

/// Object `user` trong login/me response.
class UserDto {
  const UserDto({this.id, this.email, this.name, this.role, this.factoryId});

  factory UserDto.fromJson(Map<String, dynamic> json) => UserDto(
        id: json['id'] as String?,
        email: json['email'] as String?,
        name: json['name'] as String?,
        role: json['role'] as String?,
        factoryId: json['factoryId'] as String?,
      );

  final String? id;
  final String? email;
  final String? name;

  /// Giá trị server gửi: `ADMIN | ACCOUNTANT | STAFF | DRIVER | SUPER_ADMIN`.
  final String? role;
  final String? factoryId;
}

/// `data` của `POST /api/auth/login`.
class LoginDataDto {
  const LoginDataDto({this.user, this.token});

  factory LoginDataDto.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    return LoginDataDto(
      user: userJson is Map<String, dynamic> ? UserDto.fromJson(userJson) : null,
      token: json['token'] as String?,
    );
  }

  final UserDto? user;

  /// JWT bearer token (bắt buộc trong contract 200, kiểm tra ở repository).
  final String? token;
}

/// `data` của `GET /api/auth/me` — mapper chỉ đọc `user`, bỏ qua field khác.
class MeDataDto {
  const MeDataDto({this.user});

  factory MeDataDto.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'];
    return MeDataDto(
      user: userJson is Map<String, dynamic> ? UserDto.fromJson(userJson) : null,
    );
  }

  final UserDto? user;
}
