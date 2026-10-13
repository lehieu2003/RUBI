import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/audit/presentation/screens/audit_log_screen.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/debt/presentation/screens/debt_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/history_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/settings_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/today_tab.dart';
import 'package:iceflow_mobile/features/inventory/presentation/screens/inventory_tab.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/orders_tab.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/settlement_screen.dart';
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
const _inventory = ShellTab(
  label: AppStrings.navInventory,
  icon: Icons.ac_unit_outlined,
  selectedIcon: Icons.ac_unit,
  builder: _buildInventory,
);
const _debt = ShellTab(
  label: AppStrings.navDebt,
  icon: Icons.account_balance_wallet_outlined,
  selectedIcon: Icons.account_balance_wallet,
  builder: _buildDebt,
);
const _more = ShellTab(
  label: AppStrings.navMore,
  icon: Icons.more_horiz,
  builder: _buildMore,
);
const _orders = ShellTab(
  label: AppStrings.navOrders,
  icon: Icons.receipt_long_outlined,
  selectedIcon: Icons.receipt_long,
  builder: _buildOrders,
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
Widget _buildInventory(BuildContext context) => const InventoryTab();
Widget _buildDebt(BuildContext context) => const DebtTab();
Widget _buildOrders(BuildContext context) => const OrdersTab();
Widget _buildSettings(BuildContext context) => const SettingsTab();

/// Tab "Thêm" của Quản lý: các màn ít dùng hơn, rồi tới phần cài đặt.
Widget _buildMore(BuildContext context) => SettingsTab(
      title: AppStrings.navMore,
      menu: [
        ListTile(
          key: const Key('more_orders'),
          leading: const Icon(Icons.receipt_long_outlined),
          title: const Text(AppStrings.navOrders),
          subtitle: const Text(AppStrings.ordersSubtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const OrdersTab()),
          ),
        ),
        ListTile(
          key: const Key('more_settle'),
          leading: const Icon(Icons.fact_check_outlined),
          title: const Text(AppStrings.settleTitle),
          subtitle: const Text(AppStrings.settleSubtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SettlementScreen()),
          ),
        ),
        ListTile(
          key: const Key('more_audit_log'),
          leading: const Icon(Icons.history),
          title: const Text(AppStrings.auditLogTitle),
          subtitle: const Text(AppStrings.auditLogSubtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const AuditLogScreen()),
          ),
        ),
      ],
    );

/// Các tab mỗi vai trò thấy, theo thứ tự trên thanh dưới. Chỉ gồm màn hình
/// mà server cho vai trò đó dùng: thêm màn hình mới thì thêm vào đây.
///
/// - Tài xế: giao hàng (hôm nay, lịch sử) và đăng ký ca.
/// - Nhân viên: đơn hàng và đăng ký ca.
/// - Quản lý: duyệt ca, kho lạnh, công nợ, và "Thêm" (đơn hàng, đối soát,
///   nhật ký, cài đặt).
///   Không tự đăng ký ca (server từ chối). Thanh dưới chỉ đủ chỗ cho ba màn
///   dùng hằng ngày: màn mới của Quản lý thêm vào "Thêm".
List<ShellTab> shellTabsFor(UserRole role) {
  return switch (role) {
    UserRole.driver => const [_today, _history, _schedule, _settings],
    UserRole.staff => const [_orders, _schedule, _settings],
    UserRole.admin => const [_shiftReview, _inventory, _debt, _more],
  };
}
