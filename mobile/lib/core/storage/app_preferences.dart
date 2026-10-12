import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Tuỳ chọn KHÔNG nhạy cảm của app, lưu bằng shared_preferences.
///
/// Token đăng nhập không nằm ở đây — nó ở [AuthStorage] (secure storage).
@lazySingleton
class AppPreferences {
  AppPreferences(this._prefs);

  static const _lastEmailKey = 'last_email';
  static const _themeModeKey = 'theme_mode';

  final SharedPreferencesAsync _prefs;

  /// Email của lần đăng nhập thành công gần nhất, để điền sẵn màn đăng nhập.
  Future<String?> readLastEmail() => _prefs.getString(_lastEmailKey);

  Future<void> saveLastEmail(String email) =>
      _prefs.setString(_lastEmailKey, email);

  /// Giao diện người dùng đã chọn (`system`, `light`, `dark`); `null` khi
  /// chưa chọn.
  Future<String?> readThemeMode() => _prefs.getString(_themeModeKey);

  Future<void> saveThemeMode(String mode) =>
      _prefs.setString(_themeModeKey, mode);
}
