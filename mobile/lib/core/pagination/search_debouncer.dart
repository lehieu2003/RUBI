import 'dart:async';

/// Chờ người dùng ngừng gõ rồi mới chạy tìm kiếm: mỗi lần [run] huỷ lần
/// đang chờ trước đó.
class SearchDebouncer {
  SearchDebouncer({this.delay = const Duration(milliseconds: 300)});

  final Duration delay;
  Timer? _timer;

  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(delay, action);
  }

  /// Huỷ lần đang chờ (gọi khi màn hình đóng).
  void dispose() => _timer?.cancel();
}
