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

  // ---- Thanh dưới (HomeShell) ----
  static const navToday = 'Hôm nay';
  static const navHistory = 'Lịch sử';
  static const navSchedule = 'Ca làm';
  static const navShiftReview = 'Duyệt ca';
  static const navInventory = 'Kho lạnh';
  static const navDebt = 'Công nợ';
  static const navSettings = 'Cài đặt';
  static const navMore = 'Thêm';

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

  // ---- Tab "Ca làm" (đăng ký ca) ----
  static const scheduleHint =
      'Ca chỉ được tính khi Quản lý duyệt. Ca đã duyệt muốn đổi thì báo Quản lý.';
  static const shiftApproved = 'Đã duyệt';
  static const shiftPending = 'Chờ duyệt';
  static const shiftRejected = 'Bị từ chối';
  static const shiftRegisterButton = 'Đăng ký';
  static const shiftRegisterAgainButton = 'Đăng ký lại';
  static const shiftWithdrawButton = 'Huỷ';
  static const shiftBlockedPast = 'Đã qua';
  static const shiftBlockedEnded = 'Đã qua giờ';
  static const shiftBlockedLocked = 'Đã chốt công';
  static const shiftBlockedFull = 'Đã đủ người';
  static const shiftNobody = 'Chưa ai đăng ký';
  static const shiftRequested = 'Đã gửi đăng ký, chờ Quản lý duyệt';
  static const shiftWithdrawn = 'Đã huỷ đăng ký ca';
  static const shiftApprovedLocked =
      'Ca đã được duyệt. Liên hệ Quản lý nếu cần thay đổi.';
  static const scheduleToday = 'Hôm nay';
  static const prevWeekTooltip = 'Tuần trước';
  static const nextWeekTooltip = 'Tuần sau';

  /// "Tuần 12/10 – 18/10".
  static String weekLabel(String from, String to) => 'Tuần $from – $to';

  /// "Đã có: An, Bình".
  static String shiftOthers(String names) => 'Đã có: $names';

  // ---- Tab "Duyệt ca" (Quản lý) ----
  static const roleStaff = 'Nhân viên';
  static const roleDriver = 'Tài xế';
  static const approveButton = 'Duyệt';
  static const rejectButton = 'Từ chối';
  static const approveAllButton = 'Duyệt tất cả';
  static const approveAllTitle = 'Duyệt tất cả?';
  static String approveAllBody(int count) =>
      'Duyệt $count yêu cầu đang chờ trong tuần này?';
  static const shiftReviewNonePending = 'Không có yêu cầu chờ duyệt trong tuần';
  static String shiftReviewPendingCount(int count) =>
      '$count yêu cầu chờ duyệt trong tuần';
  static const shiftReviewEmptyDay = 'Không có ca nào trong ngày này';
  static String shiftsApproved(int count) => 'Đã duyệt $count ca';
  static String shiftsRejected(int count) => 'Đã từ chối $count ca';

  // ---- Tab "Kho lạnh" (Quản lý) ----
  static const stockTotalBags = 'Tổng tồn';
  static const stockTotalKg = 'Tổng khối lượng';
  static const stockEmpty = 'Chưa có sản phẩm nào đang bán';
  static const stockLowTitle = 'Sắp hết hàng';
  static const stockLowBadge = 'Sắp hết';

  /// "Đá Viên 5kg: còn bán được 18 Bao (mức cảnh báo 20)".
  static String stockLowLine(String product, String sellable, String unit, String level) =>
      '$product: còn bán được $sellable $unit (mức cảnh báo $level)';
  static String stockOnHand(String quantity, String unit) => 'Tồn: $quantity $unit';
  static String stockSellable(String quantity) => 'Còn bán được: $quantity';
  static const stockNegativeHint =
      'Xuất nhiều hơn số đã nhập. Nhập sản lượng còn thiếu hoặc kiểm kho.';
  static const stockProductionButton = 'Nhập mẻ';
  static const stockCountButton = 'Kiểm kho';
  static const stockProductionTitle = 'Nhập sản lượng mới';
  static const stockCountTitle = 'Kiểm kho';
  static String stockProductionLabel(String unit) => 'Số lượng nhập ($unit)';
  static String stockCountLabel(String unit) => 'Số đếm thực tế ($unit)';
  static const stockNoteLabel = 'Ghi chú (không bắt buộc)';
  static const stockProductionSubmit = 'Xác nhận nhập kho';
  static const stockCountSubmit = 'Lưu số kiểm';
  static const stockProductionInvalid = 'Nhập số lượng lớn hơn 0';
  static const stockCountInvalid = 'Nhập số đếm từ 0 trở lên';
  static String stockProductionSaved(int quantity, String unit, int onHand) =>
      'Đã nhập $quantity $unit. Tồn mới: $onHand';
  static String stockCountSaved(int onHand, String unit) =>
      'Đã lưu kiểm kho. Tồn mới: $onHand $unit';

  // ---- Tab "Công nợ" (Quản lý) ----
  static String debtTotalLabel(int count) => 'Tổng nợ của $count khách';
  static const debtNone = 'Không có khách nào đang nợ';
  static const debtNeverPaid = 'Chưa từng trả';
  static String debtLastPaid(String date) => 'Trả gần nhất: $date';
  static const ledgerOutstandingLabel = 'Còn nợ';
  static const ledgerEmpty = 'Chưa có dòng nào trong sổ nợ';
  static const ledgerDebt = 'Ghi nợ (đơn đã đối soát)';
  static const ledgerPayment = 'Thu tiền';
  static const loadMoreButton = 'Xem thêm';
  static const paymentButton = 'Thu tiền';
  static const paymentTitle = 'Ghi nhận thu tiền';
  static String paymentOutstanding(String amount) => 'Khách còn nợ $amount';
  static const paymentAmountLabel = 'Số tiền thu';
  static const paymentNotesLabel = 'Ghi chú (không bắt buộc)';
  static const paymentSubmit = 'Xác nhận thu';
  static const paymentInvalid = 'Nhập số tiền lớn hơn 0';
  static String paymentAboveDebt(String amount) =>
      'Số tiền thu không được vượt số đang nợ ($amount)';
  static String paymentSaved(String amount, String remaining) =>
      'Đã thu $amount. Còn nợ $remaining';

  // ---- Màn "Nhật ký" (Quản lý) ----
  static const auditLogTitle = 'Nhật ký';
  static const auditLogSubtitle = 'Ai đã làm gì với đơn hàng và công nợ';
  static const auditFilterAll = 'Tất cả';
  static const auditFilterOrder = 'Đơn hàng';
  static const auditFilterDebt = 'Công nợ';
  static const auditLogEmpty = 'Chưa có dòng nhật ký nào';

  // ---- Tab cài đặt: giao diện ----
  static const themeTitle = 'Giao diện';
  static const themeSystem = 'Theo máy';
  static const themeLight = 'Sáng';
  static const themeDark = 'Tối';

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
