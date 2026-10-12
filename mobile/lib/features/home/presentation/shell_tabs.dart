import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/history_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/settings_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/today_tab.dart';
import 'package:iceflow_mobile/features/schedule/presentation/screens/schedule_tab.dart';
import 'package:iceflow_mobile/features/schedule/presentation/screens/shift_review_tab.dart';

/// Một tab của shell sau đăng nhập.
class ShellTab {
  const ShellTab({
    required this.label,
    required this.icon,
    required this.builder,
    this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData? selectedIcon;
  final WidgetBuilder builder;
}

const _today = ShellTab(
  label: AppStrings.navToday,
  icon: Icons.local_shipping_outlined,
  selectedIcon: Icons.local_shipping,
  builder: _buildToday,
);
const _history = ShellTab(
  label: AppStrings.navHistory,
  icon: Icons.history,
  builder: _buildHistory,
);
const _schedule = ShellTab(
  label: AppStrings.navSchedule,
  icon: Icons.event_available_outlined,
  selectedIcon: Icons.event_available,
  builder: _buildSchedule,
);
const _shiftReview = ShellTab(
  label: AppStrings.navShiftReview,
  icon: Icons.fact_check_outlined,
  selectedIcon: Icons.fact_check,
  builder: _buildShiftReview,
);
const _settings = ShellTab(
  label: AppStrings.navSettings,
  icon: Icons.settings_outlined,
  selectedIcon: Icons.settings,
  builder: _buildSettings,
);

Widget _buildToday(BuildContext context) => const TodayTab();
Widget _buildHistory(BuildContext context) => const HistoryTab();
Widget _buildSchedule(BuildContext context) => const ScheduleTab();
Widget _buildShiftReview(BuildContext context) => const ShiftReviewTab();
Widget _buildSettings(BuildContext context) => const SettingsTab();

/// Các tab mỗi vai trò thấy, theo thứ tự trên thanh dưới. Chỉ gồm màn hình
/// mà server cho vai trò đó dùng: thêm màn hình mới thì thêm vào đây.
///
/// - Tài xế: giao hàng (hôm nay, lịch sử) và đăng ký ca.
/// - Nhân viên: đăng ký ca.
/// - Quản lý: duyệt ca. Không tự đăng ký ca (server từ chối).
List<ShellTab> shellTabsFor(UserRole role) {
  return switch (role) {
    UserRole.driver => const [_today, _history, _schedule, _settings],
    UserRole.staff => const [_schedule, _settings],
    UserRole.admin => const [_shiftReview, _settings],
  };
}
