import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/config/app_config.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/error/failure_messages.dart';
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

      expect(client.options.baseUrl, AppConfig.apiBaseUrl);
      expect(client.options.contentType, Headers.jsonContentType);
      expect(client.options.headers['Accept'], Headers.jsonContentType);
      expect(client.interceptors.whereType<AuthInterceptor>().length, 1);
      client.close();
    });
  });

  group('mapDioError', () {
    RequestOptions opts(String path) => RequestOptions(path: path);

    test('connectionTimeout → NetworkFailure', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.connectionTimeout,
      );
      expect(mapDioError(err), const NetworkFailure());
    });

    test('receiveTimeout → NetworkFailure', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.receiveTimeout,
      );
      expect(mapDioError(err), const NetworkFailure());
    });

    test('500 có error trong body → ServerFailure message từ body', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 500,
          data: {'success': false, 'error': 'Internal server error'},
        ),
      );
      expect(
        mapDioError(err),
        const ServerFailure('Internal server error', statusCode: 500),
      );
    });

    test('400 không có error trong body → ServerFailure message mặc định', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 400,
          data: {'success': false},
        ),
      );
      expect(
        mapDioError(err),
        ServerFailure(FailureMessages.unexpected, statusCode: 400),
      );
    });

    test('401 không có body → AuthFailure với message mặc định', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 401,
        ),
      );
      expect(
        mapDioError(err),
        AuthFailure(FailureMessages.sessionExpired, statusCode: 401),
      );
    });

    test('401 serverMessage param ưu tiên hơn body', () {
      final err = DioException(
        requestOptions: opts('/x'),
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: opts('/x'),
          statusCode: 401,
          data: {'success': false, 'error': 'Token expired'},
        ),
      );
      expect(
        mapDioError(err, serverMessage: 'override'),
        const AuthFailure('override', statusCode: 401),
      );
    });

    test('error lạ → UnexpectedFailure', () {
      expect(
        mapDioError(StateError('boom')),
        isA<UnexpectedFailure>(),
      );
    });
  });
}
