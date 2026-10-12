import 'dart:async';

import 'package:flutter/foundation.dart';

/// Cầu một [Stream] → [Listenable] cho `refreshListenable` của GoRouter: mỗi
/// sự kiện của stream làm router chạy lại `redirect` (go_router 18 không còn
/// export `GoRouterRefreshStream`).
class AppRouterRefresh extends ChangeNotifier {
  AppRouterRefresh(Stream<Object?> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  StreamSubscription<Object?>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
