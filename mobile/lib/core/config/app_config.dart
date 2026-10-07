/// App-wide compile-time configuration.
class AppConfig {
  const AppConfig._();

  /// Base URL of the IceFlow API.
  ///
  /// Default points to the Android emulator alias for the local dev API
  /// (`localhost` on the host machine). Override at build time with:
  /// `flutter build apk --dart-define=API_BASE_URL=https://...`
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );
}
