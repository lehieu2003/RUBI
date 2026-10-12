import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/features/auth/domain/password_policy.dart';

void main() {
  group('PasswordPolicy (giống src/lib/password.ts của server)', () {
    test('đạt: từ 8 ký tự, có chữ và số — chữ có dấu cũng là chữ', () {
      expect(PasswordPolicy.validate('Matkhau2026'), isNull);
      expect(PasswordPolicy.validate('đáviên12'), isNull);
    });

    test('ngắn hơn 8 hoặc dài hơn 72 ký tự', () {
      expect(PasswordPolicy.validate('abc1234'), 'Mật khẩu phải có ít nhất 8 ký tự');
      expect(PasswordPolicy.validate('a1' * 37), 'Mật khẩu tối đa 72 ký tự');
    });

    test('thiếu chữ hoặc thiếu số', () {
      expect(PasswordPolicy.validate('123456789'), 'Mật khẩu phải gồm cả chữ và số');
      expect(PasswordPolicy.validate('matkhaumoi'), 'Mật khẩu phải gồm cả chữ và số');
    });
  });
}
