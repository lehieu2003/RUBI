import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/config/app_config.dart';

void main() {
  group('parseFlavor', () {
    test('prod → AppFlavor.prod', () {
      expect(parseFlavor('prod'), AppFlavor.prod);
    });

    test('thiếu hoặc tên lạ → dev để không bao giờ thành prod ngầm', () {
      expect(parseFlavor('dev'), AppFlavor.dev);
      expect(parseFlavor(''), AppFlavor.dev);
      expect(parseFlavor('staging'), AppFlavor.dev);
    });
  });

  group('resolveBaseUrl', () {
    test('prod chỉ dùng giá trị compile-time, không fallback URL dev', () {
      expect(
        resolveBaseUrl(
          flavor: AppFlavor.prod,
          defined: 'https://iceflow.example.com',
        ),
        'https://iceflow.example.com',
      );
      expect(resolveBaseUrl(flavor: AppFlavor.prod, defined: ''), '');
    });

    test('dev không có define → alias emulator để flutter run thường vẫn chạy', () {
      expect(resolveBaseUrl(flavor: AppFlavor.dev, defined: ''), devOnlyBaseUrl);
    });

    test('cắt dấu / cuối', () {
      expect(
        resolveBaseUrl(flavor: AppFlavor.dev, defined: 'http://10.0.2.2:3001/'),
        'http://10.0.2.2:3001',
      );
    });
  });

  group('prodUrlMissing', () {
    test('prod thiếu URL hoặc còn là URL dev là lỗi build', () {
      expect(prodUrlMissing(flavor: AppFlavor.prod, baseUrl: ''), isTrue);
      expect(
        prodUrlMissing(flavor: AppFlavor.prod, baseUrl: devOnlyBaseUrl),
        isTrue,
      );
    });

    test('prod có URL thật thì ổn; dev không bao giờ chặn', () {
      expect(
        prodUrlMissing(
          flavor: AppFlavor.prod,
          baseUrl: 'https://iceflow.example.com',
        ),
        isFalse,
      );
      expect(prodUrlMissing(flavor: AppFlavor.dev, baseUrl: ''), isFalse);
      expect(
        prodUrlMissing(flavor: AppFlavor.dev, baseUrl: devOnlyBaseUrl),
        isFalse,
      );
    });
  });
}
