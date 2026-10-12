import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';

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
