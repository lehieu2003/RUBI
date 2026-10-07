// Smoke test: app boots and lands on the login screen when there is
// no stored session.

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAuthStorage extends Mock implements AuthStorage {}

void main() {
  testWidgets('boot không có phiên → màn đăng nhập', (tester) async {
    final repo = _MockAuthRepository();
    when(() => repo.restoreSession())
        .thenAnswer((_) async => const Ok<User?>(null));

    final authEvents = AuthEvents();
    addTearDown(authEvents.dispose);

    final cubit = AuthCubit(
      repo: repo,
      storage: _MockAuthStorage(),
      authEvents: authEvents,
    );
    addTearDown(cubit.close);

    await tester.pumpWidget(IceFlowApp(authCubit: cubit));
    await tester.pumpAndSettle();

    expect(find.text('Đăng nhập'), findsOneWidget);
  });
}
