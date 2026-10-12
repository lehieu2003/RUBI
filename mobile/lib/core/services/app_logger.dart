import 'dart:developer' as developer;

/// Ghi log của app qua `dart:developer` (hiện trong DevTools / console khi
/// debug; không in gì ra cho người dùng).
abstract final class AppLogger {
  static void info(String message, {String tag = 'app'}) =>
      developer.log(message, name: tag, level: 800);

  static void warning(String message, {String tag = 'app'}) =>
      developer.log(message, name: tag, level: 900);

  static void error(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    String tag = 'app',
  }) =>
      developer.log(
        message,
        name: tag,
        level: 1000,
        error: error,
        stackTrace: stackTrace,
      );
}
