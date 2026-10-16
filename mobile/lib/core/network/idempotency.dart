import 'dart:math';

import 'package:dio/dio.dart';

/// Header chống ghi trùng của các lệnh cộng dồn (thu tiền, ghi thêm vỏ, nhập
/// mẻ): một mã ngẫu nhiên cho mỗi lần gửi, gửi lại đúng lần đó thì dùng lại
/// mã. Server thấy mã đã ghi thì trả lại câu trả lời cũ, không ghi lần nữa.
const idempotencyHeader = 'Idempotency-Key';

final _random = Random.secure();

/// Một UUID v4 ngẫu nhiên.
String newIdempotencyKey() {
  final bytes = List<int>.generate(16, (_) => _random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
}

/// Options của Dio mang [key]; null khi không có mã (gửi như cũ).
Options? idempotencyOptions(String? key) =>
    key == null ? null : Options(headers: {idempotencyHeader: key});

/// Mã của một sheet/hộp nhập: tạo khi bấm lưu, giữ đến khi đóng sheet. Bấm
/// lưu lại với cùng số liệu (sau một lỗi) dùng lại mã đó; đổi số liệu là một
/// lần gửi khác nên có mã mới (server từ chối một mã dùng cho số liệu khác).
class SubmissionKey {
  SubmissionKey([String Function()? generate])
      : _generate = generate ?? newIdempotencyKey;

  final String Function() _generate;
  Object? _payload;
  String? _key;

  /// Mã cho [payload] (so sánh bằng `==`, ví dụ một record của các trường).
  String keyFor(Object payload) {
    if (_key == null || payload != _payload) {
      _payload = payload;
      _key = _generate();
    }
    return _key!;
  }
}
