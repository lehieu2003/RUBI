import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:injectable/injectable.dart';

/// Giao diện sáng / tối của app: theo máy (mặc định), luôn sáng, hoặc luôn
/// tối. Lựa chọn được nhớ trên máy qua [AppPreferences].
@lazySingleton
class ThemeCubit extends Cubit<ThemeMode> {
  ThemeCubit({required this._preferences}) : super(ThemeMode.system);

  final AppPreferences _preferences;

  /// Đọc lựa chọn đã lưu. Gọi một lần lúc mở app, trước khung hình đầu tiên.
  /// Chưa lưu, giá trị lạ, hoặc không đọc được → theo máy.
  Future<void> load() async {
    try {
      final saved = await _preferences.readThemeMode();
      if (isClosed) return;
      emit(_fromName(saved));
    } on Object catch (e) {
      AppLogger.warning('Could not read the theme mode: $e', tag: 'theme');
    }
  }

  /// Đổi giao diện ngay và nhớ lựa chọn. Không lưu được thì lựa chọn vẫn có
  /// hiệu lực tới khi đóng app.
  Future<void> select(ThemeMode mode) async {
    emit(mode);
    try {
      await _preferences.saveThemeMode(mode.name);
    } on Object catch (e) {
      AppLogger.warning('Could not save the theme mode: $e', tag: 'theme');
    }
  }

  static ThemeMode _fromName(String? name) {
    for (final mode in ThemeMode.values) {
      if (mode.name == name) return mode;
    }
    return ThemeMode.system;
  }
}
