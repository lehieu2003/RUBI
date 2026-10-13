import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

/// Một tài khoản của nhà máy, như Quản lý thấy trong màn Nhân sự.
class StaffAccount extends Equatable {
  const StaffAccount({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.isActive,
    this.phone,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;

  /// `false`: tài khoản đã bị khóa, không đăng nhập được.
  final bool isActive;
  final String? phone;

  /// Tài khoản Quản lý không sửa được ở đây (server từ chối).
  bool get isManager => role == UserRole.admin;

  @override
  List<Object?> get props => [id, name, email, role, isActive, phone];
}

/// Kết quả một lần sửa tài khoản.
class StaffUpdate extends Equatable {
  const StaffUpdate({required this.account, this.unassignedOrders = 0});

  final StaffAccount account;

  /// Số đơn Chờ giao / Đang giao bị gỡ khỏi tài xế vì người đó vừa bị khóa
  /// hoặc thôi làm tài xế.
  final int unassignedOrders;

  @override
  List<Object?> get props => [account, unassignedOrders];
}
