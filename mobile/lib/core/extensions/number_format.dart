import 'package:intl/intl.dart';

/// Định dạng tiền VN: 350000 → '350.000đ'.
String formatVnd(double amount) =>
    '${NumberFormat.decimalPattern('vi_VN').format(amount)}đ';

/// Định dạng số lượng: 2.0 → '2', 2.5 → '2,5' (chuẩn locale vi_VN).
String formatQuantity(double quantity) =>
    NumberFormat.decimalPattern('vi_VN').format(quantity);
