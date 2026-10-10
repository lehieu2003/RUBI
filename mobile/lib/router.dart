import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/home_shell.dart';

/// Quy tắc điều hướng theo [AuthState] — hàm thuần để unit test.
///
/// - AuthUnknown: đang khôi phục phiên → không điều hướng (app mở ở /login
///   sẵn nên không splash; khi phiên khôi phục xong sẽ tự điều hướng).
/// - Unauthenticated: đẩy về /login, trừ khi đã ở đó.
/// - Authenticated: đẩy về /home, trừ khi đã ở đó.
String? authRedirect(AuthState auth, String location) {
  return switch (auth) {
    AuthUnknown() => null,
    Unauthenticated() => location == '/login' ? null : '/login',
    Authenticated() => location == '/home' ? null : '/home',
  };
}

/// Router chính của app, redirect theo state của [authCubit].
///
/// `/home` là [HomeShell] — shell 3 tab của driver. [AuthCubit] được cấp
/// xuống qua BlocProvider để SettingsTab (đăng xuất) dùng chung instance.
GoRouter createRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: _AuthListenable(authCubit),
    redirect: (context, state) =>
        authRedirect(authCubit.state, state.matchedLocation),
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => BlocProvider<AuthCubit>.value(
          value: authCubit,
          child: const LoginScreen(),
        ),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => BlocProvider<AuthCubit>.value(
          value: authCubit,
          child: const HomeShell(),
        ),
      ),
    ],
  );
}

/// Cầu `AuthCubit.stream` → [Listenable] cho `refreshListenable` của
/// GoRouter (go_router 18 không còn export `GoRouterRefreshStream`).
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(AuthCubit cubit) {
    _sub = cubit.stream.listen((_) => notifyListeners());
  }

  StreamSubscription<AuthState>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
