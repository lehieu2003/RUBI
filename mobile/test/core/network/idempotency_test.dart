import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/idempotency.dart';

void main() {
  group('newIdempotencyKey', () {
    test('là UUID v4, mỗi lần một mã khác', () {
      final uuid = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      );
      final keys = List.generate(50, (_) => newIdempotencyKey());
      expect(keys.every(uuid.hasMatch), isTrue);
      expect(keys.toSet(), hasLength(50));
    });
  });

  group('SubmissionKey', () {
    test('cùng số liệu → cùng mã; đổi số liệu → mã mới', () {
      var n = 0;
      final submission = SubmissionKey(() => 'k${++n}');

      expect(submission.keyFor((100000, 'tiền mặt')), 'k1');
      expect(submission.keyFor((100000, 'tiền mặt')), 'k1');
      expect(submission.keyFor((200000, 'tiền mặt')), 'k2');
      // Quay lại số cũ là một lần gửi khác.
      expect(submission.keyFor((100000, 'tiền mặt')), 'k3');
    });
  });

  group('idempotencyOptions', () {
    test('có mã → header Idempotency-Key; không mã → không có options', () {
      expect(idempotencyOptions('abc')!.headers, {'Idempotency-Key': 'abc'});
      expect(idempotencyOptions(null), isNull);
    });
  });
}
