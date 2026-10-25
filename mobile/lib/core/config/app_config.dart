import 'package:flutter/foundation.dart';

/// Build environment, chosen at compile time with
/// `--dart-define-from-file=config/<flavor>.json` (key `FLAVOR`).
enum AppFlavor { dev, prod }

/// Unknown or missing names resolve to [AppFlavor.dev] so a build without the
/// define can never silently behave as production.
AppFlavor parseFlavor(String name) =>
    name == 'prod' ? AppFlavor.prod : AppFlavor.dev;

/// Base URL a production build must never carry: the Android-emulator alias
/// of the local dev API.
const String devOnlyBaseUrl = 'http://10.0.2.2:3001';

/// Picks the API base URL for [flavor]:
/// - prod: only the compile-time [defined] value from config/prod.json —
///   a production APK never falls back to a dev URL;
/// - dev: [defined] when present (config/dev.json), else the emulator alias
///   so a plain `flutter run` keeps working.
/// A trailing slash is trimmed.
@visibleForTesting
String resolveBaseUrl({required AppFlavor flavor, required String defined}) {
  final value =
      defined.isEmpty && flavor == AppFlavor.dev ? devOnlyBaseUrl : defined;
  return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
}

/// A production build must carry its own API URL: missing or still the dev
/// alias means the release APK would call a phone's own localhost.
@visibleForTesting
bool prodUrlMissing({required AppFlavor flavor, required String baseUrl}) =>
    flavor == AppFlavor.prod &&
    (baseUrl.isEmpty || baseUrl == devOnlyBaseUrl);

class AppConfig {
  const AppConfig();

  static const String _flavorName = String.fromEnvironment(
    'FLAVOR',
    defaultValue: 'dev',
  );
  static const String _definedBaseUrl = String.fromEnvironment('API_BASE_URL');

  AppFlavor get flavor => parseFlavor(_flavorName);

  bool get isProd => flavor == AppFlavor.prod;

  String get baseUrl =>
      resolveBaseUrl(flavor: flavor, defined: _definedBaseUrl);

  bool get isProdUrlMissing =>
      prodUrlMissing(flavor: flavor, baseUrl: baseUrl);
}
