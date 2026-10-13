import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/router/route_names.dart';
import 'package:iceflow_mobile/features/auth/domain/password_policy.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';

/// Màn đổi mật khẩu.
///
/// Hai cách vào:
/// - BẮT BUỘC: tài khoản Quản lý vừa tạo / đặt lại mật khẩu. Router giữ
///   người dùng ở đây tới khi đổi xong; lối ra duy nhất là đăng xuất.
/// - TỰ ĐỔI: mở từ tab Cài đặt, có nút quay lại.
class ChangePasswordScreen extends HookWidget {
  const ChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<AuthCubit>();
    // Chốt lúc mở màn: đổi xong thì cờ tắt ngay, trước khi rời màn.
    final forced = useMemoized(() {
      final state = cubit.state;
      return state is Authenticated && state.user.mustChangePassword;
    });

    final formKey = useMemoized(GlobalKey<FormState>.new);
    final currentController = useTextEditingController();
    final newController = useTextEditingController();
    final confirmController = useTextEditingController();
    final obscure = useState(true);
    final submitting = useState(false);
    // Lỗi server trả về cho lần gửi gần nhất (mật khẩu hiện tại sai...).
    final serverError = useState<String?>(null);

    Future<void> submit() async {
      if (submitting.value) return;
      final form = formKey.currentState;
      if (form == null || !form.validate()) return;
      submitting.value = true;
      serverError.value = null;
      final error = await cubit.changePassword(
        currentPassword: currentController.text,
        newPassword: newController.text,
      );
      if (!context.mounted) return;
      submitting.value = false;
      if (error != null) {
        serverError.value = error;
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(AppStrings.passwordChangedSnack)),
      );
      // Mở từ Cài đặt → quay lại; bắt buộc đổi → vào app.
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(RouteNames.home);
      }
    }

    InputDecoration decoration(String label, {String? helper}) =>
        InputDecoration(
          labelText: label,
          helperText: helper,
          suffixIcon: IconButton(
            onPressed: () => obscure.value = !obscure.value,
            icon: Icon(
              obscure.value
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        );

    return Scaffold(
      appBar: AppHeader(title: AppStrings.changePasswordTitle),
      body: SafeArea(
        // Cuộn được khi bàn phím che form trên màn hình thấp.
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (forced) ...[
                      Text(
                        AppStrings.changePasswordForcedNotice,
                        style: context.textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 24),
                    ],
                    TextFormField(
                      key: const Key('change_password_current'),
                      controller: currentController,
                      decoration: decoration(AppStrings.currentPasswordLabel),
                      obscureText: obscure.value,
                      textInputAction: TextInputAction.next,
                      validator: (value) => (value ?? '').isEmpty
                          ? AppStrings.currentPasswordRequired
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('change_password_new'),
                      controller: newController,
                      decoration: decoration(
                        AppStrings.newPasswordLabel,
                        helper: PasswordPolicy.hint,
                      ),
                      obscureText: obscure.value,
                      textInputAction: TextInputAction.next,
                      validator: (value) {
                        final password = value ?? '';
                        final policyError = PasswordPolicy.validate(password);
                        if (policyError != null) return policyError;
                        if (password == currentController.text) {
                          return AppStrings.newPasswordSameAsCurrent;
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('change_password_confirm'),
                      controller: confirmController,
                      decoration: decoration(AppStrings.confirmPasswordLabel),
                      obscureText: obscure.value,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => submit(),
                      validator: (value) => value != newController.text
                          ? AppStrings.confirmPasswordMismatch
                          : null,
                    ),
                    const SizedBox(height: 8),
                    if (serverError.value != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          serverError.value!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: context.colorScheme.error,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    FilledButton(
                      key: const Key('change_password_submit'),
                      onPressed: submitting.value ? null : submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                      ),
                      child: submitting.value
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 3),
                            )
                          : const Text(AppStrings.changePasswordButton),
                    ),
                    if (forced) ...[
                      const SizedBox(height: 8),
                      AppButton(
                        key: const Key('change_password_logout'),
                        label: AppStrings.logoutButton,
                        onPressed: submitting.value ? null : cubit.logout,
                        variant: AppButtonVariant.text,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
