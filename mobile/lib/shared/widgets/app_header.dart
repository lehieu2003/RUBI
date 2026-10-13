import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';

/// Thanh đầu của mọi màn hình: nền chuyển màu theo màu chủ đạo, bo hai góc
/// dưới, tiêu đề đậm và (tuỳ màn) một dòng mô tả bên dưới. Dùng ở
/// `Scaffold.appBar`; nút quay lại tự hiện khi màn được mở chồng lên màn khác.
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppHeader({
    required this.title,
    this.subtitle,
    this.actions,
    super.key,
  });

  final String title;

  /// Một dòng nói màn này để làm gì; `null` thì thanh thấp hơn.
  final String? subtitle;
  final List<Widget>? actions;

  @override
  Size get preferredSize => Size.fromHeight(subtitle == null ? 60 : 76);

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final dark = colorScheme.brightness == Brightness.dark;
    // Bản tối dùng tông trầm: nền sáng rực trên màn tối gây chói.
    final start = dark ? colorScheme.primaryContainer : colorScheme.primary;
    final end = Color.lerp(
      start,
      dark ? colorScheme.surface : colorScheme.tertiary,
      0.45,
    )!;
    final foreground =
        dark ? colorScheme.onPrimaryContainer : colorScheme.onPrimary;

    return AppBar(
      toolbarHeight: preferredSize.height,
      // Quyết định màu chữ thanh trạng thái của máy.
      backgroundColor: start,
      foregroundColor: foreground,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      clipBehavior: Clip.antiAlias,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
      ),
      flexibleSpace: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [start, end],
          ),
        ),
      ),
      title: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.titleLarge?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (subtitle != null)
            Text(
              subtitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodySmall?.copyWith(
                color: foreground.withValues(alpha: 0.85),
              ),
            ),
        ],
      ),
      actions: actions,
    );
  }
}
