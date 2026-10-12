import 'package:flutter/widgets.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:intl/date_symbol_data_local.dart';

/// Mọi thứ phải xong TRƯỚC khi dựng UI. Gọi đúng một lần từ `main`.
void appStartup() {
  WidgetsFlutterBinding.ensureInitialized();
  // Nạp symbol date cho mọi locale (HistoryTab format thứ bằng
  // DateFormat('vi')). Data có sẵn trong binary — sync xong là dùng được,
  // không cần await.
  initializeDateFormatting();
  configureDependencies();
}
