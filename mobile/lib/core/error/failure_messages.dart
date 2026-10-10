import 'package:iceflow_mobile/core/error/failure.dart';

/// User-facing (Vietnamese) failure copy — single source of truth.
abstract final class FailureMessages {
  static const network = 'Không có kết nối. Vui lòng thử lại.';
  static const tooManyAttempts = 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.';
  static const sessionExpired = 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.';
  static const unexpected = 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/// Maps a [Failure] to the message shown to the user.
///
/// Type/status-level copy is centralized here; failures whose `message` is
/// already user-facing (server error body, validator output) pass through.
String failureMessage(Failure failure) {
  return switch (failure) {
    NetworkFailure() => FailureMessages.network,
    AuthFailure(:final statusCode) when statusCode == 429 => FailureMessages.tooManyAttempts,
    AuthFailure(:final statusCode) when statusCode == 401 => FailureMessages.sessionExpired,
    AuthFailure(:final message) => message,
    ServerFailure(:final statusCode) when statusCode == 429 => FailureMessages.tooManyAttempts,
    ServerFailure(:final message) => message,
    ValidationFailure(:final message) => message,
    UnexpectedFailure() => FailureMessages.unexpected,
  };
}
