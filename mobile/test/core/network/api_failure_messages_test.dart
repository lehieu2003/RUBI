import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';

void main() {
  group('failureMessage', () {
    test('NetworkFailure → network message', () {
      expect(
        failureMessage(const NetworkFailure()),
        'Không có kết nối. Vui lòng thử lại.',
      );
    });

    test('AuthFailure 401 → session expired message', () {
      expect(
        failureMessage(const AuthFailure('Unauthorized', statusCode: 401)),
        'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.',
      );
    });

    test('AuthFailure 429 → too many attempts message', () {
      expect(
        failureMessage(const AuthFailure('Too many requests', statusCode: 429)),
        'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.',
      );
    });

    test('ServerFailure 429 → too many attempts message', () {
      expect(
        failureMessage(
          const ServerFailure('Too many requests', statusCode: 429),
        ),
        'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.',
      );
    });

    test('AuthFailure other → carries its own (server) message', () {
      const serverCopy = 'Email hoặc mật khẩu không đúng';
      expect(
        failureMessage(const AuthFailure(serverCopy)),
        serverCopy,
      );
    });

    test('ServerFailure other → carries its own (server) message', () {
      const serverCopy = 'Không tìm thấy đơn hàng';
      expect(
        failureMessage(const ServerFailure(serverCopy, statusCode: 404)),
        serverCopy,
      );
    });

    test('ValidationFailure → carries its own (validator) message', () {
      const validatorCopy = 'Số điện thoại không hợp lệ';
      expect(
        failureMessage(const ValidationFailure(validatorCopy)),
        validatorCopy,
      );
    });

    test('UnexpectedFailure → generic message (never leaks internals)', () {
      expect(
        failureMessage(const UnexpectedFailure('FormatException: ...')),
        'Có lỗi xảy ra. Vui lòng thử lại.',
      );
    });
  });

  group('Failure value equality (Equatable)', () {
    test('same message + statusCode are equal', () {
      expect(
        const AuthFailure('unauthorized', statusCode: 401),
        equals(const AuthFailure('unauthorized', statusCode: 401)),
      );
    });

    test('different statusCode are not equal', () {
      expect(
        const AuthFailure('unauthorized', statusCode: 401),
        isNot(equals(const AuthFailure('unauthorized'))),
      );
    });

    test('different subclasses are not equal', () {
      expect(
        const AuthFailure('x'),
        isNot(equals(const ValidationFailure('x'))),
      );
    });
  });
}
