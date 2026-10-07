import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

/// Contract cho dữ liệu xác thực (đăng nhập / khôi phục phiên / đăng xuất).
abstract class AuthRepository {
  const AuthRepository();

  /// Đăng nhập bằng email + mật khẩu.
  ///
  /// Thành công: token đã được lưu vào [AuthStorage] trước khi trả [User].
  Future<Result<User>> login({required String email, required String password});

  /// Khôi phục phiên từ token đã lưu.
  ///
  /// Không có token hoặc token hết hạn (401) → `Ok(null)` (im lặng, không
  /// surface error); lỗi khác → `Err`.
  Future<Result<User?>> restoreSession();

  /// Đăng xuất. Luôn xoá token local bất kể kết quả của server.
  Future<Result<void>> logout();
}
