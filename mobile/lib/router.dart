import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

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
/// `/login` là placeholder — Task 11 thay bằng LoginScreen; `/home` là
/// placeholder — Task 14 thay bằng HomeShell.
GoRouter createRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: _AuthListenable(authCubit),
    redirect: (context, state) =>
        authRedirect(authCubit.state, state.matchedLocation),
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreenPlaceholder(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeShellPlaceholder(),
      ),
    ],
  );
}

/// Màn đăng nhập tạm — Task 11 thay bằng LoginScreen thật.
class LoginScreenPlaceholder extends StatelessWidget {
  const LoginScreenPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Đăng nhập')),
    );
  }
}

/// Shell chính tạm — Task 14 thay bằng HomeShell thật.
class HomeShellPlaceholder extends StatelessWidget {
  const HomeShellPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Home')),
    );
  }
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
