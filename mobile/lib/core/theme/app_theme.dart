import 'package:flutter/material.dart';

/// Giao diện của app.
abstract final class AppTheme {
  static ThemeData get light => ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      );
}
