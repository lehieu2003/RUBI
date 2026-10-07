import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

/// Màn đăng nhập: email + mật khẩu, nút "Đăng nhập".
///
/// - Validate khi submit: email có '@', mật khẩu tối thiểu 6 ký tự.
/// - Lỗi nghiệp vụ (`Unauthenticated.message`) hiển thị inline dưới form.
/// - Đăng nhập thành công KHÔNG tự điều hướng — router redirect lo việc đó.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  /// Đang chờ kết quả đăng nhập. Cubit không có state loading và luôn emit
  /// đúng một state mới sau mỗi lần gọi `login` — state đó (dù thành công hay
  /// lỗi) kết thúc thời gian chờ.
  bool _submitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onAuthStateChanged(AuthState state) {
    if (!_submitting) return;
    setState(() => _submitting = false);
  }

  void _submit() {
    if (_submitting) return;
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;
    setState(() => _submitting = true);
    context.read<AuthCubit>().login(
      _emailController.text.trim(),
      _passwordController.text,
    );
  }

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
    return Scaffold(
      body: SafeArea(
        // Reset _submitting khi cubit emit state mới sau khi submit.
        child: BlocListener<AuthCubit, AuthState>(
          listener: (context, state) => _onAuthStateChanged(state),
          child: Center(
            // Cuộn được khi bàn phím che form trên màn hình thấp.
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 360),
                child: Form(
                  key: _formKey,
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
                        controller: _emailController,
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
                        controller: _passwordController,
                        decoration: InputDecoration(
                          labelText: AppStrings.passwordLabel,
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
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
                        onPressed: _submitting ? null : _submit,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                        ),
                        child: _submitting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                ),
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
      ),
    );
  }
}
