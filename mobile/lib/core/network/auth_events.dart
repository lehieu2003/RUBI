import 'dart:async';

/// Broadcast channel for auth lifecycle events.
///
/// The network layer emits on [onLogout] when a session is forcibly ended
/// (token refresh failed, or a retried request was still unauthorized);
/// the session Bloc listens to route the user back to login.
class AuthEvents {
  final StreamController<void> _controller =
      StreamController<void>.broadcast();

  /// Emits whenever the session ends unexpectedly.
  Stream<void> get onLogout => _controller.stream;

  /// Signals that the user must be logged out.
  void emitLogout() => _controller.add(null);

  /// Closes the underlying controller (app shutdown / tests only).
  Future<void> dispose() => _controller.close();
}
