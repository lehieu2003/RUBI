import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/extensions/search_text.dart';

void main() {
  test('foldVietnamese: chữ thường, bỏ mọi dấu, giữ số và khoảng trắng', () {
    expect(foldVietnamese('Quán Nhậu Gió Biển'), 'quan nhau gio bien');
    expect(foldVietnamese('ĐẠI LÝ NƯỚC NGỌT'), 'dai ly nuoc ngot');
    expect(foldVietnamese('Vựa Hải Sản Năm Căn 2'), 'vua hai san nam can 2');
    expect(foldVietnamese('KH-001'), 'kh-001');
    expect(foldVietnamese(''), '');
  });
}
