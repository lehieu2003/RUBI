/// Đường dẫn của các màn hình. Dùng hằng số này thay cho chuỗi viết tay.
abstract final class RouteNames {
  static const login = '/login';

  /// Shell sau đăng nhập, tab theo vai trò.
  static const home = '/home';

  /// Đổi mật khẩu: bắt buộc sau khi Quản lý cấp / đặt lại mật khẩu, hoặc mở
  /// từ tab Cài đặt.
  static const changePassword = '/change-password';
}
