// Smoke test: the placeholder home renders the app name "IceFlow".
//
// Replaced by real screens starting in Task 10 (AuthCubit + go_router).

import 'package:flutter_test/flutter_test.dart';

import 'package:iceflow_mobile/main.dart';

void main() {
  testWidgets('placeholder home renders IceFlow', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MyApp());

    // The placeholder home shows the app name in the AppBar.
    expect(find.text('IceFlow'), findsOneWidget);
  });
}
