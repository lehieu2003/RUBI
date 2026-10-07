import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/config/app_config.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/error/failure_messages.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';

/// Refreshes an expired token once per request and forces a logout when
/// that is not enough.
///
/// Rules (per the API contract):
/// - Attaches `Authorization: Bearer <token>` when a token is stored.
/// - On a **401** (except requests to `/api/auth/login` and
///   `/api/auth/refresh`): if the request was not retried yet, call
///   `POST /api/auth/refresh` once, save the new token, retry the original
///   request once; otherwise (refresh failed, or the retry was still 401)
///   clear the stored token, emit [AuthEvents.onLogout] and pass the error on.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this._authStorage,
    required this._authEvents,
    Dio? refreshDio,
  }) : _refreshDio = refreshDio ??
            Dio(
              BaseOptions(
                baseUrl: AppConfig.apiBaseUrl,
                connectTimeout: _timeout,
                receiveTimeout: _timeout,
              ),
            );

  static const _refreshPath = '/api/auth/refresh';
  static const _excludedPaths = ['/api/auth/login', _refreshPath];
  static const _retriedExtraKey = 'retried';
  static const _timeout = Duration(seconds: 15);

  final AuthStorage _authStorage;
  final AuthEvents _authEvents;

  /// Plain Dio with no interceptors — used for both the refresh call and the
  /// single retry, so neither can re-enter this interceptor (no loops).
  /// Overridable for tests.
  final Dio _refreshDio;

  /// In-flight refresh shared by concurrent 401s (single-flight) so N
  /// simultaneous expirations fire one `POST /api/auth/refresh`, not N.
  Future<String>? _inFlightRefresh;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _authStorage.readToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (!_isRefreshable(err)) return handler.next(err);

    // Already retried once and still 401 — give up and log out.
    if (err.requestOptions.extra[_retriedExtraKey] == true) {
      await _forceLogout();
      return handler.next(err);
    }

    // First 401 — refresh once (single-flight), then retry the original
    // request once.
    final String newToken;
    try {
      newToken = await _refreshToken();
    } on Object {
      // Refresh failed — the session is unrecoverable: log out.
      await _forceLogout();
      return handler.next(err);
    }
    await _authStorage.saveToken(newToken);

    final options = err.requestOptions
      ..extra[_retriedExtraKey] = true
      ..headers['Authorization'] = 'Bearer $newToken';

    try {
      final retryResponse = await _refreshDio.fetch<dynamic>(options);
      return handler.resolve(retryResponse);
    } on DioException catch (retryErr) {
      // Retried once and still unauthorized — give up and log out. Any other
      // retry failure (network, 5xx...) keeps the fresh, still-valid token.
      if (retryErr.response?.statusCode == 401) await _forceLogout();
      return handler.next(retryErr);
    } on Object {
      // Non-HTTP retry failure — no logout; surface the original 401.
      return handler.next(err);
    }
  }

  bool _isRefreshable(DioException err) {
    if (err.response?.statusCode != 401) return false;
    final path = err.requestOptions.path;
    return !_excludedPaths.any((excluded) => path.contains(excluded));
  }

  /// Concurrent 401s await the same shared refresh future; it is cleared on
  /// completion (success or failure) so the next expiry starts a fresh call.
  Future<String> _refreshToken() {
    return _inFlightRefresh ??= _doRefreshToken().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<String> _doRefreshToken() async {
    final currentToken = await _authStorage.readToken();
    final response = await _refreshDio.post<Map<String, dynamic>>(
      _refreshPath,
      options: Options(
        headers: {
          if (currentToken != null && currentToken.isNotEmpty)
            'Authorization': 'Bearer $currentToken',
        },
      ),
    );
    final data = response.data?['data'];
    final token = data is Map<String, dynamic> ? data['token'] as String? : null;
    if (token == null || token.isEmpty) {
      throw StateError('Refresh response did not contain a token');
    }
    return token;
  }

  Future<void> _forceLogout() async {
    await _authStorage.clear();
    _authEvents.emitLogout();
  }
}

/// Central DioException → [Failure] mapping.
///
/// [serverMessage] overrides the message extracted from the error response
/// body when the caller already has it; otherwise the `{ "error": "..." }`
/// field of the API error envelope is used, falling back to generic copy.
Failure mapDioError(Object error, {String? serverMessage}) {
  if (error is! DioException) {
    return UnexpectedFailure(error.toString());
  }

  switch (error.type) {
    case DioExceptionType.connectionError:
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.transformTimeout:
      return const NetworkFailure();

    case DioExceptionType.badResponse:
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) {
        return AuthFailure(
          serverMessage ??
              _serverErrorMessage(error.response) ??
              FailureMessages.sessionExpired,
          statusCode: 401,
        );
      }
      return ServerFailure(
        serverMessage ??
            _serverErrorMessage(error.response) ??
            FailureMessages.unexpected,
        statusCode: statusCode,
      );

    case DioExceptionType.badCertificate:
    case DioExceptionType.cancel:
    case DioExceptionType.unknown:
      return UnexpectedFailure(error.toString());
  }
}

/// Extracts the `error` field from the API error envelope
/// `{ "success": false, "error": "..." }`, if present.
String? _serverErrorMessage(Response? response) {
  final data = response?.data;
  if (data is Map) {
    final error = data['error'];
    if (error is String && error.isNotEmpty) return error;
  }
  return null;
}
