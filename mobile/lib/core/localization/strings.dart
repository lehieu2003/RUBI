/// Bản copy UI tập trung cho toàn app (tiếng Việt).
///
/// Key đặt theo màn (`login*` cho màn đăng nhập); task sau thêm key riêng
/// của mình vào đây thay vì viết chuỗi trực tiếp trong widget.
abstract final class AppStrings {
  // ---- Màn đăng nhập ----
  static const loginTitle = 'IceFlow';
  static const emailLabel = 'Email';
  static const passwordLabel = 'Mật khẩu';
  static const loginButton = 'Đăng nhập';
  static const emailInvalid = 'Email không hợp lệ';
  static const passwordTooShort = 'Mật khẩu tối thiểu 6 ký tự';
}
