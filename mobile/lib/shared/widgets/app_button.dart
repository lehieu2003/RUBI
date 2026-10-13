import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';

/// Mức nhấn của một [AppButton].
enum AppButtonVariant {
  /// Việc chính của màn / bảng: nền đặc.
  primary,

  /// Việc phụ đứng cạnh việc chính: viền.
  secondary,

  /// Việc ít dùng: chỉ chữ.
  text,
}

/// Nút bấm của app: rộng hết chỗ, cao 48dp cho dễ bấm.
///
/// [loading] khoá nút và thay icon bằng vòng xoay; [danger] tô màu lỗi cho
/// việc không hoàn tác được (huỷ đơn...).
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.loading = false,
    this.danger = false,
    super.key,
  });

  final String label;

  /// `null` → nút bị khoá.
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool loading;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final onTap = loading ? null : onPressed;
    const minimumSize = Size.fromHeight(48);
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (loading)
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          )
        else if (icon != null)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Icon(icon, size: 20),
          ),
        Flexible(
          child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
      ],
    );
    return switch (variant) {
      AppButtonVariant.primary => FilledButton(
          onPressed: onTap,
          style: FilledButton.styleFrom(
            minimumSize: minimumSize,
            backgroundColor: danger ? colorScheme.error : null,
            foregroundColor: danger ? colorScheme.onError : null,
          ),
          child: child,
        ),
      AppButtonVariant.secondary => OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            minimumSize: minimumSize,
            foregroundColor: danger ? colorScheme.error : null,
          ),
          child: child,
        ),
      AppButtonVariant.text => TextButton(
          onPressed: onTap,
          style: TextButton.styleFrom(
            minimumSize: minimumSize,
            foregroundColor: danger ? colorScheme.error : null,
          ),
          child: child,
        ),
    };
  }
}
