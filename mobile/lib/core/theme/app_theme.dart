import 'package:flutter/material.dart';

/// Giao diện của app: cùng một màu gốc cho bản sáng và bản tối.
abstract final class AppTheme {
  static const _seed = Colors.blue;

  static ThemeData get light => ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: _seed),
      );

  static ThemeData get dark => ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: _seed,
          brightness: Brightness.dark,
        ),
      );
}
