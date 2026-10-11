import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/injector.dart';
import 'package:iceflow_mobile/router.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAuthStorage extends Mock implements AuthStorage {}

class _MockAppPreferences extends Mock implements AppPreferences {}

class _MockTodayOrdersCubit extends Mock implements TodayOrdersCubit {}

void main() {
  const driver = User(
    id: 'u-driver-1',
    email: 'tai@iceflow.vn',
    name: 'Nguyễn Văn Tài',
    role: UserRole.driver,
  );

  late _MockAuthRepository repo;
  late _MockAuthStorage storage;
  late _MockAppPreferences preferences;
  late AuthEvents authEvents;

  setUp(() {
    repo = _MockAuthRepository();
    storage = _MockAuthStorage();
    preferences = _MockAppPreferences();
    when(() => preferences.readLastEmail()).thenAnswer((_) async => null);
    when(() => preferences.saveLastEmail(any())).thenAnswer((_) async {});
    authEvents = AuthEvents();
  });

  tearDown(() {
    authEvents.dispose();
  });

  AuthCubit buildCubit() =>
      AuthCubit(
        repo: repo,
        storage: storage,
        preferences: preferences,
        authEvents: authEvents,
      );

  group('authRedirect (quy tắc thuần)', () {
    test('AuthUnknown → không điều hướng (đang chờ khôi phục phiên)', () {
      expect(authRedirect(const AuthUnknown(), '/login'), isNull);
      expect(authRedirect(const AuthUnknown(), '/home'), isNull);
      expect(authRedirect(const AuthUnknown(), '/anything'), isNull);
    });

    test('Unauthenticated → về /login trừ khi đã ở /login', () {
      expect(authRedirect(const Unauthenticated(), '/home'), '/login');
      expect(authRedirect(const Unauthenticated(), '/anything'), '/login');
      expect(authRedirect(const Unauthenticated(), '/login'), isNull);
      expect(
        authRedirect(const Unauthenticated(message: 'lỗi'), '/login'),
        isNull,
      );
    });

    test('Authenticated → về /home trừ khi đã ở /home', () {
      expect(authRedirect(const Authenticated(driver), '/login'), '/home');
      expect(authRedirect(const Authenticated(driver), '/anything'), '/home');
      expect(authRedirect(const Authenticated(driver), '/home'), isNull);
    });
  });

  group('createRouter (tích hợp với AuthCubit)', () {
    testWidgets('đổi AuthState → điều hướng đúng, kể cả qua stream', (
      tester,
    ) async {
      when(() => repo.restoreSession())
          .thenAnswer((_) async => const Ok<User?>(null));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      // /home giờ là HomeShell — TodayTab lấy cubit từ DI → đăng ký mock.
      final todayCubit = _MockTodayOrdersCubit();
      whenListen(
        todayCubit,
        const Stream<TodayOrdersState>.empty(),
        // loaded-rỗng (không phải loading) để tránh spinner vô hạn làm
        // pumpAndSettle treo.
        initialState: const TodayOrdersState(status: TodayStatus.loaded),
      );
      when(() => todayCubit.load()).thenAnswer((_) async {});
      // HomeShell unmount khi đăng xuất → BlocProvider đóng cubit.
      when(() => todayCubit.close()).thenAnswer((_) async {});
      sl.registerFactory<TodayOrdersCubit>(() => todayCubit);
      addTearDown(() => sl.unregister<TodayOrdersCubit>());

      await tester.pumpWidget(IceFlowApp(authCubit: cubit));
      await tester.pumpAndSettle();

      // Unauthenticated → /login.
      expect(find.text('Đăng nhập'), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);

      // Authenticated → /home = HomeShell (bottom-nav 3 tab), không còn
      // placeholder 'Home'.
      cubit.emit(const Authenticated(driver));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.navToday), findsOneWidget);
      expect(find.text(AppStrings.navHistory), findsOneWidget);
      expect(find.text(AppStrings.navSettings), findsOneWidget);
      expect(find.text('Đăng nhập'), findsNothing);

      // Unauthenticated lại → /login.
      cubit.emit(const Unauthenticated());
      await tester.pumpAndSettle();
      expect(find.text('Đăng nhập'), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);
    });
  });
}
