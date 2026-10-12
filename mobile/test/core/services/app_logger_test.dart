import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';

void main() {
  test('AppLogger ghi được ở cả ba mức mà không ném lỗi', () {
    expect(() => AppLogger.info('mở app'), returnsNormally);
    expect(() => AppLogger.warning('mạng chậm', tag: 'network'), returnsNormally);
    expect(
      () => AppLogger.error('lưu email lỗi',
          error: StateError('x'), stackTrace: StackTrace.current),
      returnsNormally,
    );
  });
}
