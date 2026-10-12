import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';

void main() {
  group('MappingValidator', () {
    test('nonEmpty: trim, thiếu hoặc rỗng → null', () {
      expect(MappingValidator.nonEmpty('  Đá Bi '), 'Đá Bi');
      expect(MappingValidator.nonEmpty('   '), isNull);
      expect(MappingValidator.nonEmpty(null), isNull);
    });

    test('dateTime: ISO → DateTime, thiếu hoặc hỏng → null', () {
      expect(MappingValidator.dateTime('2026-10-11T02:37:32.721Z'),
          DateTime.utc(2026, 10, 11, 2, 37, 32, 721));
      expect(MappingValidator.dateTime('hôm qua'), isNull);
      expect(MappingValidator.dateTime(null), isNull);
    });

    test('missing: cùng câu chữ các mapper đang dùng', () {
      expect(MappingValidator.missing('Order', 'customer.name'),
          const UnexpectedFailure('Order payload missing `customer.name`'));
    });
  });
}
