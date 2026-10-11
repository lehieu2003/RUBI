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

  /// Đăng xuất. Bỏ qua mọi kết quả server; token local bị xoá. Lỗi
  /// secure-storage cục bộ (hiếm) là trường hợp duy nhất trả `Err`.
  Future<Result<void>> logout();

  /// Đổi mật khẩu của chính người đang đăng nhập.
  ///
  /// Thành công: token mới server cấp đã thay token cũ trong [AuthStorage].
  /// Mật khẩu hiện tại sai / mật khẩu mới không đạt yêu cầu → `Err` với
  /// message tiếng Việt từ server (400).
  Future<Result<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}
