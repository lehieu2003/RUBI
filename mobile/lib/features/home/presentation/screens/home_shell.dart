import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/home/presentation/shell_tabs.dart';

/// Shell chính sau đăng nhập: thanh dưới với các tab của vai trò đang đăng
/// nhập (xem [shellTabsFor]).
///
/// Tab rời đi bị unmount — quay lại là màn hình tạo cubit mới (factory trong
/// DI) và tự tải lại. BlocProvider của [AuthCubit] được cấp bởi router (xem
/// `RouteNames.home` trong app_router.dart).
class HomeShell extends HookWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    final currentIndex = useState(0);
    final authState = context.watch<AuthCubit>().state;
    // Đang đăng xuất: router sắp đưa về màn đăng nhập.
    if (authState is! Authenticated) return const SizedBox.shrink();

    final tabs = shellTabsFor(authState.user.role);
    final index = currentIndex.value < tabs.length ? currentIndex.value : 0;

    return Scaffold(
      body: tabs[index].builder(context),
      // Thanh dưới cần ít nhất hai tab; một tab thì hiện thẳng màn đó.
      bottomNavigationBar: tabs.length < 2
          ? null
          : NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (selected) => currentIndex.value = selected,
              destinations: [
                for (final tab in tabs)
                  NavigationDestination(
                    icon: Icon(tab.icon),
                    selectedIcon:
                        tab.selectedIcon == null ? null : Icon(tab.selectedIcon),
                    label: tab.label,
                  ),
              ],
            ),
    );
  }
}
