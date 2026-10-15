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
  static const navOrders = 'Đơn hàng';

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
  static const stockUnsure =
      'Mất kết nối khi đang lưu. Xem lại tồn kho trước khi nhập lại, kẻo ghi trùng.';

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
  static const paymentUnsure =
      'Mất kết nối khi đang lưu. Xem lại sổ nợ bên dưới trước khi thu lại, kẻo ghi trùng.';

  // ---- Màn "Nhật ký" (Quản lý) ----
  static const auditLogTitle = 'Nhật ký';
  static const auditLogSubtitle = 'Ai đã làm gì với đơn hàng và công nợ';
  static const auditFilterAll = 'Tất cả';
  static const auditFilterOrder = 'Đơn hàng';
  static const auditFilterDebt = 'Công nợ';
  static const auditLogEmpty = 'Chưa có dòng nhật ký nào';

  // ---- Màn "Đơn hàng" (Quản lý, Nhân viên) ----
  static const ordersSubtitle = 'Xem, gán tài xế, đổi trạng thái';
  static const ordersSearchHint = 'Tìm mã đơn, tên hoặc mã khách';
  static const ordersTabAll = 'Tất cả';
  static const ordersEmpty = 'Không có đơn nào';

  /// Tên trạng thái đơn theo mã của server.
  static String orderStatusLabel(String status) => switch (status) {
        'PENDING' => 'Chờ giao',
        'SHIPPING' => 'Đang giao',
        'DELIVERED' => 'Đã giao',
        'COMPLETED' => 'Hoàn thành',
        'CANCELLED' => 'Đã hủy',
        _ => status,
      };
  static const orderUnassigned = 'Chưa gán tài xế';
  static String orderDriver(String name) => 'Tài xế: $name';
  static const orderNotesLabel = 'Ghi chú';
  static const orderAssignButton = 'Gán tài xế';
  static const orderReassignButton = 'Đổi tài xế';
  static const orderAssignTitle = 'Chọn tài xế';
  static const orderNoDrivers = 'Chưa có tài xế nào đang hoạt động';
  static const orderDriversFailed = 'Không tải được danh sách tài xế. Thử lại sau.';
  static String orderAssigned(String driver) => 'Đã giao đơn cho $driver';
  static const orderAssignSkipped =
      'Đơn không còn ở trạng thái gán được. Danh sách đã được tải lại.';
  static const orderSendOutButton = 'Cho đi giao';
  static const orderMarkDeliveredButton = 'Đánh dấu đã giao';
  static const orderBackToPendingButton = 'Về chờ giao';
  static const orderCancelButton = 'Hủy đơn';
  static const orderCancelTitle = 'Lý do hủy đơn';
  static const orderCancelHint = 'VD: Khách dời ngày, xe sự cố';
  static const orderCancelReasonRequired = 'Nhập lý do hủy đơn';
  static const orderCancelConfirm = 'Xác nhận hủy';
  static String orderStatusChanged(String code, String status) =>
      'Đơn $code: $status';
  static const orderSettleHint =
      'Đơn đã giao chờ Quản lý đối soát để ghi nợ và trừ kho.';

  // ---- Khách hàng (Quản lý, Nhân viên) ----
  static const navCustomers = 'Khách hàng';
  static const customersSubtitle = 'Danh bạ, liên hệ và bảng giá';
  static const customersSearchHint = 'Tìm tên, mã hoặc số điện thoại';
  static const customersEmpty = 'Chưa có khách hàng nào';
  static const customersNoMatch = 'Không tìm thấy khách hàng nào';
  static const customerAddButton = 'Thêm';
  static const customerAddTitle = 'Thêm khách hàng';
  static const customerCodeLabel = 'Mã khách (VD: KH-012)';
  static const customerNameLabel = 'Tên khách hàng';
  static const customerPhoneLabel = 'Số điện thoại';
  static const customerAddressLabel = 'Địa chỉ';
  static const customerCodeNameRequired = 'Nhập mã và tên khách hàng';
  static const customerSaveButton = 'Lưu';
  static String customerCreated(String name) => 'Đã thêm khách $name';
  static const customerNoPhone = 'Chưa có số điện thoại';
  static const customerNoAddress = 'Chưa có địa chỉ';
  static const customerLedgerButton = 'Sổ nợ và thu tiền';
  static const customerLedgerFailed = 'Không tải được công nợ của khách. Thử lại sau.';
  static const customerPricesTitle = 'Bảng giá áp cho khách này';
  static const customerPricesEmpty = 'Chưa có sản phẩm nào đang bán';
  static const customerPriceMissing = 'Chưa có giá';
  static const customerPriceCustomBadge = 'Giá riêng';
  static String customerPriceDefault(String price) => 'Mặc định $price';
  static String customerPriceTitle(String label) => 'Giá riêng: $label';
  static const customerPriceLabel = 'Giá cho khách này';
  static const customerPriceHelper =
      'Áp cho đơn lên từ bây giờ. Đơn đã lên giữ giá cũ.';
  static const customerPriceInvalid = 'Giá phải lớn hơn 0';
  static const customerPriceUseDefault = 'Dùng giá mặc định';
  static String customerPriceSet(String label, String price) =>
      '$label: giá riêng $price';
  static String customerPriceRemoved(String label) =>
      '$label: trở về giá mặc định';

  // ---- Nhân sự (Quản lý) ----
  static const staffTitle = 'Nhân sự';
  static const staffSubtitle = 'Tài khoản, vai trò, mật khẩu';
  static const staffEmpty = 'Chưa có tài khoản nào';
  static const staffAddButton = 'Thêm';
  static const staffAddTitle = 'Tạo tài khoản';
  static const staffNameLabel = 'Họ tên';
  static const staffEmailLabel = 'Email đăng nhập';
  static const staffTempPasswordLabel = 'Mật khẩu tạm';
  static const staffTempPasswordHelper =
      'Ít nhất 8 ký tự, gồm cả chữ và số. Người nhận phải đổi khi đăng nhập.';
  static const staffNameEmailRequired = 'Nhập họ tên và email';
  static const staffNameRequired = 'Nhập họ tên';
  static const staffLockedBadge = 'Đã khóa';
  static String staffRoleLabel(String role) => switch (role) {
        'admin' => 'Quản lý',
        'staff' => roleStaff,
        'driver' => roleDriver,
        _ => role,
      };
  static const staffEditButton = 'Sửa tên, số điện thoại';
  static String staffRoleButton(String role) => 'Chuyển thành $role';
  static String staffRoleTitle(String role) => 'Chuyển thành $role?';
  static String staffRoleToDriverBody(String name) =>
      '$name sẽ thấy màn giao hàng của Tài xế thay cho màn của Nhân viên.';
  static String staffRoleFromDriverBody(String name) =>
      '$name sẽ không còn giao hàng. Các đơn Chờ giao / Đang giao của họ trở về chưa gán tài xế.';
  static const staffRoleConfirm = 'Chuyển';
  static const staffResetButton = 'Đặt lại mật khẩu';
  static String staffResetTitle(String name) => 'Mật khẩu mới cho $name';
  static const staffLockButton = 'Khóa tài khoản';
  static const staffUnlockButton = 'Mở khóa tài khoản';
  static String staffLockTitle(String name) => 'Khóa tài khoản $name?';
  static const staffLockBody = 'Người này sẽ không đăng nhập được cho tới khi mở khóa.';
  static const staffLockDriverBody =
      'Người này sẽ không đăng nhập được. Các đơn Chờ giao / Đang giao của họ trở về chưa gán tài xế.';
  static String staffCreated(String name) =>
      'Đã tạo tài khoản $name. Mật khẩu tạm phải đổi ở lần đăng nhập đầu.';
  static String staffSaved(String name) => 'Đã lưu thông tin $name';
  static String staffRoleChanged(String name, String role) => '$name giờ là $role.';
  static String staffLocked(String name) => 'Đã khóa $name.';
  static String staffUnlocked(String name) => 'Đã mở khóa $name.';
  static String staffPasswordReset(String name) =>
      'Đã đặt lại mật khẩu của $name. Họ phải đổi ở lần đăng nhập kế.';
  static String staffOrdersUnassigned(int count) =>
      '$count đơn của họ trở về chưa gán tài xế.';

  // ---- Sản phẩm & giá (Quản lý) ----
  static const productsTitle = 'Sản phẩm & giá';
  static const productsSubtitle = 'Giá mặc định, đơn vị, ngừng bán';
  static const productsEmpty = 'Chưa có sản phẩm nào';
  static const productsDiscontinued = 'Đã ngừng bán';
  static const productAddButton = 'Thêm';
  static const productAddTitle = 'Thêm sản phẩm';
  static const productNameLabel = 'Tên sản phẩm (VD: Đá Bi)';
  static const productSizeLabel = 'Cỡ bao';
  static const productUnitLabel = 'Đơn vị';
  static const productDefaultUnit = 'Bao';
  static const productPriceLabel = 'Giá mặc định';
  static const productPriceHelper =
      'Áp cho đơn lên từ bây giờ, trừ khách có giá riêng. Đơn đã lên giữ giá cũ.';
  static const productAlertLabel = 'Cảnh báo khi tồn còn';
  static const productAlertHelper = 'Để trống nếu không cần cảnh báo tồn kho thấp.';
  static String productAlertAt(int level) => 'Cảnh báo khi còn $level';
  static const productAlertOff = 'Không cảnh báo tồn kho';
  static const productNoPriceHint = 'Chưa có giá — chưa lên đơn được';
  static const productNameRequired = 'Nhập tên sản phẩm';
  static const productNameUnitRequired = 'Nhập tên và đơn vị';
  static const productSizeInvalid = 'Cỡ bao phải từ 1 đến 1000 kg';
  static const productPriceInvalid = 'Giá phải lớn hơn 0';
  static const productPriceButton = 'Đổi giá';
  static String productPriceTitle(String label) => 'Giá của $label';
  static const productEditButton = 'Sửa tên, đơn vị, cảnh báo';
  static const productStopButton = 'Ngừng bán';
  static const productResumeButton = 'Bán lại';
  static String productStopTitle(String label) => 'Ngừng bán $label?';
  static const productStopBody =
      'Sản phẩm sẽ không còn trên form lên đơn. Đơn đã lên vẫn giữ nguyên, và có thể bán lại bất cứ lúc nào.';
  static String productCreated(String label) => 'Đã thêm $label';
  static String productPriceSet(String label, String price) =>
      '$label giờ giá $price';
  static String productSaved(String label) => 'Đã lưu $label';
  static String productStopped(String label) => 'Đã ngừng bán $label';
  static String productResumed(String label) => 'Đã bán lại $label';

  // ---- Bảng công (Quản lý) ----
  static const shiftReportTitle = 'Bảng công';
  static const shiftReportSubtitle = 'Ca đã duyệt, giờ công, chốt tháng';
  static String shiftReportMonth(int month, int year) => 'Tháng $month/$year';
  static const shiftReportPreviousMonth = 'Tháng trước';
  static const shiftReportNextMonth = 'Tháng sau';
  static const shiftReportEmpty = 'Chưa ai có ca trong tháng này';
  static String shiftReportTotals(int shifts, int hours) =>
      '$shifts ca đã duyệt · $hours giờ công';
  static String shiftReportPersonTotals(int shifts, int hours, int days) =>
      '$shifts ca · $hours giờ · $days ngày';
  static String shiftReportPersonPending(int count) => '$count ca chờ duyệt';
  static String shiftReportPersonRejected(int count) => '$count ca bị từ chối';
  static const shiftReportNoApproved = 'Chưa có ca nào được duyệt';
  static const shiftReportOpenHint = 'Tháng còn mở: ca vẫn đăng ký và duyệt được.';
  static String shiftReportPendingHint(int count) =>
      'Còn $count ca chờ duyệt: duyệt hết rồi mới chốt công được.';
  static String shiftReportLockedAt(String date) => 'Đã chốt công ngày $date.';
  static const shiftReportLockButton = 'Chốt công tháng';
  static const shiftReportReopenButton = 'Mở lại tháng';
  static String shiftReportLockTitle(String month) => 'Chốt công $month?';
  static const shiftReportLockBody =
      'Sau khi chốt, không ai đăng ký, rút hay duyệt ca của tháng này được nữa, cho tới khi mở lại.';
  static String shiftReportReopenTitle(String month) => 'Mở lại $month?';
  static const shiftReportReopenBody =
      'Ca của tháng này lại đăng ký và duyệt được; số công có thể thay đổi.';
  static String shiftReportLocked(String month) => 'Đã chốt công $month';
  static String shiftReportReopened(String month) => 'Đã mở lại $month';

  // ---- Vỏ bao (Quản lý) ----
  static const shellsTitle = 'Vỏ bao';
  static const shellsSubtitle = 'Vỏ khách đang giữ và tiền cọc';
  static const shellsEmpty = 'Chưa có khách nào phát sinh vỏ bao';
  static String shellsTotalHeld(int count) => 'Khách đang giữ $count vỏ';
  static String shellsTotalDeposit(String amount) => 'Tiền cọc: $amount';
  static String shellsOutIn(int out, int back) => 'Đã giao $out · đã thu $back';
  static String shellsHeld(int count) => '$count vỏ';
  static String shellsHeldNow(int count) => 'Đang giữ $count vỏ.';
  static const shellsModeAdd = 'Ghi thêm';
  static const shellsModeSet = 'Sửa tổng';
  static const shellsOutLabel = 'Giao thêm cho khách';
  static const shellsInLabel = 'Thu về từ khách';
  static const shellsOutTotalLabel = 'Tổng đã giao';
  static const shellsInTotalLabel = 'Tổng đã thu';
  static const shellsNothingEntered = 'Nhập số vỏ giao thêm hoặc thu về';
  static const shellsInExceedsOut = 'Tổng đã thu không thể lớn hơn tổng đã giao';
  static String shellsReturnTooMany(int held) =>
      'Khách chỉ đang giữ $held vỏ, không thu về nhiều hơn được';
  static String shellsRecorded(String name, int out, int back) {
    final parts = [
      if (out > 0) 'giao thêm $out vỏ',
      if (back > 0) 'thu về $back vỏ',
    ];
    return '$name: ${parts.join(', ')}';
  }

  static String shellsCorrected(String name) => 'Đã sửa số vỏ của $name';
  static const shellsUnsure =
      'Mất kết nối khi đang lưu. Xem lại số vỏ trước khi ghi lại, kẻo ghi trùng.';

  // ---- Bộ lọc danh sách đơn ----
  static const orderFilterAnyDate = 'Mọi ngày';
  static const orderFilterAnyDriver = 'Mọi tài xế';
  static const orderFilterUnassigned = 'Chưa gán tài xế';
  static const orderFilterDriverTitle = 'Lọc theo tài xế';
  static const orderFilterClear = 'Bỏ lọc';

  // ---- Lên đơn (Quản lý, Nhân viên) ----
  static const orderEntryNoLines = 'Nhập số lượng cho ít nhất một sản phẩm';
  static const orderEntryTitle = 'Lên đơn';
  static const orderEntryButton = 'Lên đơn';
  static const orderEntryPickCustomer = 'Chọn khách hàng';
  static const orderEntryCustomerHint = 'Tìm tên, mã hoặc số điện thoại';
  static const orderEntryNoCustomers = 'Không tìm thấy khách hàng nào';
  static const orderEntryChangeCustomer = 'Đổi khách';
  static const orderEntryNoProducts = 'Chưa có sản phẩm nào đang bán';
  static String orderEntryPrice(String price, String unit) => '$price/$unit';
  static String orderEntrySellable(int left) => 'Còn $left';
  static const orderEntryNoPrice = 'Chưa có giá — báo Quản lý cài giá';
  static const orderEntryNotesHint = 'Ghi chú cho tài xế (không bắt buộc)';
  static String orderEntryTotal(int lines) => 'Tạm tính ($lines dòng)';
  static const orderEntrySave = 'Lưu đơn';
  static const orderEntryLeaveTitle = 'Bỏ đơn đang nhập?';
  static const orderEntryLeaveBody = 'Số lượng đã nhập sẽ mất.';
  static const orderEntryStay = 'Ở lại';
  static const orderEntryLeave = 'Bỏ đơn';
  static const orderEntryUnsure =
      'Mất kết nối khi đang lưu. Xem lại danh sách đơn trước khi lưu lại, kẻo trùng đơn.';
  static String orderEntrySaved(String code, String total) =>
      'Đã lên đơn $code · $total';

  // ---- Đối soát (Quản lý) ----
  static const settleTitle = 'Đối soát';
  static const settleSubtitle = 'Chốt số thực giao, ghi nợ và trừ kho';
  static String settlePendingCount(int count) =>
      '$count đơn đã giao chờ đối soát';
  static const settleEmpty = 'Không có đơn nào cần đối soát';
  static const settleActualLabel = 'Số lượng thực giao';
  static String settleOrdered(int quantity, String unitPrice) =>
      'Đặt $quantity · $unitPrice';
  static const settleDebtLabel = 'Ghi nợ cho khách';
  static const settleNote =
      'Chốt xong không sửa lại được: nợ của khách và tồn kho đổi theo số này.';
  static const settleConfirmButton = 'Xác nhận chốt';
  static const settleDecreaseTooltip = 'Giảm';
  static const settleIncreaseTooltip = 'Tăng';
  static String settleDone(String code) => 'Đã chốt đơn $code';

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
