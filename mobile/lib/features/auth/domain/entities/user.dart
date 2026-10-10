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
  });

  final String id;
  final String email;
  final String name;
  final UserRole role;
  final String? factoryId;

  @override
  List<Object?> get props => [id, email, name, role, factoryId];
}
