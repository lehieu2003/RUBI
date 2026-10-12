import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAppPreferences extends Mock implements AppPreferences {}

void main() {
  const driver = User(
    id: 'u-driver-1',
    email: 'tai@iceflow.vn',
    name: 'Nguyễn Văn Tài',
    role: UserRole.driver,
  );
  const staff = User(
    id: 'u-staff-1',
    email: 'van@iceflow.vn',
    name: 'Nguyễn Thị Vân',
    role: UserRole.staff,
  );
  const admin = User(
    id: 'u-admin-1',
    email: 'chu@iceflow.vn',
    name: 'Nguyễn Văn Chủ',
    role: UserRole.admin,
  );

  late _MockAuthRepository repo;
  late _MockAppPreferences preferences;
  late AuthEvents authEvents;

  setUp(() {
    repo = _MockAuthRepository();
    preferences = _MockAppPreferences();
    when(() => preferences.readLastEmail()).thenAnswer((_) async => null);
    when(() => preferences.saveLastEmail(any())).thenAnswer((_) async {});
    authEvents = AuthEvents();
  });

  tearDown(() {
    authEvents.dispose();
  });

  AuthCubit buildCubit() =>
      AuthCubit(
        repo: repo,
        preferences: preferences,
        authEvents: authEvents,
      );

  group('AuthCubit', () {
    group('restore', () {
      blocTest<AuthCubit, AuthState>(
        'có phiên đã lưu → Authenticated',
        build: buildCubit,
        setUp: () {
          when(() => repo.restoreSession())
              .thenAnswer((_) async => const Ok<User?>(driver));
        },
        act: (cubit) => cubit.restore(),
        expect: () => [const Authenticated(driver)],
      );

      blocTest<AuthCubit, AuthState>(
        'không có phiên → Unauthenticated (không message)',
        build: buildCubit,
        setUp: () {
          when(() => repo.restoreSession())
              .thenAnswer((_) async => const Ok<User?>(null));
        },
        act: (cubit) => cubit.restore(),
        expect: () => [const Unauthenticated()],
      );

      blocTest<AuthCubit, AuthState>(
        'lỗi kết nối → Unauthenticated với copy failureMessage',
        build: buildCubit,
        setUp: () {
          when(() => repo.restoreSession())
              .thenAnswer((_) async => const Err<User?>(NetworkFailure()));
        },
        act: (cubit) => cubit.restore(),
        expect: () => [
          Unauthenticated(message: FailureMessages.network),
        ],
      );
    });

    group('login', () {
      blocTest<AuthCubit, AuthState>(
        'DRIVER → Authenticated',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Ok<User>(driver));
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'secret'),
        expect: () => [const Authenticated(driver)],
      );

      blocTest<AuthCubit, AuthState>(
        'DRIVER → nhớ email vừa đăng nhập',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Ok<User>(driver));
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'secret'),
        verify: (_) {
          verify(() => preferences.saveLastEmail('tai@iceflow.vn')).called(1);
        },
      );

      blocTest<AuthCubit, AuthState>(
        'lưu email lỗi → vẫn Authenticated',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Ok<User>(driver));
          when(() => preferences.saveLastEmail(any()))
              .thenThrow(StateError('preferences unavailable'));
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'secret'),
        expect: () => [const Authenticated(driver)],
      );

      blocTest<AuthCubit, AuthState>(
        'sai email/mật khẩu (401 của server) → đúng câu của server, KHÔNG '
        'phải "phiên đăng nhập hết hạn"',
        build: buildCubit,
        setUp: () {
          // Đúng failure mà repository trả cho 401 của /api/auth/login.
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer(
            (_) async => const Err<User>(
              AuthFailure('Email hoặc mật khẩu không đúng', statusCode: 401),
            ),
          );
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'wrong'),
        expect: () => [
          const Unauthenticated(message: 'Email hoặc mật khẩu không đúng'),
        ],
      );

      // App dành cho cả ba vai trò: không vai trò nào bị chặn ở đăng nhập.
      for (final (label, user) in [
        ('Nhân viên', staff),
        ('Quản lý', admin),
      ]) {
        blocTest<AuthCubit, AuthState>(
          '$label đăng nhập → Authenticated, nhớ email',
          build: buildCubit,
          setUp: () {
            when(() => repo.login(
                  email: any(named: 'email'),
                  password: any(named: 'password'),
                )).thenAnswer((_) async => Ok<User>(user));
          },
          act: (cubit) => cubit.login(user.email, 'secret'),
          expect: () => [Authenticated(user)],
          verify: (_) {
            verify(() => preferences.saveLastEmail(user.email)).called(1);
          },
        );
      }
    });

    blocTest<AuthCubit, AuthState>(
      'login thất bại → không nhớ email',
      build: buildCubit,
      setUp: () {
        when(() => repo.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => const Err<User>(NetworkFailure()));
      },
      act: (cubit) => cubit.login('van@iceflow.vn', 'secret'),
      verify: (_) {
        verifyNever(() => preferences.saveLastEmail(any()));
      },
    );

    group('lastEmail', () {
      test('trả email đã lưu', () async {
        when(() => preferences.readLastEmail())
            .thenAnswer((_) async => 'tai@iceflow.vn');
        final cubit = buildCubit();
        addTearDown(cubit.close);

        expect(await cubit.lastEmail(), 'tai@iceflow.vn');
      });

      test('đọc lỗi → null, không ném', () async {
        when(() => preferences.readLastEmail())
            .thenThrow(StateError('preferences unavailable'));
        final cubit = buildCubit();
        addTearDown(cubit.close);

        expect(await cubit.lastEmail(), isNull);
      });
    });

    group('logout', () {
      blocTest<AuthCubit, AuthState>(
        'logout Ok → Unauthenticated',
        build: buildCubit,
        setUp: () {
          when(() => repo.logout())
              .thenAnswer((_) async => const Ok<void>(null));
        },
        act: (cubit) => cubit.logout(),
        expect: () => [const Unauthenticated()],
      );

      blocTest<AuthCubit, AuthState>(
        'logout Err (storage cục bộ) → vẫn Unauthenticated, surface nothing',
        build: buildCubit,
        setUp: () {
          when(() => repo.logout()).thenAnswer(
            (_) async =>
                const Err<void>(UnexpectedFailure('secure storage boom')),
          );
        },
        act: (cubit) => cubit.logout(),
        expect: () => [const Unauthenticated()],
      );
    });

    group('authEvents.onLogout', () {
      blocTest<AuthCubit, AuthState>(
        'sự kiện bị buộc đăng xuất từ network layer → Unauthenticated',
        build: buildCubit,
        act: (cubit) => authEvents.emitLogout(),
        expect: () => [const Unauthenticated()],
      );
    });

    group('authEvents.onPasswordChangeRequired', () {
      blocTest<AuthCubit, AuthState>(
        'đang đăng nhập → bật cờ phải đổi mật khẩu; báo lần hai không đổi gì',
        build: buildCubit,
        seed: () => const Authenticated(driver),
        act: (cubit) async {
          authEvents.emitPasswordChangeRequired();
          await Future<void>.delayed(Duration.zero);
          authEvents.emitPasswordChangeRequired();
        },
        expect: () => [
          Authenticated(driver.copyWith(mustChangePassword: true)),
        ],
      );

      blocTest<AuthCubit, AuthState>(
        'chưa đăng nhập → bỏ qua',
        build: buildCubit,
        seed: () => const Unauthenticated(),
        act: (cubit) => authEvents.emitPasswordChangeRequired(),
        expect: () => const <AuthState>[],
      );
    });

    group('đóng khi đang chờ', () {
      test('restore / login / logout trả về sau khi cubit đóng → không lỗi',
          () async {
        final restoring = Completer<Result<User?>>();
        final signingIn = Completer<Result<User>>();
        final signingOut = Completer<Result<void>>();
        when(() => repo.restoreSession()).thenAnswer((_) => restoring.future);
        when(() => repo.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) => signingIn.future);
        when(() => repo.logout()).thenAnswer((_) => signingOut.future);
        final cubit = buildCubit();

        final running = [
          cubit.restore(),
          cubit.login('tai@iceflow.vn', 'x'),
          cubit.logout(),
        ];
        await cubit.close();
        restoring.complete(const Ok<User?>(driver));
        signingIn.complete(const Ok<User>(driver));
        signingOut.complete(const Ok<void>(null));

        await expectLater(Future.wait(running), completes);
        expect(cubit.state, const AuthUnknown());
      });

      test('login: cubit đóng khi đang lưu email → không lỗi', () async {
        final saving = Completer<void>();
        when(() => repo.login(
              email: any(named: 'email'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => const Ok<User>(driver));
        when(() => preferences.saveLastEmail(any()))
            .thenAnswer((_) => saving.future);
        final cubit = buildCubit();

        final signingIn = cubit.login('tai@iceflow.vn', 'x');
        await untilCalled(() => preferences.saveLastEmail(any()));
        await cubit.close();
        saving.complete();

        await expectLater(signingIn, completes);
        expect(cubit.state, const AuthUnknown());
      });
    });

    group('changePassword', () {
      const newDriver = User(
        id: 'u-driver-2',
        email: 'loc@iceflow.vn',
        name: 'Hoàng Văn Lộc',
        role: UserRole.driver,
        factoryId: 'f-1',
        mustChangePassword: true,
      );

      void stubChange(Result<void> result) {
        when(() => repo.changePassword(
              currentPassword: any(named: 'currentPassword'),
              newPassword: any(named: 'newPassword'),
            )).thenAnswer((_) async => result);
      }

      blocTest<AuthCubit, AuthState>(
        'bắt buộc đổi, thành công → tắt cờ, giữ nguyên phần còn lại của user',
        build: buildCubit,
        seed: () => const Authenticated(newDriver),
        setUp: () => stubChange(const Ok<void>(null)),
        act: (cubit) async {
          final error = await cubit.changePassword(
            currentPassword: 'Cu12345678',
            newPassword: 'Matkhau2026',
          );
          expect(error, isNull);
        },
        expect: () => [
          const Authenticated(
            User(
              id: 'u-driver-2',
              email: 'loc@iceflow.vn',
              name: 'Hoàng Văn Lộc',
              role: UserRole.driver,
              factoryId: 'f-1',
            ),
          ),
        ],
        verify: (_) {
          verify(() => repo.changePassword(
                currentPassword: 'Cu12345678',
                newPassword: 'Matkhau2026',
              )).called(1);
        },
      );

      blocTest<AuthCubit, AuthState>(
        'tự đổi (không có cờ), thành công → không cần đổi state',
        build: buildCubit,
        seed: () => const Authenticated(driver),
        setUp: () => stubChange(const Ok<void>(null)),
        act: (cubit) => cubit.changePassword(
          currentPassword: 'Cu12345678',
          newPassword: 'Matkhau2026',
        ),
        expect: () => const <AuthState>[],
      );

      blocTest<AuthCubit, AuthState>(
        'server từ chối → trả đúng câu của server, vẫn bị giữ ở màn đổi mật khẩu',
        build: buildCubit,
        seed: () => const Authenticated(newDriver),
        setUp: () => stubChange(
          const Err<void>(
            ServerFailure('Mật khẩu hiện tại không đúng', statusCode: 400),
          ),
        ),
        act: (cubit) async {
          final error = await cubit.changePassword(
            currentPassword: 'sai',
            newPassword: 'Matkhau2026',
          );
          expect(error, 'Mật khẩu hiện tại không đúng');
        },
        expect: () => const <AuthState>[],
      );

      test('mất mạng → câu báo mất kết nối; cubit đóng giữa chừng → không lỗi',
          () async {
        stubChange(const Err<void>(NetworkFailure()));
        final cubit = buildCubit();
        expect(
          await cubit.changePassword(currentPassword: 'a', newPassword: 'b'),
          FailureMessages.network,
        );

        final pending = Completer<Result<void>>();
        when(() => repo.changePassword(
              currentPassword: any(named: 'currentPassword'),
              newPassword: any(named: 'newPassword'),
            )).thenAnswer((_) => pending.future);
        cubit.emit(const Authenticated(newDriver));
        final changing =
            cubit.changePassword(currentPassword: 'a', newPassword: 'b');
        await cubit.close();
        pending.complete(const Ok<void>(null));
        expect(await changing, isNull);
        expect(cubit.state, const Authenticated(newDriver));
      });
    });
  });
}
