import 'package:flutter/material.dart';

/// Báo kết quả một thao tác ở đáy màn hình.
extension AppSnackBars on ScaffoldMessengerState {
  /// Thay câu báo đang hiện bằng [message]. Thao tác thất bại thì truyền
  /// [errorColor] (màu lỗi của theme, lấy trước `await`).
  void showMessage(String message, {Color? errorColor}) {
    this
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(message), backgroundColor: errorColor),
      );
  }
}
