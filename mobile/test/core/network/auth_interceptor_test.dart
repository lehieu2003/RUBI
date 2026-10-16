import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/constants/api_constants.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_client.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/network/auth_interceptor.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';

/// In-memory [AuthStorage] fake with call counters.
class _FakeAuthStorage implements AuthStorage {
  String? _token;
  int clearCalls = 0;

  @override
  Future<void> clear() async {
    clearCalls++;
    _token = null;
  }

  @override
  Future<String?> readToken() async => _token;

  @override
  Future<void> saveToken(String token) async => _token = token;
}

void main() {
  group('AuthInterceptor', () {
    late _FakeAuthStorage storage;
    late AuthEvents authEvents;
    late Dio dio;
    late Dio refreshDio;
    late DioAdapter mainAdapter;
    late DioAdapter refreshAdapter;
    var logoutCount = 0;

    setUp(() {
      storage = _FakeAuthStorage();
      authEvents = AuthEvents();
      logoutCount = 0;
      authEvents.onLogout.listen((_) => logoutCount++);

      // The interceptor under test is attached to [dio]; [refreshDio] is the
      // separate plain instance (no interceptors) used for refresh + retry.
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      mainAdapter = DioAdapter(dio: dio);

      refreshDio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      refreshAdapter = DioAdapter(dio: refreshDio);

      dio.interceptors.add(
        AuthInterceptor(
          authStorage: storage,
          authEvents: authEvents,
          refreshDio: refreshDio,
        ),
      );
    });

    tearDown(() async {
      dio.close();
      refreshDio.close();
      await authEvents.dispose();
    });

    test('gắn Bearer token khi storage có token', () async {
      await storage.saveToken('token-123');
      String? capturedAuth;
      mainAdapter.onGet('/api/deliveries', (server) {
        server.replyCallback(200, (options) {
          capturedAuth = options.headers['Authorization'] as String?;
          return {
            'success': true,
            'data': {'deliveries': []},
          };
        });
      });

      final res = await dio.get('/api/deliveries');

      expect(res.statusCode, 200);
      expect(capturedAuth, 'Bearer token-123');
    });

    test('không gắn Authorization khi storage rỗng', () async {
      String? capturedAuth;
      mainAdapter.onGet('/api/deliveries', (server) {
        server.replyCallback(200, (options) {
          capturedAuth = options.headers['Authorization'] as String?;
          return {'success': true, 'data': []};
        });
      });

      await dio.get('/api/deliveries');

      expect(capturedAuth, isNull);
    });

    test('401 → refresh 1 lần → retry với token mới → thành công', () async {
      await storage.saveToken('expired-token');
      var refreshCalls = 0;
      String? refreshAuth;
      String? retryAuth;

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });

      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.replyCallback(200, (options) {
          refreshCalls++;
          refreshAuth = options.headers['Authorization'] as String?;
          return {
            'success': true,
            'data': {'token': 'new-token'},
          };
        });
      });

      refreshAdapter.onGet('/api/deliveries', (server) {
        server.replyCallback(200, (options) {
          retryAuth = options.headers['Authorization'] as String?;
          return {
            'success': true,
            'data': {'deliveries': []},
          };
        });
      });

      final res = await dio.get('/api/deliveries');

      expect(res.statusCode, 200);
      expect(refreshCalls, 1);
      expect(refreshAuth, 'Bearer expired-token');
      expect(retryAuth, 'Bearer new-token');
      expect(await storage.readToken(), 'new-token');
      expect(logoutCount, 0);
    });

    test('401 + refresh 401 → clear storage + emitLogout', () async {
      await storage.saveToken('expired-token');

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.reply(401, {'success': false, 'error': 'Invalid token'});
      });

      await expectLater(
        dio.get<void>('/api/deliveries'),
        throwsA(isA<DioException>()),
      );

      expect(storage.clearCalls, 1);
      expect(logoutCount, 1);
      expect(await storage.readToken(), isNull);
    });

    test('retry xong vẫn 401 → clear + emitLogout, không refresh lần 2',
        () async {
      await storage.saveToken('expired-token');
      var refreshCalls = 0;

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.replyCallback(200, (options) {
          refreshCalls++;
          return {
            'success': true,
            'data': {'token': 'new-token'},
          };
        });
      });
      refreshAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });

      await expectLater(
        dio.get<void>('/api/deliveries'),
        throwsA(isA<DioException>()),
      );

      expect(refreshCalls, 1); // exactly one refresh — never a second
      expect(storage.clearCalls, 1);
      expect(logoutCount, 1);
    });

    test('refresh OK nhưng retry lỗi kết nối → không clear, không emitLogout',
        () async {
      await storage.saveToken('expired-token');

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.reply(200, {
          'success': true,
          'data': {'token': 'new-token'},
        });
      });
      refreshAdapter.onGet('/api/deliveries', (server) {
        server.throws(
          0,
          DioException(
            requestOptions: RequestOptions(path: '/api/deliveries'),
            type: DioExceptionType.connectionError,
            error: 'connection refused',
          ),
        );
      });

      Object? caught;
      try {
        await dio.get<void>('/api/deliveries');
      } catch (e) {
        caught = e;
      }

      // The retry's own error surfaces — not a logout.
      expect(caught, isA<DioException>());
      expect(mapDioError(caught!), isA<NetworkFailure>());
      expect(storage.clearCalls, 0);
      expect(logoutCount, 0);
      expect(await storage.readToken(), 'new-token');
    });

    test('đăng xuất trong lúc đang refresh → không lưu token mới trở lại, '
        'không retry', () async {
      await storage.saveToken('expired-token');
      var retryCalls = 0;

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.replyCallback(200, (options) {
          // Người dùng bấm đăng xuất khi refresh còn đang bay.
          storage.clear();
          return {
            'success': true,
            'data': {'token': 'new-token'},
          };
        });
      });
      refreshAdapter.onGet('/api/deliveries', (server) {
        server.replyCallback(200, (options) {
          retryCalls++;
          return {'success': true, 'data': {'deliveries': []}};
        });
      });

      await expectLater(
        dio.get<void>('/api/deliveries'),
        throwsA(isA<DioException>()),
      );

      expect(await storage.readToken(), isNull);
      expect(retryCalls, 0);
    });

    test('hai 401 đồng thời → refresh chỉ gọi 1 lần, cả hai được retry',
        () async {
      await storage.saveToken('expired-token');
      var refreshCalls = 0;

      mainAdapter.onGet('/api/deliveries', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      mainAdapter.onGet('/api/orders', (server) {
        server.reply(401, {'success': false, 'error': 'Token expired'});
      });
      refreshAdapter.onPost('/api/auth/refresh', (server) {
        server.replyCallback(200, (options) {
          refreshCalls++;
          return {
            'success': true,
            'data': {'token': 'new-token'},
          };
        });
      });
      refreshAdapter.onGet('/api/deliveries', (server) {
        server.reply(200, {'success': true, 'data': {'deliveries': []}});
      });
      refreshAdapter.onGet('/api/orders', (server) {
        server.reply(200, {'success': true, 'data': {'orders': []}});
      });

      final responses = await Future.wait([
        dio.get<void>('/api/deliveries'),
        dio.get<void>('/api/orders'),
      ]);

      expect(responses, hasLength(2));
      expect(refreshCalls, 1); // single-flight: one shared refresh
      expect(logoutCount, 0);
      expect(await storage.readToken(), 'new-token');
    });

    test('403 PASSWORD_CHANGE_REQUIRED → báo app phải đổi mật khẩu; giữ token, '
        'không đăng xuất, lỗi vẫn tới nơi gọi', () async {
      await storage.saveToken('token');
      var passwordChangeCount = 0;
      authEvents.onPasswordChangeRequired.listen((_) => passwordChangeCount++);
      mainAdapter.onGet('/api/driver/orders', (server) {
        server.reply(403, {
          'success': false,
          'error': 'Bạn cần đổi mật khẩu trước khi tiếp tục',
          'code': 'PASSWORD_CHANGE_REQUIRED',
        });
      });

      Object? caught;
      try {
        await dio.get<void>('/api/driver/orders');
      } catch (e) {
        caught = e;
      }
      await Future<void>.delayed(Duration.zero);

      expect(passwordChangeCount, 1);
      expect(logoutCount, 0);
      expect(await storage.readToken(), 'token');
      expect(
        mapDioError(caught!),
        const ServerFailure('Bạn cần đổi mật khẩu trước khi tiếp tục', statusCode: 403),
      );
    });

    test('403 khác (không đủ quyền) → không báo đổi mật khẩu', () async {
      var passwordChangeCount = 0;
      authEvents.onPasswordChangeRequired.listen((_) => passwordChangeCount++);
      mainAdapter.onGet('/api/orders', (server) {
        server.reply(403, {
          'success': false,
          'error': 'Bạn không có quyền thực hiện thao tác này',
        });
      });

      await expectLater(dio.get<void>('/api/orders'), throwsA(isA<DioException>()));
      await Future<void>.delayed(Duration.zero);

      expect(passwordChangeCount, 0);
      expect(logoutCount, 0);
    });

    test('ConnectionError → mapDioError ra NetworkFailure', () async {
      mainAdapter.onGet('/api/deliveries', (server) {
        server.throws(
          0,
          DioException(
            requestOptions: RequestOptions(path: '/api/deliveries'),
            type: DioExceptionType.connectionError,
            error: 'connection refused',
          ),
        );
      });

      Object? caught;
      try {
        await dio.get<void>('/api/deliveries');
      } catch (e) {
        caught = e;
      }

      expect(caught, isA<DioException>());
      expect(mapDioError(caught!), isA<NetworkFailure>());
      expect(logoutCount, 0); // non-401 errors must not force a logout
    });

    test('createApiClient dựng baseUrl, JSON headers và AuthInterceptor', () {
      final client = createApiClient(
        authStorage: _FakeAuthStorage(),
        authEvents: AuthEvents(),
      );

      expect(client.options.baseUrl, ApiConstants.baseUrl);
      expect(client.options.contentType, Headers.jsonContentType);
      expect(client.options.headers['Accept'], Headers.jsonContentType);
      expect(client.interceptors.whereType<AuthInterceptor>().length, 1);
      client.close();
    });
  });
}
