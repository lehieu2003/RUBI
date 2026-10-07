import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/data/auth_repository_impl.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

/// In-memory [AuthStorage] fake with call counters and fault switches.
class _FakeAuthStorage implements AuthStorage {
  String? _token;
  int clearCalls = 0;

  /// Simulate secure-storage platform failures.
  bool failOnSave = false;
  bool failOnRead = false;
  bool failOnClear = false;

  @override
  Future<void> clear() async {
    if (failOnClear) throw StateError('secure storage clear unavailable');
    clearCalls++;
    _token = null;
  }

  @override
  Future<String?> readToken() async {
    if (failOnRead) throw StateError('secure storage read unavailable');
    return _token;
  }

  @override
  Future<void> saveToken(String token) async {
    if (failOnSave) throw StateError('secure storage save unavailable');
    _token = token;
  }
}

void main() {
  group('AuthRepositoryImpl', () {
    late _FakeAuthStorage storage;
    late Dio dio;
    late DioAdapter adapter;
    late AuthRepositoryImpl repo;

    // Fixture khớp contract backend cho `data.user`.
    const userFixture = {
      'id': 'u-driver-1',
      'email': 'tai@iceflow.vn',
      'name': 'Nguyễn Văn Tài',
      'role': 'DRIVER',
      'factoryId': 'factory-1',
    };
    const expectedUser = User(
      id: 'u-driver-1',
      email: 'tai@iceflow.vn',
      name: 'Nguyễn Văn Tài',
      role: UserRole.driver,
      factoryId: 'factory-1',
    );

    setUp(() {
      storage = _FakeAuthStorage();
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = AuthRepositoryImpl(dio: dio, authStorage: storage);
    });

    tearDown(() {
      dio.close();
    });

    /// The adapter may hand the request body back as a JSON string or a map.
    dynamic decodedBody(Object? raw) =>
        raw is String ? jsonDecode(raw) : raw;

    group('login', () {
      test('200 → lưu token + trả User DRIVER, gửi đúng body', () async {
        Object? capturedBody;
        // data: bắt buộc khi route có body — matcher so sánh cả request body.
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.replyCallback(200, (options) {
              capturedBody = decodedBody(options.data);
              return {
                'success': true,
                'data': {'user': userFixture, 'token': 'jwt-123'},
              };
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        expect(res, Ok(expectedUser));
        expect(await storage.readToken(), 'jwt-123');
        expect(capturedBody, {'email': 'tai@iceflow.vn', 'password': 'secret'});
      });

      test('401 sai mật khẩu → Err(AuthFailure) message từ server, không lưu token',
          () async {
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.reply(401, {
              'success': false,
              'error': 'Email hoặc mật khẩu không đúng',
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'wrong'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'wrong');

        expect(res.isOk, isFalse);
        final failure = (res as Err<User>).failure;
        expect(failure, isA<AuthFailure>());
        expect((failure as AuthFailure).message, 'Email hoặc mật khẩu không đúng');
        expect(await storage.readToken(), isNull);
      });

      test('200 nhưng thiếu token → Err(UnexpectedFailure), không lưu token',
          () async {
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.reply(200, {
              'success': true,
              'data': {'user': userFixture},
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        expect(
          res,
          isA<Err<User>>().having(
            (e) => e.failure,
            'failure',
            isA<UnexpectedFailure>(),
          ),
        );
        expect(await storage.readToken(), isNull);
      });

      test('200 nhưng user role lạ → Err(UnexpectedFailure), không lưu token',
          () async {
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.reply(200, {
              'success': true,
              'data': {
                'user': {...userFixture, 'role': 'OWNER'},
                'token': 'jwt-123',
              },
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        expect((res as Err<User>).failure, isA<UnexpectedFailure>());
        expect(await storage.readToken(), isNull);
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.throws(
              0,
              DioException(
                requestOptions: RequestOptions(path: '/api/auth/login'),
                type: DioExceptionType.connectionError,
                error: 'connection refused',
              ),
            );
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        expect((res as Err<User>).failure, isA<NetworkFailure>());
        expect(await storage.readToken(), isNull);
      });

      test('200 nhưng field sai kiểu (id là số) → Err(UnexpectedFailure), không lưu token',
          () async {
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.reply(200, {
              'success': true,
              'data': {
                'user': {...userFixture, 'id': 123},
                'token': 'jwt-123',
              },
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        // TypeError từ cast `as String?` phải bị repo giữ lại trong Result.
        expect((res as Err<User>).failure, isA<UnexpectedFailure>());
        expect(await storage.readToken(), isNull);
      });

      test('saveToken ném lỗi platform → Err(UnexpectedFailure), không phải exception',
          () async {
        storage.failOnSave = true;
        adapter.onPost(
          '/api/auth/login',
          (server) {
            server.reply(200, {
              'success': true,
              'data': {'user': userFixture, 'token': 'jwt-123'},
            });
          },
          data: {'email': 'tai@iceflow.vn', 'password': 'secret'},
        );

        final res =
            await repo.login(email: 'tai@iceflow.vn', password: 'secret');

        expect(res.isOk, isFalse);
        expect((res as Err<User>).failure, isA<UnexpectedFailure>());
      });
    });

    group('restoreSession', () {
      test('không có token → Ok(null), KHÔNG gọi network', () async {
        // Không đăng ký route nào: failOnMissingMock khiến mọi request ném —
        // nếu repo gọi network thì test này fail.
        final res = await repo.restoreSession();

        expect(res, const Ok<User?>(null));
        expect(await storage.readToken(), isNull);
      });

      test('có token + me 200 → Ok(User), giữ nguyên token', () async {
        await storage.saveToken('jwt-123');
        adapter.onGet('/api/auth/me', (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'user': {...userFixture, 'isActive': true},
              'otherField': 'bị bỏ qua — mapper chỉ đọc data.user',
            },
          });
        });

        final res = await repo.restoreSession();

        expect(res, const Ok<User?>(expectedUser));
        expect(await storage.readToken(), 'jwt-123');
        expect(storage.clearCalls, 0);
      });

      test('có token + me 401 → xoá token + Ok(null) (im lặng, không Err)',
          () async {
        await storage.saveToken('expired-token');
        adapter.onGet('/api/auth/me', (server) {
          server.reply(401, {'success': false, 'error': 'Token expired'});
        });

        final res = await repo.restoreSession();

        expect(res, const Ok<User?>(null)); // KHÔNG phải Err
        expect(storage.clearCalls, 1);
        expect(await storage.readToken(), isNull);
      });

      test('có token + lỗi kết nối → Err(NetworkFailure), KHÔNG xoá token',
          () async {
        await storage.saveToken('jwt-123');
        adapter.onGet('/api/auth/me', (server) {
          server.throws(
            0,
            DioException(
              requestOptions: RequestOptions(path: '/api/auth/me'),
              type: DioExceptionType.connectionError,
              error: 'connection refused',
            ),
          );
        });

        final res = await repo.restoreSession();

        expect((res as Err<User?>).failure, isA<NetworkFailure>());
        expect(storage.clearCalls, 0);
        expect(await storage.readToken(), 'jwt-123');
      });

      test('readToken ném lỗi platform → Err(UnexpectedFailure), không phải exception',
          () async {
        storage.failOnRead = true;

        final res = await repo.restoreSession();

        expect((res as Err<User?>).failure, isA<UnexpectedFailure>());
      });

      test('me 401 + clear ném lỗi → vẫn Ok(null) im lặng (clear best-effort)',
          () async {
        await storage.saveToken('expired-token');
        storage.failOnClear = true;
        adapter.onGet('/api/auth/me', (server) {
          server.reply(401, {'success': false, 'error': 'Token expired'});
        });

        final res = await repo.restoreSession();

        // Contract 401: im lặng kể cả khi secure-storage lỗi — token còn
        // sót lại sẽ bị xoá ở lần 401 kế tiếp.
        expect(res, const Ok<User?>(null));
        expect(await storage.readToken(), 'expired-token');
      });
    });

    group('logout', () {
      test('gọi POST /api/auth/logout rồi xoá token → Ok(null)', () async {
        await storage.saveToken('jwt-123');
        var logoutCalled = false;
        adapter.onPost('/api/auth/logout', (server) {
          server.replyCallback(200, (options) {
            logoutCalled = true;
            return {'success': true, 'data': null};
          });
        });

        final res = await repo.logout();

        expect(logoutCalled, isTrue);
        expect(storage.clearCalls, 1);
        expect(await storage.readToken(), isNull);
        expect(res, const Ok<void>(null));
      });

      test('logout 500 → vẫn xoá token + Ok(null)', () async {
        await storage.saveToken('jwt-123');
        adapter.onPost('/api/auth/logout', (server) {
          server.reply(500, {'success': false, 'error': 'boom'});
        });

        final res = await repo.logout();

        expect(res, const Ok<void>(null));
        expect(storage.clearCalls, 1);
        expect(await storage.readToken(), isNull);
      });

      test('logout mất kết nối → vẫn xoá token + Ok(null)', () async {
        await storage.saveToken('jwt-123');
        adapter.onPost('/api/auth/logout', (server) {
          server.throws(
            0,
            DioException(
              requestOptions: RequestOptions(path: '/api/auth/logout'),
              type: DioExceptionType.connectionError,
              error: 'connection refused',
            ),
          );
        });

        final res = await repo.logout();

        expect(res, const Ok<void>(null));
        expect(storage.clearCalls, 1);
        expect(await storage.readToken(), isNull);
      });

      test('clear ném lỗi platform → Err(UnexpectedFailure)', () async {
        await storage.saveToken('jwt-123');
        storage.failOnClear = true;
        adapter.onPost('/api/auth/logout', (server) {
          server.reply(200, {'success': true, 'data': null});
        });

        final res = await repo.logout();

        // Lỗi storage cục bộ phải surface qua Result, không xuyên biên.
        expect(res.isOk, isFalse);
        expect((res as Err<void>).failure, isA<UnexpectedFailure>());
        expect(await storage.readToken(), 'jwt-123');
      });
    });
  });
}
