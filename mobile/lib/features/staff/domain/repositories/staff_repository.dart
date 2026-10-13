import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';

/// Contract cho việc quản lý tài khoản (chỉ Quản lý).
abstract class StaffRepository {
  const StaffRepository();

  /// Mọi tài khoản của nhà máy, mới nhất trước.
  Future<Result<List<StaffAccount>>> getAccounts();

  /// Tạo tài khoản Nhân viên hoặc Tài xế với mật khẩu tạm; người đó phải
  /// đổi mật khẩu ở lần đăng nhập đầu.
  ///
  /// Email đã dùng → `Err(ServerFailure)` 409; mật khẩu yếu → 400.
  Future<Result<StaffAccount>> createAccount({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    String? phone,
  });

  /// Sửa một tài khoản; chỉ các trường được truyền mới đổi. [phone] rỗng là
  /// xoá số điện thoại. [password] là đặt lại mật khẩu (bắt đổi ở lần đăng
  /// nhập kế).
  ///
  /// Không sửa được chính mình (400) hay tài khoản Quản lý (403).
  Future<Result<StaffUpdate>> updateAccount(
    String id, {
    String? name,
    String? phone,
    UserRole? role,
    bool? isActive,
    String? password,
  });
}
