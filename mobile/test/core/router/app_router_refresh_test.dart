import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/router/app_router_refresh.dart';

void main() {
  test('mỗi sự kiện của stream báo router một lần; dispose thì thôi nghe',
      () async {
    final events = StreamController<int>.broadcast();
    final refresh = AppRouterRefresh(events.stream);
    var notified = 0;
    refresh.addListener(() => notified++);

    events
      ..add(1)
      ..add(2);
    await Future<void>.delayed(Duration.zero);
    expect(notified, 2);

    refresh.dispose();
    expect(events.hasListener, isFalse);
    await events.close();
  });
}
