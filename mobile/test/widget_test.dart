// Smoke test: app boots and lands on the login screen when there is
// no stored session.

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAppPreferences extends Mock implements AppPreferences {}

void main() {
  testWidgets('boot không có phiên → màn đăng nhập', (tester) async {
    final repo = _MockAuthRepository();
    when(() => repo.restoreSession())
        .thenAnswer((_) async => const Ok<User?>(null));

    final authEvents = AuthEvents();
    addTearDown(authEvents.dispose);

    final preferences = _MockAppPreferences();
    when(() => preferences.readLastEmail()).thenAnswer((_) async => null);

    final cubit = AuthCubit(
      repo: repo,
      preferences: preferences,
      authEvents: authEvents,
    );
    addTearDown(cubit.close);

    final themeCubit = ThemeCubit(preferences: preferences);
    addTearDown(themeCubit.close);

    await tester.pumpWidget(
      IceFlowApp(authCubit: cubit, themeCubit: themeCubit),
    );
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập'), findsOneWidget);
  });
}
