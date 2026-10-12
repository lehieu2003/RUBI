import 'package:equatable/equatable.dart';

/// Role của người dùng — khớp giá trị server gửi (`ADMIN`, `DRIVER`,...).
enum UserRole {
  admin,
  staff,
  driver;

  /// Maps the server role string (case-sensitive uppercase) to [UserRole].
  ///
  /// Returns `null` for unknown/absent values — callers must not silently
  /// coerce an unknown role (e.g. to DRIVER).
  static UserRole? fromName(String? name) {
    return switch (name) {
      'ADMIN' => admin,
      'STAFF' => staff,
      'DRIVER' => driver,
      _ => null,
    };
  }
}

/// Người dùng đã đăng nhập.
class User extends Equatable {
  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.factoryId,
    this.mustChangePassword = false,
  });

  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String? factoryId;

  /// `true` khi Quản lý vừa tạo tài khoản / đặt lại mật khẩu: server trả 403
  /// cho mọi API khác tới khi [AuthRepository.changePassword] thành công.
  final bool mustChangePassword;

  User copyWith({bool? mustChangePassword}) => User(
        id: id,
        email: email,
        name: name,
        role: role,
        factoryId: factoryId,
        mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      );

  @override
  List<Object?> get props => [id, email, name, role, factoryId, mustChangePassword];
}
