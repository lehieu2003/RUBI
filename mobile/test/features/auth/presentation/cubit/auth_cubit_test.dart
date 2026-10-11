import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/error/failure_messages.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAuthStorage extends Mock implements AuthStorage {}

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

  late _MockAuthRepository repo;
  late _MockAuthStorage storage;
  late AuthEvents authEvents;

  setUp(() {
    repo = _MockAuthRepository();
    storage = _MockAuthStorage();
    authEvents = AuthEvents();
  });

  tearDown(() {
    authEvents.dispose();
  });

  AuthCubit buildCubit() =>
      AuthCubit(repo: repo, storage: storage, authEvents: authEvents);

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
        'DRIVER → Authenticated, không đụng storage',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Ok<User>(driver));
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'secret'),
        expect: () => [const Authenticated(driver)],
        verify: (_) {
          verifyNever(() => storage.clear());
        },
      );

      blocTest<AuthCubit, AuthState>(
        'Err (sai thông tin) → Unauthenticated với message từ failureMessage',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer(
            (_) async =>
                const Err<User>(AuthFailure('Email hoặc mật khẩu không đúng')),
          );
        },
        act: (cubit) => cubit.login('tai@iceflow.vn', 'wrong'),
        expect: () => [
          const Unauthenticated(message: 'Email hoặc mật khẩu không đúng'),
        ],
      );

      blocTest<AuthCubit, AuthState>(
        'role STAFF → Unauthenticated + message chính xác + xoá token đã lưu '
        '(Review Focus 4)',
        build: buildCubit,
        setUp: () {
          when(() => repo.login(
                email: any(named: 'email'),
                password: any(named: 'password'),
              )).thenAnswer((_) async => const Ok<User>(staff));
          when(() => storage.clear()).thenAnswer((_) async {});
        },
        act: (cubit) => cubit.login('van@iceflow.vn', 'secret'),
        expect: () => [
          const Unauthenticated(
            message: 'Tài khoản này chưa dùng được trên app',
          ),
        ],
        verify: (_) {
          verify(() => storage.clear()).called(1);
        },
      );
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
    });
  });
}
