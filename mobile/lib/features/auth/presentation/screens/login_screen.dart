import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

/// Màn đăng nhập: email + mật khẩu, nút "Đăng nhập".
///
/// - Validate khi submit: email có '@', mật khẩu tối thiểu 6 ký tự.
/// - Lỗi nghiệp vụ (`Unauthenticated.message`) hiển thị inline dưới form.
/// - Đăng nhập thành công KHÔNG tự điều hướng — router redirect lo việc đó.
class LoginScreen extends HookWidget {
  const LoginScreen({super.key});

  String? _validateEmail(String? value) {
    final email = value?.trim() ?? '';
    if (email.isEmpty || !email.contains('@')) return AppStrings.emailInvalid;
    return null;
  }

  String? _validatePassword(String? value) {
    if ((value ?? '').length < 6) return AppStrings.passwordTooShort;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final emailController = useTextEditingController();
    final passwordController = useTextEditingController();
    final obscurePassword = useState(true);

    // Đang chờ kết quả đăng nhập — tắt trong `finally` của `submit` khi
    // Future `login` kết thúc. KHÔNG dựa vào việc cubit phát state mới:
    // `AuthState` là Equatable nên bloc bỏ qua emit trùng state (fail lặp lại
    // cùng message), spinner sẽ kẹt vĩnh viễn nếu reset theo emission.
    final submitting = useState(false);

    Future<void> submit() async {
      if (submitting.value) return;
      final form = formKey.currentState;
      if (form == null || !form.validate()) return;
      submitting.value = true;
      try {
        await context.read<AuthCubit>().login(
          emailController.text.trim(),
          passwordController.text,
        );
      } finally {
        // Future `login` hoàn thành đúng một lần mỗi lần gọi — dedupe của
        // bloc không ảnh hưởng. Màn hình có thể đã unmount (redirect) →
        // mounted guard.
        if (context.mounted) submitting.value = false;
      }
    }

    return Scaffold(
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
                    const SizedBox(height: 24),
                    Icon(
                      Icons.ac_unit,
                      size: 64,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      AppStrings.loginTitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 48),
                    TextFormField(
                      key: const Key('login_email'),
                      controller: emailController,
                      decoration: const InputDecoration(
                        labelText: AppStrings.emailLabel,
                      ),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      validator: _validateEmail,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('login_password'),
                      controller: passwordController,
                      decoration: InputDecoration(
                        labelText: AppStrings.passwordLabel,
                        suffixIcon: IconButton(
                          onPressed: () =>
                              obscurePassword.value = !obscurePassword.value,
                          icon: Icon(
                            obscurePassword.value
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      obscureText: obscurePassword.value,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => submit(),
                      validator: _validatePassword,
                    ),
                    const SizedBox(height: 8),
                    BlocBuilder<AuthCubit, AuthState>(
                      builder: (context, state) {
                        final message = state is Unauthenticated
                            ? state.message
                            : null;
                        if (message == null) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            message,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        );
                      },
                    ),
                    FilledButton(
                      key: const Key('login_submit'),
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
                          : const Text(AppStrings.loginButton),
                    ),
                    const SizedBox(height: 24),
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
