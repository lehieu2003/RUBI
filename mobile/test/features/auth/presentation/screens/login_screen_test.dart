import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthCubit extends Mock implements AuthCubit {}

void main() {
  late _MockAuthCubit cubit;

  setUp(() {
    cubit = _MockAuthCubit();
  });

  Future<void> pumpLoginScreen(WidgetTester tester) {
    return tester.pumpWidget(
      BlocProvider<AuthCubit>.value(
        value: cubit,
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
  }

  Future<void> fillValidCredentials(WidgetTester tester) async {
    await tester.enterText(
      find.byKey(const Key('login_email')),
      'driver@iceflow.vn',
    );
    await tester.enterText(
      find.byKey(const Key('login_password')),
      'secret123',
    );
  }

  group('LoginScreen', () {
    testWidgets('submit khi email/password rỗng → hiện lỗi validate, '
        'KHÔNG gọi cubit', (tester) async {
      whenListen(
        cubit,
        const Stream<AuthState>.empty(),
        initialState: const Unauthenticated(),
      );
      await pumpLoginScreen(tester);

      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();

      expect(find.text(AppStrings.emailInvalid), findsOneWidget);
      expect(find.text(AppStrings.passwordTooShort), findsOneWidget);
      verifyNever(() => cubit.login(any(), any()));
    });

    testWidgets('submit hợp lệ → gọi đúng login(email, password)', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<AuthState>.empty(),
        initialState: const Unauthenticated(),
      );
      when(() => cubit.login(any(), any())).thenAnswer((_) async {});
      await pumpLoginScreen(tester);

      await fillValidCredentials(tester);
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();

      verify(() => cubit.login('driver@iceflow.vn', 'secret123')).called(1);
    });

    testWidgets('Unauthenticated(401) → hiển thị message sai thông tin', (
      tester,
    ) async {
      final states = StreamController<AuthState>.broadcast();
      addTearDown(states.close);
      whenListen(cubit, states.stream, initialState: const Unauthenticated());
      await pumpLoginScreen(tester);

      states.add(
        const Unauthenticated(message: 'Email hoặc mật khẩu không đúng'),
      );
      await tester.pump();

      expect(find.text('Email hoặc mật khẩu không đúng'), findsOneWidget);
    });

    testWidgets('Unauthenticated(429) → hiển thị message thử lại sau', (
      tester,
    ) async {
      final states = StreamController<AuthState>.broadcast();
      addTearDown(states.close);
      whenListen(cubit, states.stream, initialState: const Unauthenticated());
      await pumpLoginScreen(tester);

      states.add(
        const Unauthenticated(
          message: 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.',
        ),
      );
      await tester.pump();

      expect(
        find.text('Quá nhiều lần thử. Vui lòng thử lại sau ít phút.'),
        findsOneWidget,
      );
    });

    testWidgets('đang submit → nút disabled + spinner', (tester) async {
      whenListen(
        cubit,
        const Stream<AuthState>.empty(),
        initialState: const Unauthenticated(),
      );
      // Login chưa bao giờ xong — cubit không emit state mới.
      when(() => cubit.login(any(), any()))
          .thenAnswer((_) => Completer<void>().future);
      await pumpLoginScreen(tester);

      await fillValidCredentials(tester);
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();

      final button = tester.widget<FilledButton>(
        find.byKey(const Key('login_submit')),
      );
      expect(button.onPressed, isNull);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('fail lặp lại cùng message (bloc dedupe) → nút vẫn dùng được '
        'sau lần 2', (tester) async {
      // `AuthState` là Equatable nên bloc BỎ QUA emit trùng state — lần fail
      // thứ hai với cùng message không phát gì ra stream. Spinner phải tắt
      // theo Future của lần gọi login, không theo việc có state mới hay không.
      const message = 'Email hoặc mật khẩu không đúng';
      final states = StreamController<AuthState>.broadcast();
      addTearDown(states.close);
      whenListen(cubit, states.stream, initialState: const Unauthenticated());

      var calls = 0;
      when(() => cubit.login(any(), any())).thenAnswer((_) async {
        calls++;
        if (calls == 1) {
          states.add(const Unauthenticated(message: message));
        }
        // Lần 2: hoàn thành nhưng KHÔNG phát state (mô phỏng dedupe).
      });
      await pumpLoginScreen(tester);

      await fillValidCredentials(tester);

      // Lần 1: fail → hiện message, nút bật lại.
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();
      expect(find.text(message), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      // Lần 2: fail cùng message, không có state mới → nút vẫn bật lại.
      await tester.tap(find.byKey(const Key('login_submit')));
      await tester.pump();
      expect(find.text(message), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
      final button = tester.widget<FilledButton>(
        find.byKey(const Key('login_submit')),
      );
      expect(button.onPressed, isNotNull);
      verify(() => cubit.login(any(), any())).called(2);
    });
  });
}
