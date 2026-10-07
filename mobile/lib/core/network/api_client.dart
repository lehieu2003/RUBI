import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/config/app_config.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/network/auth_interceptor.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';

/// Builds the app-wide [Dio] client wired with [AuthInterceptor].
///
/// Base URL comes from [AppConfig.apiBaseUrl]; requests and responses use
/// the JSON envelope (`{ "success": ..., "data"|"error": ... }`).
Dio createApiClient({
  required AuthStorage authStorage,
  required AuthEvents authEvents,
}) {
  return Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      contentType: Headers.jsonContentType,
      headers: {'Accept': Headers.jsonContentType},
    ),
  )..interceptors.add(
      AuthInterceptor(authStorage: authStorage, authEvents: authEvents),
    );
}
