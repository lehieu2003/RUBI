import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';

void main() {
  group('Result.isOk', () {
    test('true for Ok, false for Err', () {
      expect(const Ok<int>(5).isOk, isTrue);
      expect(const Err<int>(AuthFailure('unauthorized')).isOk, isFalse);
    });
  });

  group('Result.when', () {
    test('Ok → calls ok with the value', () {
      const Result<int> result = Ok(5);

      final out = result.when(
        ok: (value) => 'value=$value',
        err: (failure) => 'error',
      );

      expect(out, 'value=5');
    });

    test('Err → calls err with the failure', () {
      const Result<int> result = Err(AuthFailure('unauthorized', statusCode: 401));

      final out = result.when(
        ok: (value) => 'value=$value',
        err: (failure) => '${failure.runtimeType}',
      );

      expect(out, 'AuthFailure');
    });

    test('ok and err may return a different type than the value', () {
      const Result<String> result = Err(NetworkFailure());

      final out = result.when(
        ok: (value) => value.length,
        err: (failure) => -1,
      );

      expect(out, -1);
    });
  });

  group('Result value equality (Equatable)', () {
    test('Ok with same value are equal', () {
      expect(const Ok<int>(5), equals(const Ok<int>(5)));
      expect(const Ok<int>(5), isNot(equals(const Ok<int>(6))));
    });

    test('Err with equal failures are equal', () {
      expect(
        const Err<int>(NetworkFailure()),
        equals(const Err<int>(NetworkFailure())),
      );
    });

    test('Ok and Err are never equal', () {
      expect(
        const Ok<int>(5),
        isNot(equals(const Err<int>(AuthFailure('5')))),
      );
    });
  });
}
