import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/constants/api_constants.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';
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
/// - On a **403** with code `PASSWORD_CHANGE_REQUIRED`: emit
///   [AuthEvents.onPasswordChangeRequired] and pass the error on.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this._authStorage,
    required this._authEvents,
    Dio? refreshDio,
  }) : _refreshDio = refreshDio ??
            Dio(
              BaseOptions(
                baseUrl: ApiConstants.baseUrl,
                connectTimeout: ApiConstants.timeout,
                receiveTimeout: ApiConstants.timeout,
              ),
            );

  static const _refreshPath = '/api/auth/refresh';
  static const _excludedPaths = ['/api/auth/login', _refreshPath];
  static const _retriedExtraKey = 'retried';
  static const _passwordChangeRequiredCode = 'PASSWORD_CHANGE_REQUIRED';

  final AuthStorage _authStorage;
  final AuthEvents _authEvents;

  /// Plain Dio with no interceptors — used for both the refresh call and the
  /// single retry, so neither can re-enter this interceptor (no loops).
  /// Overridable for tests.
  final Dio _refreshDio;

  /// In-flight refresh shared by concurrent 401s (single-flight) so N
  /// simultaneous expirations fire one `POST /api/auth/refresh`, not N.
  Future<String?>? _inFlightRefresh;

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
    // The session is valid but the account must change its password first:
    // tell the app, and let the caller have the server's message as usual.
    if (_isPasswordChangeRequired(err)) _authEvents.emitPasswordChangeRequired();

    if (!_isRefreshable(err)) return handler.next(err);

    // Already retried once and still 401 — give up and log out.
    if (err.requestOptions.extra[_retriedExtraKey] == true) {
      await _forceLogout();
      return handler.next(err);
    }

    final currentStoredToken = await _authStorage.readToken();
    final requestToken =
        _extractBearerToken(err.requestOptions.headers['Authorization']);

    // If storage already has a fresher/different token than what this request used,
    // retry immediately with the fresh token without firing another refresh (FL-4).
    if (currentStoredToken != null &&
        requestToken != null &&
        currentStoredToken != requestToken) {
      final options = err.requestOptions
        ..extra[_retriedExtraKey] = true
        ..headers['Authorization'] = 'Bearer $currentStoredToken';
      try {
        final retryResponse = await _refreshDio.fetch<dynamic>(options);
        return handler.resolve(retryResponse);
      } on DioException catch (retryErr) {
        if (retryErr.response?.statusCode == 401) await _forceLogout();
        return handler.next(retryErr);
      } on Object {
        return handler.next(err);
      }
    }

    // First 401 — refresh once (single-flight), then retry the original
    // request once.
    final String? newToken;
    try {
      newToken = await _refreshToken();
    } on Object catch (e) {
      // Refresh failed — log out only when server explicitly rejected it (401/403).
      // Transient network timeouts / connection errors do not wipe credentials (FL-2).
      AppLogger.warning(
        'Token refresh failed: $e',
        tag: 'network',
      );
      if (e is DioException &&
          (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await _forceLogout();
      }
      return handler.next(err);
    }
    // Logged out or account switched while refresh was in flight:
    // do not write the token back, do not retry (FL-1).
    if (newToken == null) return handler.next(err);

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

  bool _isPasswordChangeRequired(DioException err) {
    if (err.response?.statusCode != 403) return false;
    final data = err.response?.data;
    return data is Map && data['code'] == _passwordChangeRequiredCode;
  }

  bool _isRefreshable(DioException err) {
    if (err.response?.statusCode != 401) return false;
    final path = err.requestOptions.path;
    return !_excludedPaths.any((excluded) => path.contains(excluded));
  }

  String? _extractBearerToken(dynamic authHeader) {
    if (authHeader is! String) return null;
    const prefix = 'Bearer ';
    if (authHeader.startsWith(prefix)) {
      return authHeader.substring(prefix.length).trim();
    }
    return null;
  }

  /// Concurrent 401s await the same shared refresh future; it is cleared on
  /// completion (success or failure) so the next expiry starts a fresh call.
  Future<String?> _refreshToken() {
    return _inFlightRefresh ??= _doRefreshToken().whenComplete(() {
      _inFlightRefresh = null;
    });
  }

  Future<String?> _doRefreshToken() async {
    final currentToken = await _authStorage.readToken();
    if (currentToken == null || currentToken.isEmpty) return null;

    final response = await _refreshDio.post<Map<String, dynamic>>(
      _refreshPath,
      options: Options(
        headers: {
          'Authorization': 'Bearer $currentToken',
        },
      ),
    );
    final data = response.data?['data'];
    final token = data is Map<String, dynamic> ? data['token'] as String? : null;
    if (token == null || token.isEmpty) {
      throw StateError('Refresh response did not contain a token');
    }

    // Đã đăng xuất hoặc đổi phiên (user khác đăng nhập) trong lúc chờ refresh:
    // không ghi đè token mới vào storage (FL-1).
    if (await _authStorage.readToken() != currentToken) {
      return null;
    }
    await _authStorage.saveToken(token);
    return token;
  }

  Future<void> _forceLogout() async {
    await _authStorage.clear();
    _authEvents.emitLogout();
  }
}
