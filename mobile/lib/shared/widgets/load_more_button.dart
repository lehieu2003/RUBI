import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';

/// Nút "Xem thêm" ở cuối một danh sách phân trang; [loading] thì thay bằng
/// vòng xoay trong lúc trang kế tiếp đang về.
class LoadMoreButton extends StatelessWidget {
  const LoadMoreButton({
    required this.loading,
    required this.onPressed,
    super.key,
  });

  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: loading
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(8),
                child: CircularProgressIndicator(),
              ),
            )
          : TextButton(
              onPressed: onPressed,
              style: TextButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              child: const Text(AppStrings.loadMoreButton),
            ),
    );
  }
}
