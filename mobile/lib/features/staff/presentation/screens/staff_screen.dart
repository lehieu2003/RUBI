import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/password_policy.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';
import 'package:iceflow_mobile/features/staff/presentation/cubit/staff_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Màn "Nhân sự" của Quản lý: mọi tài khoản của nhà máy. Thêm tài khoản Nhân
/// viên / Tài xế; bấm một tài khoản để sửa, đổi vai trò, đặt lại mật khẩu,
/// khóa hoặc mở khóa.
class StaffScreen extends StatelessWidget {
  const StaffScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<StaffCubit>(
      create: (_) => sl<StaffCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(
          title: AppStrings.staffTitle,
          subtitle: AppStrings.staffSubtitle,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Builder(
                builder: (context) => FilledButton.tonalIcon(
                  key: const Key('staff_new'),
                  onPressed: () => _show(
                    context,
                    (cubit) => showDialog<StaffActionResult>(
                      context: context,
                      builder: (_) => _NewAccountDialog(cubit: cubit),
                    ),
                  ),
                  icon: const Icon(Icons.person_add_alt_1_outlined),
                  label: const Text(AppStrings.staffAddButton),
                ),
              ),
            ),
          ],
        ),
        body: const _StaffBody(),
      ),
    );
  }
}

/// Mở một hộp / bảng thao tác rồi báo kết quả nó trả về.
Future<void> _show(
  BuildContext context,
  Future<StaffActionResult?> Function(StaffCubit cubit) open,
) async {
  // Capture trước await — context không dùng được qua async gap an toàn.
  final messenger = ScaffoldMessenger.of(context);
  final errorColor = context.colorScheme.error;
  final result = await open(context.read<StaffCubit>());
  if (result == null) return;
  messenger.showMessage(
    result.message,
    errorColor: result.ok ? null : errorColor,
  );
}

class _StaffBody extends StatelessWidget {
  const _StaffBody();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<StaffCubit>();
    return BlocBuilder<StaffCubit, StaffState>(
      builder: (context, state) {
        if (state.accounts.isEmpty && state.status == ViewStatus.error) {
          return ErrorView(message: state.errorMessage, onRetry: cubit.load);
        }
        if (state.accounts.isEmpty && state.status == ViewStatus.loading) {
          return const LoadingView();
        }
        return RefreshIndicator(
          onRefresh: cubit.load,
          child: ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 16),
            children: [
              if (state.errorMessage != null)
                ErrorBanner(message: state.errorMessage!, onRetry: cubit.load),
              if (state.accounts.isEmpty)
                const EmptyView(message: AppStrings.staffEmpty),
              for (final account in state.accounts)
                _AccountTile(
                  account: account,
                  // Tài khoản Quản lý chỉ xem: server không cho sửa ở đây.
                  onTap: account.isManager
                      ? null
                      : () => _show(
                            context,
                            (cubit) => showModalBottomSheet<StaffActionResult>(
                              context: context,
                              isScrollControlled: true,
                              showDragHandle: true,
                              builder: (_) =>
                                  _AccountSheet(account: account, cubit: cubit),
                            ),
                          ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// Một tài khoản trong danh sách.
class _AccountTile extends StatelessWidget {
  const _AccountTile({required this.account, required this.onTap});

  final StaffAccount account;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final locked = !account.isActive;
    return ListTile(
      key: Key('staff_${account.id}'),
      leading: CircleAvatar(
        backgroundColor: locked ? colorScheme.surfaceContainerHighest : null,
        child: Icon(
          switch (account.role) {
            UserRole.admin => Icons.admin_panel_settings_outlined,
            UserRole.staff => Icons.headset_mic_outlined,
            UserRole.driver => Icons.local_shipping_outlined,
          },
        ),
      ),
      title: Text(
        account.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: context.textTheme.titleMedium?.copyWith(
          color: locked ? colorScheme.onSurfaceVariant : null,
        ),
      ),
      subtitle: Text(
        '${AppStrings.staffRoleLabel(account.role.name)} · ${account.email}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: locked
          ? Text(
              AppStrings.staffLockedBadge,
              style: context.textTheme.labelLarge?.copyWith(
                color: colorScheme.error,
              ),
            )
          : onTap == null
              ? null
              : const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

/// Thông tin một tài khoản và các thao tác trên nó. Đóng lại với kết quả của
/// thao tác vừa làm.
class _AccountSheet extends HookWidget {
  const _AccountSheet({required this.account, required this.cubit});

  final StaffAccount account;
  final StaffCubit cubit;

  @override
  Widget build(BuildContext context) {
    final busy = useState(false);
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;
    final otherRole =
        account.role == UserRole.driver ? UserRole.staff : UserRole.driver;
    final otherRoleLabel = AppStrings.staffRoleLabel(otherRole.name);

    Future<void> run(Future<StaffActionResult> Function() action) async {
      if (busy.value) return;
      busy.value = true;
      final result = await action();
      if (context.mounted) Navigator.of(context).pop(result);
    }

    Future<bool> confirm(String title, String body, String action) async =>
        await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(title),
            content: Text(body),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                child: const Text(AppStrings.cancelButton),
              ),
              TextButton(
                key: const Key('staff_confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                child: Text(action),
              ),
            ],
          ),
        ) ??
        false;

    Future<void> edit() async {
      final input = await showDialog<({String name, String phone})>(
        context: context,
        builder: (_) => _EditDialog(account: account),
      );
      if (input == null) return;
      await run(() => cubit.edit(account, name: input.name, phone: input.phone));
    }

    Future<void> changeRole() async {
      final ok = await confirm(
        AppStrings.staffRoleTitle(otherRoleLabel),
        // Thôi làm tài xế thì đơn đang giữ bị gỡ ra: nói trước khi làm.
        account.role == UserRole.driver
            ? AppStrings.staffRoleFromDriverBody(account.name)
            : AppStrings.staffRoleToDriverBody(account.name),
        AppStrings.staffRoleConfirm,
      );
      if (ok) await run(() => cubit.setRole(account, otherRole));
    }

    Future<void> resetPassword() async {
      final password = await showDialog<String>(
        context: context,
        builder: (_) => _PasswordDialog(account: account),
      );
      if (password == null) return;
      await run(() => cubit.resetPassword(account, password));
    }

    Future<void> toggleLock() async {
      if (!account.isActive) {
        await run(() => cubit.setActive(account, active: true));
        return;
      }
      final ok = await confirm(
        AppStrings.staffLockTitle(account.name),
        account.role == UserRole.driver
            ? AppStrings.staffLockDriverBody
            : AppStrings.staffLockBody,
        AppStrings.staffLockButton,
      );
      if (ok) await run(() => cubit.setActive(account, active: false));
    }

    Widget action(String label, IconData icon, VoidCallback onPressed, {required String keyName, bool danger = false}) =>
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: AppButton(
            key: Key(keyName),
            label: label,
            icon: icon,
            variant: AppButtonVariant.secondary,
            danger: danger,
            onPressed: busy.value ? null : onPressed,
          ),
        );

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(account.name, style: textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              '${AppStrings.staffRoleLabel(account.role.name)} · ${account.email}',
              style: textTheme.bodyMedium?.copyWith(color: muted),
            ),
            Text(
              account.phone ?? AppStrings.customerNoPhone,
              style: textTheme.bodyMedium?.copyWith(color: muted),
            ),
            const SizedBox(height: 8),
            action(AppStrings.staffEditButton, Icons.edit_outlined, edit, keyName: 'staff_edit'),
            action(
              AppStrings.staffRoleButton(otherRoleLabel),
              Icons.swap_horiz,
              changeRole,
              keyName: 'staff_role',
            ),
            action(
              AppStrings.staffResetButton,
              Icons.key_outlined,
              resetPassword,
              keyName: 'staff_reset',
            ),
            action(
              account.isActive
                  ? AppStrings.staffLockButton
                  : AppStrings.staffUnlockButton,
              account.isActive ? Icons.lock_outline : Icons.lock_open_outlined,
              toggleLock,
              keyName: 'staff_lock',
              danger: account.isActive,
            ),
            if (busy.value)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: LoadingView(),
              ),
          ],
        ),
      ),
    );
  }
}

InputDecoration _field(String label, {String? helper}) => InputDecoration(
      labelText: label,
      helperText: helper,
      helperMaxLines: 2,
      isDense: true,
      counterText: '',
    );

List<Widget> _dialogActions(
  BuildContext context, {
  required VoidCallback? onSave,
  required String saveKey,
  bool busy = false,
}) =>
    [
      TextButton(
        onPressed: busy ? null : () => Navigator.of(context).pop(),
        style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
        child: const Text(AppStrings.cancelButton),
      ),
      FilledButton(
        key: Key(saveKey),
        onPressed: busy ? null : onSave,
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
        child: busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : const Text(AppStrings.customerSaveButton),
      ),
    ];

/// Hộp tạo tài khoản; đóng lại với kết quả khi đã tạo xong.
class _NewAccountDialog extends HookWidget {
  const _NewAccountDialog({required this.cubit});

  final StaffCubit cubit;

  @override
  Widget build(BuildContext context) {
    final name = useTextEditingController();
    final email = useTextEditingController();
    final phone = useTextEditingController();
    final password = useTextEditingController();
    final role = useState(UserRole.staff);
    final error = useState<String?>(null);
    final busy = useState(false);

    Future<void> submit() async {
      if (busy.value) return;
      if (name.text.trim().isEmpty || email.text.trim().isEmpty) {
        error.value = AppStrings.staffNameEmailRequired;
        return;
      }
      final weak = PasswordPolicy.validate(password.text);
      if (weak != null) {
        error.value = weak;
        return;
      }
      busy.value = true;
      error.value = null;
      final result = await cubit.create(
        name: name.text,
        email: email.text,
        password: password.text,
        role: role.value,
        phone: phone.text,
      );
      if (!context.mounted) return;
      if (result.ok) {
        Navigator.of(context).pop(result);
      } else {
        busy.value = false;
        error.value = result.message;
      }
    }

    return AlertDialog(
      title: const Text(AppStrings.staffAddTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SegmentedButton<UserRole>(
              key: const Key('staff_new_role'),
              segments: const [
                ButtonSegment(
                  value: UserRole.staff,
                  label: Text(AppStrings.roleStaff),
                ),
                ButtonSegment(
                  value: UserRole.driver,
                  label: Text(AppStrings.roleDriver),
                ),
              ],
              selected: {role.value},
              onSelectionChanged: busy.value
                  ? null
                  : (selection) => role.value = selection.first,
            ),
            const SizedBox(height: 8),
            TextField(
              key: const Key('staff_new_name'),
              controller: name,
              autofocus: true,
              enabled: !busy.value,
              maxLength: 100,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: _field(AppStrings.staffNameLabel),
            ),
            TextField(
              key: const Key('staff_new_email'),
              controller: email,
              enabled: !busy.value,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              decoration: _field(AppStrings.staffEmailLabel),
            ),
            TextField(
              key: const Key('staff_new_phone'),
              controller: phone,
              enabled: !busy.value,
              maxLength: 20,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: _field(AppStrings.customerPhoneLabel),
            ),
            TextField(
              key: const Key('staff_new_password'),
              controller: password,
              enabled: !busy.value,
              maxLength: 72,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => submit(),
              // Hiện rõ: Quản lý gõ rồi đọc cho người nhận.
              decoration: _field(
                AppStrings.staffTempPasswordLabel,
                helper: AppStrings.staffTempPasswordHelper,
              ),
            ),
            if (error.value != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  error.value!,
                  key: const Key('staff_new_error'),
                  style: TextStyle(color: context.colorScheme.error),
                ),
              ),
          ],
        ),
      ),
      actions: _dialogActions(
        context,
        onSave: submit,
        saveKey: 'staff_new_save',
        busy: busy.value,
      ),
    );
  }
}

/// Hộp sửa tên và số điện thoại; đóng lại với giá trị mới.
class _EditDialog extends HookWidget {
  const _EditDialog({required this.account});

  final StaffAccount account;

  @override
  Widget build(BuildContext context) {
    final name = useTextEditingController(text: account.name);
    final phone = useTextEditingController(text: account.phone ?? '');
    final error = useState<String?>(null);

    void submit() {
      if (name.text.trim().isEmpty) {
        error.value = AppStrings.staffNameRequired;
        return;
      }
      Navigator.of(context).pop((name: name.text, phone: phone.text));
    }

    return AlertDialog(
      title: const Text(AppStrings.staffEditButton),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            key: const Key('staff_edit_name'),
            controller: name,
            maxLength: 100,
            textCapitalization: TextCapitalization.words,
            decoration: _field(AppStrings.staffNameLabel)
                .copyWith(errorText: error.value),
          ),
          TextField(
            key: const Key('staff_edit_phone'),
            controller: phone,
            maxLength: 20,
            keyboardType: TextInputType.phone,
            onSubmitted: (_) => submit(),
            decoration: _field(AppStrings.customerPhoneLabel),
          ),
        ],
      ),
      actions: _dialogActions(context, onSave: submit, saveKey: 'staff_edit_save'),
    );
  }
}

/// Hộp nhập mật khẩu tạm mới; đóng lại với mật khẩu đạt yêu cầu.
class _PasswordDialog extends HookWidget {
  const _PasswordDialog({required this.account});

  final StaffAccount account;

  @override
  Widget build(BuildContext context) {
    final password = useTextEditingController();
    final error = useState<String?>(null);

    void submit() {
      final weak = PasswordPolicy.validate(password.text);
      if (weak != null) {
        error.value = weak;
        return;
      }
      Navigator.of(context).pop(password.text);
    }

    return AlertDialog(
      title: Text(AppStrings.staffResetTitle(account.name)),
      content: TextField(
        key: const Key('staff_reset_password'),
        controller: password,
        autofocus: true,
        maxLength: 72,
        autocorrect: false,
        enableSuggestions: false,
        onSubmitted: (_) => submit(),
        decoration: _field(
          AppStrings.staffTempPasswordLabel,
          helper: AppStrings.staffTempPasswordHelper,
        ).copyWith(errorText: error.value),
      ),
      actions: _dialogActions(context, onSave: submit, saveKey: 'staff_reset_save'),
    );
  }
}
