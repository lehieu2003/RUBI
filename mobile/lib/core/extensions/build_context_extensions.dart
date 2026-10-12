import 'package:flutter/material.dart';

/// Lối tắt tới theme của [BuildContext].
extension BuildContextExtensions on BuildContext {
  ColorScheme get colorScheme => Theme.of(this).colorScheme;

  TextTheme get textTheme => Theme.of(this).textTheme;
}
