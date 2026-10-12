import 'package:equatable/equatable.dart';

/// Base class for all domain failures.
///
/// User-facing (Vietnamese) copy is centralized in `api_failure_messages.dart`
/// via [failureMessage]; `message` fields carry server/validator-provided text.
sealed class Failure extends Equatable {
  const Failure();

  @override
  List<Object?> get props => [];
}

/// Authentication/authorization failure (401, invalid credentials...).
class AuthFailure extends Failure {
  const AuthFailure(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  List<Object?> get props => [message, statusCode];
}

/// No connection / timeout — the request never reached the server.
/// Its user-facing message is centralized (see [failureMessage]).
class NetworkFailure extends Failure {
  const NetworkFailure();
}

/// Server returned an error response (>= 500, 400/403/404...).
class ServerFailure extends Failure {
  const ServerFailure(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  List<Object?> get props => [message, statusCode];
}

/// Input validation failed; [message] is user-facing copy from the validator.
class ValidationFailure extends Failure {
  const ValidationFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

/// An unanticipated error (bug, unhandled exception); [message] is for
/// debugging, never shown to users (see [failureMessage]).
class UnexpectedFailure extends Failure {
  const UnexpectedFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
