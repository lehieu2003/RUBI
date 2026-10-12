import 'dart:async';

import 'package:injectable/injectable.dart';

/// Broadcast channel for auth lifecycle events.
///
/// The network layer emits on [onLogout] when a session is forcibly ended
/// (token refresh failed, or a retried request was still unauthorized);
/// the session Bloc listens to route the user back to login.
@singleton
class AuthEvents {
  final StreamController<void> _controller =
      StreamController<void>.broadcast();

  /// Emits whenever the session ends unexpectedly.
  Stream<void> get onLogout => _controller.stream;

  /// Signals that the user must be logged out.
  void emitLogout() => _controller.add(null);

  final StreamController<void> _passwordChangeController =
      StreamController<void>.broadcast();

  /// Emits when the server refuses a call because the signed-in account must
  /// change its password first (the manager reset it while the app was open).
  Stream<void> get onPasswordChangeRequired => _passwordChangeController.stream;

  /// Signals that the account must change its password before anything else.
  void emitPasswordChangeRequired() => _passwordChangeController.add(null);

  /// Closes the underlying controllers (app shutdown / tests only).
  Future<void> dispose() async {
    await _controller.close();
    await _passwordChangeController.close();
  }
}
