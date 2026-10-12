import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/settings_tab.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthCubit extends Mock implements AuthCubit {}

class _MockThemeCubit extends Mock implements ThemeCubit {}

void main() {
  setUpAll(() => registerFallbackValue(ThemeMode.system));

  late _MockAuthCubit authCubit;
  late _MockThemeCubit themeCubit;

  setUp(() {
    authCubit = _MockAuthCubit();
    themeCubit = _MockThemeCubit();
    whenListen(
      authCubit,
      const Stream<AuthState>.empty(),
      initialState: const Authenticated(
        User(id: 'u-1', email: 'tai@iceflow.vn', name: 'Nguyễn Văn Tài', role: UserRole.driver),
      ),
    );
    when(() => themeCubit.select(any())).thenAnswer((_) async {});
  });

  Future<void> pumpTab(WidgetTester tester, ThemeMode mode) {
    whenListen(themeCubit, const Stream<ThemeMode>.empty(), initialState: mode);
    return tester.pumpWidget(
      MultiBlocProvider(
        providers: [
          BlocProvider<AuthCubit>.value(value: authCubit),
          BlocProvider<ThemeCubit>.value(value: themeCubit),
        ],
        child: const MaterialApp(home: SettingsTab()),
      ),
    );
  }

  group('SettingsTab — giao diện', () {
    testWidgets('đánh dấu lựa chọn hiện tại; bấm lựa chọn khác → gọi select',
        (tester) async {
      await pumpTab(tester, ThemeMode.system);

      final selector = tester.widget<SegmentedButton<ThemeMode>>(
        find.byKey(const Key('settings_theme_mode')),
      );
      expect(selector.selected, {ThemeMode.system});

      await tester.tap(find.text(AppStrings.themeDark));
      verify(() => themeCubit.select(ThemeMode.dark)).called(1);
      await tester.tap(find.text(AppStrings.themeLight));
      verify(() => themeCubit.select(ThemeMode.light)).called(1);
    });

    testWidgets('màn hình 320dp → ba lựa chọn không tràn', (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await pumpTab(tester, ThemeMode.dark);

      expect(find.text(AppStrings.themeSystem), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
