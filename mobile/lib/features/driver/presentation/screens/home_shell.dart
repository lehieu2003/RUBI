import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/history_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/settings_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/today_tab.dart';

/// Shell chính sau đăng nhập: bottom-nav 3 tab
/// (Hôm nay / Lịch sử / Cài đặt).
///
/// Tab rời đi bị unmount — quay lại tab "Hôm nay" tạo cubit mới (factory
/// trong DI) và tự tải lại đơn. BlocProvider của [AuthCubit] được cấp bởi
/// router (xem `RouteNames.home` trong app_router.dart) cho [SettingsTab] dùng.
class HomeShell extends HookWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    final currentIndex = useState(0);

    return Scaffold(
      body: switch (currentIndex.value) {
        0 => const TodayTab(),
        1 => const HistoryTab(),
        _ => const SettingsTab(),
      },
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex.value,
        onDestinationSelected: (index) => currentIndex.value = index,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: AppStrings.navToday,
          ),
          NavigationDestination(
            icon: Icon(Icons.history),
            label: AppStrings.navHistory,
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: AppStrings.navSettings,
          ),
        ],
      ),
    );
  }
}
