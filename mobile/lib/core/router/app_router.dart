import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/core/router/app_router_refresh.dart';
import 'package:iceflow_mobile/core/router/route_names.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/screens/change_password_screen.dart';
import 'package:iceflow_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/home_shell.dart';

/// Quy tắc điều hướng theo [AuthState] — hàm thuần để unit test.
///
/// - AuthUnknown: đang khôi phục phiên → không điều hướng (app mở ở /login
///   sẵn nên không splash; khi phiên khôi phục xong sẽ tự điều hướng).
/// - Unauthenticated: đẩy về /login, trừ khi đã ở đó.
/// - Authenticated, phải đổi mật khẩu: giữ ở /change-password — server từ
///   chối mọi API khác tới khi đổi xong.
/// - Authenticated: ở /home, hoặc /change-password khi tự mở từ Cài đặt;
///   chỗ khác thì đẩy về /home.
String? authRedirect(AuthState auth, String location) {
  return switch (auth) {
    AuthUnknown() => null,
    Unauthenticated() =>
      location == RouteNames.login ? null : RouteNames.login,
    Authenticated(:final user) when user.mustChangePassword =>
      location == RouteNames.changePassword ? null : RouteNames.changePassword,
    Authenticated() =>
      location == RouteNames.home || location == RouteNames.changePassword
          ? null
          : RouteNames.home,
  };
}

/// Router chính của app, redirect theo state của [authCubit].
///
/// `/home` là [HomeShell] — shell 3 tab của driver. [AuthCubit] được cấp
/// xuống qua BlocProvider để SettingsTab (đăng xuất) dùng chung instance.
GoRouter createRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: RouteNames.login,
    refreshListenable: AppRouterRefresh(authCubit.stream),
    redirect: (context, state) =>
        authRedirect(authCubit.state, state.matchedLocation),
    routes: [
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => BlocProvider<AuthCubit>.value(
          value: authCubit,
          child: const LoginScreen(),
        ),
      ),
      GoRoute(
        path: RouteNames.home,
        builder: (context, state) => BlocProvider<AuthCubit>.value(
          value: authCubit,
          child: const HomeShell(),
        ),
      ),
      GoRoute(
        path: RouteNames.changePassword,
        builder: (context, state) => BlocProvider<AuthCubit>.value(
          value: authCubit,
          child: const ChangePasswordScreen(),
        ),
      ),
    ],
  );
}
