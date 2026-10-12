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

  // ---- Màn đổi mật khẩu ----
  static const changePasswordTitle = 'Đổi mật khẩu';
  static const changePasswordForcedNotice =
      'Mật khẩu của bạn do Quản lý cấp. Hãy đặt mật khẩu riêng trước khi '
      'dùng app.';
  static const currentPasswordLabel = 'Mật khẩu hiện tại';
  static const newPasswordLabel = 'Mật khẩu mới';
  static const confirmPasswordLabel = 'Nhập lại mật khẩu mới';
  static const currentPasswordRequired = 'Vui lòng nhập mật khẩu hiện tại';
  static const newPasswordSameAsCurrent =
      'Mật khẩu mới phải khác mật khẩu hiện tại';
  static const confirmPasswordMismatch = 'Hai lần nhập mật khẩu mới không khớp';
  static const changePasswordButton = 'Đổi mật khẩu';
  static const passwordChangedSnack = 'Đã đổi mật khẩu ✅';

  // ---- Driver: lịch sử giao hàng ----
  static const historyRangeLimit = 'Chỉ xem được trong 30 ngày gần nhất';
  static const historyFutureDate = 'Không thể xem ngày trong tương lai';

  // ---- Driver: bottom navigation (HomeShell) ----
  static const navToday = 'Hôm nay';
  static const navHistory = 'Lịch sử';
  static const navSettings = 'Cài đặt';

  // ---- Driver: tab "Đơn hôm nay" ----
  static const todayTitle = 'Đơn hôm nay';
  static const todayEmpty = 'Hôm nay chưa có đơn giao 🎉';
  static const retryButton = 'Thử lại';

  // ---- Driver: thẻ đơn giao (DeliveryCard) ----
  static const badgeShipping = 'Đang giao';
  static const badgeDelivered = 'Đã giao';
  static const callButton = 'Gọi';
  static const directionsButton = 'Chỉ đường';

  /// Nút chính xác nhận đã giao — dấu ✓ vẽ bằng [Icons.check] trên nút.
  static const confirmDeliveredButton = 'ĐÃ GIAO';
  static const totalLabel = 'Tổng';

  /// Phần items dư thừa, ví dụ "+2 sản phẩm khác".
  static String productsOther(int count) => '+$count sản phẩm khác';

  // ---- Driver: sheet xác nhận đã giao (ConfirmSheet) ----
  static const confirmSheetTitle = 'Xác nhận đã giao';
  static String confirmSheetBody(String customerName) =>
      'Xác nhận đã giao cho $customerName?';
  static const cancelButton = 'Hủy';
  static const confirmAction = 'Xác nhận';
  static const confirmedSnack = 'Đã xác nhận giao ✅';

  /// Phòng hờ: confirm thất bại nhưng cubit không bắn message.
  static const confirmGenericError = 'Không xác nhận được. Vui lòng thử lại.';

  // ---- Driver: tab lịch sử (HistoryTab) ----
  static const historyNoOrders = 'Không có đơn trong ngày này';

  // ---- Driver: tab cài đặt ----
  static const logoutButton = 'Đăng xuất';
  static const logoutDialogTitle = 'Đăng xuất?';
  static const logoutDialogBody = 'Bạn chắc chắn muốn đăng xuất?';
  static const versionLabel = 'Phiên bản';

  /// Bump theo `version` trong pubspec.yaml khi release.
  static const appVersion = '1.0.0';

  // ---- Driver: lỗi mở app ngoài (Gọi / Chỉ đường) ----
  static const launchFailed = 'Không mở được ứng dụng';
}
