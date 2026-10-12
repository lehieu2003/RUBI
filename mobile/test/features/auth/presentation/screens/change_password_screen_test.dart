import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/router/route_names.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/screens/change_password_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthCubit extends Mock implements AuthCubit {}

void main() {
  const driver = User(
    id: 'u-driver-1',
    email: 'tai@iceflow.vn',
    name: 'Nguyễn Văn Tài',
    role: UserRole.driver,
  );
  const newDriver = User(
    id: 'u-driver-2',
    email: 'loc@iceflow.vn',
    name: 'Hoàng Văn Lộc',
    role: UserRole.driver,
    mustChangePassword: true,
  );

  late _MockAuthCubit cubit;

  setUp(() {
    cubit = _MockAuthCubit();
    when(() => cubit.logout()).thenAnswer((_) async {});
  });

  void signedInAs(User user) => whenListen(
        cubit,
        const Stream<AuthState>.empty(),
        initialState: Authenticated(user),
      );

  void stubChange(String? error) {
    when(
      () => cubit.changePassword(
        currentPassword: any(named: 'currentPassword'),
        newPassword: any(named: 'newPassword'),
      ),
    ).thenAnswer((_) async => error);
  }

  /// Bắt buộc đổi: màn này là route duy nhất trên stack.
  /// Tự đổi: mở từ "Cài đặt" bằng push, nên có đường quay lại.
  Future<void> pumpScreen(WidgetTester tester, {required bool pushed}) async {
    final router = GoRouter(
      initialLocation: pushed ? '/settings' : RouteNames.changePassword,
      routes: [
        GoRoute(
          path: RouteNames.home,
          builder: (_, _) => const Scaffold(body: Text('HOME')),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, _) => Scaffold(
            body: TextButton(
              onPressed: () => context.push(RouteNames.changePassword),
              child: const Text('SETTINGS'),
            ),
          ),
        ),
        GoRoute(
          path: RouteNames.changePassword,
          builder: (_, _) => const ChangePasswordScreen(),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      BlocProvider<AuthCubit>.value(
        value: cubit,
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    if (pushed) {
      await tester.tap(find.text('SETTINGS'));
      await tester.pumpAndSettle();
    }
  }

  Future<void> fill(
    WidgetTester tester, {
    String current = 'Cu12345678',
    String next = 'Matkhau2026',
    String? confirm,
  }) async {
    await tester.enterText(find.byKey(const Key('change_password_current')), current);
    await tester.enterText(find.byKey(const Key('change_password_new')), next);
    await tester.enterText(
      find.byKey(const Key('change_password_confirm')),
      confirm ?? next,
    );
  }

  Future<void> submit(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('change_password_submit')));
    await tester.pump();
  }

  group('ChangePasswordScreen', () {
    testWidgets('form trống → báo lỗi từng ô, KHÔNG gọi cubit', (tester) async {
      signedInAs(driver);
      await pumpScreen(tester, pushed: true);

      await submit(tester);

      expect(find.text(AppStrings.currentPasswordRequired), findsOneWidget);
      expect(find.text('Mật khẩu phải có ít nhất 8 ký tự'), findsOneWidget);
      verifyNever(
        () => cubit.changePassword(
          currentPassword: any(named: 'currentPassword'),
          newPassword: any(named: 'newPassword'),
        ),
      );
    });

    testWidgets('mật khẩu mới yếu, trùng mật khẩu cũ, hoặc nhập lại không khớp '
        '→ chặn trên máy', (tester) async {
      signedInAs(driver);
      await pumpScreen(tester, pushed: true);

      await fill(tester, next: 'matkhaumoi');
      await submit(tester);
      expect(find.text('Mật khẩu phải gồm cả chữ và số'), findsOneWidget);

      await fill(tester, current: 'Matkhau2026', next: 'Matkhau2026');
      await submit(tester);
      expect(find.text(AppStrings.newPasswordSameAsCurrent), findsOneWidget);

      await fill(tester, confirm: 'Matkhau2027');
      await submit(tester);
      expect(find.text(AppStrings.confirmPasswordMismatch), findsOneWidget);

      verifyNever(
        () => cubit.changePassword(
          currentPassword: any(named: 'currentPassword'),
          newPassword: any(named: 'newPassword'),
        ),
      );
    });

    testWidgets('server từ chối → hiện đúng câu của server, ở lại màn',
        (tester) async {
      signedInAs(driver);
      stubChange('Mật khẩu hiện tại không đúng');
      await pumpScreen(tester, pushed: true);

      await fill(tester);
      await submit(tester);
      await tester.pump();

      expect(find.text('Mật khẩu hiện tại không đúng'), findsOneWidget);
      expect(find.byKey(const Key('change_password_submit')), findsOneWidget);
    });

    testWidgets('tự đổi từ Cài đặt: gửi đúng hai mật khẩu, xong thì quay lại; '
        'không có nút đăng xuất', (tester) async {
      signedInAs(driver);
      stubChange(null);
      await pumpScreen(tester, pushed: true);
      expect(find.text(AppStrings.changePasswordForcedNotice), findsNothing);
      expect(find.byKey(const Key('change_password_logout')), findsNothing);

      await fill(tester);
      await submit(tester);
      await tester.pumpAndSettle();

      verify(
        () => cubit.changePassword(
          currentPassword: 'Cu12345678',
          newPassword: 'Matkhau2026',
        ),
      ).called(1);
      expect(find.text('SETTINGS'), findsOneWidget);
      expect(find.text(AppStrings.passwordChangedSnack), findsOneWidget);
    });

    testWidgets('bắt buộc đổi: có lời nhắc, đổi xong thì vào app', (tester) async {
      signedInAs(newDriver);
      stubChange(null);
      await pumpScreen(tester, pushed: false);
      expect(find.text(AppStrings.changePasswordForcedNotice), findsOneWidget);

      await fill(tester);
      await submit(tester);
      await tester.pumpAndSettle();

      expect(find.text('HOME'), findsOneWidget);
    });

    testWidgets('bắt buộc đổi: lối ra duy nhất là đăng xuất', (tester) async {
      signedInAs(newDriver);
      await pumpScreen(tester, pushed: false);
      expect(find.byType(BackButton), findsNothing);

      await tester.tap(find.byKey(const Key('change_password_logout')));
      await tester.pump();

      verify(() => cubit.logout()).called(1);
    });

    testWidgets('đang gửi: nút bị khoá, bấm lần hai không gửi lại',
        (tester) async {
      signedInAs(driver);
      final pending = Completer<String?>();
      when(
        () => cubit.changePassword(
          currentPassword: any(named: 'currentPassword'),
          newPassword: any(named: 'newPassword'),
        ),
      ).thenAnswer((_) => pending.future);
      await pumpScreen(tester, pushed: true);

      await fill(tester);
      await submit(tester);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.tap(find.byKey(const Key('change_password_submit')));
      await tester.pump();

      pending.complete('Không có kết nối. Vui lòng thử lại.');
      await tester.pump();
      verify(
        () => cubit.changePassword(
          currentPassword: any(named: 'currentPassword'),
          newPassword: any(named: 'newPassword'),
        ),
      ).called(1);
      expect(find.text('Không có kết nối. Vui lòng thử lại.'), findsOneWidget);
    });
  });
}
