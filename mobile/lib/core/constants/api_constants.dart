import '../config/app_config.dart';

/// Compile-time settings of the IceFlow API the app talks to.
abstract final class ApiConstants {
  /// Base URL of the IceFlow API, from the build flavor
  /// (`--dart-define-from-file=config/<flavor>.json`, key `API_BASE_URL`).
  static String get baseUrl => const AppConfig().baseUrl;

  /// Connect and receive timeout of every request.
  static const timeout = Duration(seconds: 15);
}
