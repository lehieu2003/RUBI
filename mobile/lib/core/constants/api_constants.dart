/// Compile-time settings of the IceFlow API the app talks to.
abstract final class ApiConstants {
  /// Base URL of the IceFlow API.
  ///
  /// Default points to the Android emulator alias for the local dev API
  /// (`localhost` on the host machine). Override at build time with:
  /// `flutter build apk --dart-define=API_BASE_URL=https://...`
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  /// Connect and receive timeout of every request.
  static const timeout = Duration(seconds: 15);
}
