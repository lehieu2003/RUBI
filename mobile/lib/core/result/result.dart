import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/core/error/failure.dart';

/// A value-or-failure result, used instead of throwing across layers.
sealed class Result<T> extends Equatable {
  const Result();

  bool get isOk => this is Ok<T>;

  /// Patterns the result: [ok] for success, [err] for failure.
  R when<R>({
    required R Function(T value) ok,
    required R Function(Failure failure) err,
  }) {
    return switch (this) {
      Ok<T>(:final value) => ok(value),
      Err<T>(:final failure) => err(failure),
    };
  }
}

/// Success case, carrying [value].
class Ok<T> extends Result<T> {
  const Ok(this.value);

  final T value;

  @override
  List<Object?> get props => [value];
}

/// Failure case, carrying [failure].
class Err<T> extends Result<T> {
  const Err(this.failure);

  final Failure failure;

  @override
  List<Object?> get props => [failure];
}
