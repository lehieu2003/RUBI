import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

/// Tab "Cài đặt": thông tin user từ [AuthCubit] (provider cấp shell) +
/// đăng xuất (có dialog xác nhận) + phiên bản app.
class SettingsTab extends StatelessWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final authState = context.watch<AuthCubit>().state;
    final user = authState is Authenticated ? authState.user : null;

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.navSettings)),
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
