import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/router/route_names.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

/// Tab "Cài đặt": thông tin user từ [AuthCubit] (provider cấp shell) +
/// đăng xuất (có dialog xác nhận) + phiên bản app.
///
/// Vai trò có nhiều màn hơn số tab (Quản lý) dùng chính tab này làm tab
/// "Thêm": đặt [title] và đưa các lối vào màn khác qua [menu].
class SettingsTab extends StatelessWidget {
  const SettingsTab({
    super.key,
    this.title = AppStrings.navSettings,
    this.menu = const [],
  });

  final String title;

  /// Các mục hiện ngay dưới thẻ tài khoản, trước phần cài đặt.
  final List<Widget> menu;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final authState = context.watch<AuthCubit>().state;
    final user = authState is Authenticated ? authState.user : null;

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        children: [
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: ListTile(
              leading: CircleAvatar(
                child: Icon(
                  Icons.person_outline,
                  color: colorScheme.onPrimaryContainer,
                ),
              ),
              title: Text(
                user?.name ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                user?.email ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          ...menu,
          if (menu.isNotEmpty) const Divider(height: 16),
          const _ThemeModeTile(),
          ListTile(
            leading: const Icon(Icons.lock_outline),
            title: const Text(AppStrings.changePasswordTitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(RouteNames.changePassword),
          ),
          ListTile(
            leading: Icon(Icons.logout, color: colorScheme.error),
            title: Text(
              AppStrings.logoutButton,
              style: textTheme.bodyLarge
                  ?.copyWith(color: colorScheme.error, fontWeight: FontWeight.w500),
            ),
            onTap: () => _logout(context),
          ),
          const SizedBox(height: 24),
          Text(
            '${AppStrings.versionLabel} ${AppStrings.appVersion}',
            textAlign: TextAlign.center,
            style: textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _logout(BuildContext context) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final cubit = context.read<AuthCubit>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text(AppStrings.logoutDialogTitle),
        content: const Text(AppStrings.logoutDialogBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: const Text(AppStrings.cancelButton),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: Text(
              AppStrings.logoutButton,
              style: TextStyle(color: Theme.of(dialogContext).colorScheme.error),
            ),
          ),
        ],
      ),
    );
    if (confirmed ?? false) await cubit.logout();
    // Router redirect (authRedirect) tự đẩy về /login khi state đổi.
  }
}

/// Chọn giao diện: theo máy, luôn sáng, hoặc luôn tối. Đổi là thấy ngay.
class _ThemeModeTile extends StatelessWidget {
  const _ThemeModeTile();

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<ThemeCubit>().state;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.brightness_6_outlined),
              const SizedBox(width: 16),
              Text(AppStrings.themeTitle, style: context.textTheme.bodyLarge),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<ThemeMode>(
              key: const Key('settings_theme_mode'),
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(
                  value: ThemeMode.system,
                  label: Text(AppStrings.themeSystem),
                ),
                ButtonSegment(
                  value: ThemeMode.light,
                  label: Text(AppStrings.themeLight),
                ),
                ButtonSegment(
                  value: ThemeMode.dark,
                  label: Text(AppStrings.themeDark),
                ),
              ],
              selected: {mode},
              onSelectionChanged: (selection) =>
                  context.read<ThemeCubit>().select(selection.first),
            ),
          ),
        ],
      ),
    );
  }
}
