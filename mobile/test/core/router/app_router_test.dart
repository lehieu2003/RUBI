import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/team_schedule_cubit.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/router/app_router.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockAppPreferences extends Mock implements AppPreferences {}

class _MockTodayOrdersCubit extends Mock implements TodayOrdersCubit {}

class _MockScheduleCubit extends Mock implements ScheduleCubit {}

class _MockOrdersCubit extends Mock implements OrdersCubit {}

class _MockTeamScheduleCubit extends Mock implements TeamScheduleCubit {}

void main() {
  const driver = User(
    id: 'u-driver-1',
    email: 'tai@iceflow.vn',
    name: 'Nguyễn Văn Tài',
    role: UserRole.driver,
  );

  const newDriver = User(
    id: 'u-driver-2',
    email: 'loc@iceflow.vn',
    name: 'Hoàng Văn Lộc',
    role: UserRole.driver,
    mustChangePassword: true,
  );

  late _MockAuthRepository repo;
  late _MockAppPreferences preferences;
  late AuthEvents authEvents;

  setUp(() {
    repo = _MockAuthRepository();
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

    test('Authenticated, phải đổi mật khẩu → bị giữ ở /change-password', () {
      const auth = Authenticated(newDriver);
      expect(authRedirect(auth, '/login'), '/change-password');
      expect(authRedirect(auth, '/home'), '/change-password');
      expect(authRedirect(auth, '/change-password'), isNull);
    });

    test('Authenticated bình thường → mở được /change-password từ Cài đặt', () {
      expect(authRedirect(const Authenticated(driver), '/change-password'), isNull);
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
        initialState: const TodayOrdersState(status: ViewStatus.loaded),
      );
      when(() => todayCubit.load()).thenAnswer((_) async {});
      // HomeShell unmount khi đăng xuất → BlocProvider đóng cubit.
      when(() => todayCubit.close()).thenAnswer((_) async {});
      sl.registerFactory<TodayOrdersCubit>(() => todayCubit);
      addTearDown(() => sl.unregister<TodayOrdersCubit>());

      // Giao diện: chưa lưu gì → theo máy; lưu được.
      when(() => preferences.readThemeMode()).thenAnswer((_) async => null);
      when(() => preferences.saveThemeMode(any())).thenAnswer((_) async {});
      final themeCubit = ThemeCubit(preferences: preferences);
      addTearDown(themeCubit.close);

      await tester.pumpWidget(
        IceFlowApp(authCubit: cubit, themeCubit: themeCubit),
      );
      await tester.pumpAndSettle();

      // Unauthenticated → /login.
      expect(find.text('Đăng nhập'), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);

      // Authenticated → /home = HomeShell (các tab của tài xế), không còn
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

      // Tài khoản Quản lý vừa cấp → màn đổi mật khẩu, chưa vào được app.
      cubit.emit(const Authenticated(newDriver));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.changePasswordForcedNotice), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);

      // Đổi xong → vào app.
      when(() => repo.changePassword(
            currentPassword: any(named: 'currentPassword'),
            newPassword: any(named: 'newPassword'),
          )).thenAnswer((_) async => const Ok<void>(null));
      await tester.enterText(
          find.byKey(const Key('change_password_current')), 'Cu12345678');
      await tester.enterText(
          find.byKey(const Key('change_password_new')), 'Matkhau2026');
      await tester.enterText(
          find.byKey(const Key('change_password_confirm')), 'Matkhau2026');
      await tester.tap(find.byKey(const Key('change_password_submit')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.navToday), findsOneWidget);
      expect(find.text(AppStrings.changePasswordForcedNotice), findsNothing);

      // Từ Cài đặt mở lại màn đổi mật khẩu, rồi quay lại được.
      await tester.tap(find.text(AppStrings.navSettings));
      await tester.pumpAndSettle();

      // Cài đặt → Giao diện: chọn Tối thì cả app tối ngay và được nhớ.
      Brightness brightness() =>
          Theme.of(tester.element(find.text(AppStrings.themeTitle))).brightness;
      expect(brightness(), Brightness.light);
      await tester.tap(find.text(AppStrings.themeDark));
      await tester.pumpAndSettle();
      expect(brightness(), Brightness.dark);
      verify(() => preferences.saveThemeMode('dark')).called(1);
      await tester.tap(find.text(AppStrings.themeLight));
      await tester.pumpAndSettle();
      expect(brightness(), Brightness.light);

      await tester.tap(find.text(AppStrings.changePasswordTitle));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('change_password_submit')), findsOneWidget);
      expect(find.byKey(const Key('change_password_logout')), findsNothing);
      // Không dùng tester.pageBack(): nó tìm tooltip 'Back', app là tiếng Việt.
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.logoutButton), findsOneWidget);

      // Quản lý đặt lại mật khẩu khi app đang mở: lần gọi API kế tiếp bị
      // server từ chối → app tự sang màn đổi mật khẩu.
      authEvents.emitPasswordChangeRequired();
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.changePasswordForcedNotice), findsOneWidget);
      expect(find.byKey(const Key('change_password_logout')), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);
    });

    testWidgets('Nhân viên và Quản lý vào được app, mỗi vai trò thấy tab của '
        'mình', (tester) async {
      when(() => repo.restoreSession())
          .thenAnswer((_) async => const Ok<User?>(null));
      when(() => preferences.readThemeMode()).thenAnswer((_) async => null);
      final cubit = buildCubit();
      addTearDown(cubit.close);
      final themeCubit = ThemeCubit(preferences: preferences);
      addTearDown(themeCubit.close);

      // Tab đầu của Nhân viên là "Đơn hàng" → cubit của nó lấy từ DI.
      final ordersCubit = _MockOrdersCubit();
      whenListen(
        ordersCubit,
        const Stream<OrdersState>.empty(),
        initialState: const OrdersState(status: ViewStatus.loaded),
      );
      when(() => ordersCubit.load()).thenAnswer((_) async {});
      when(() => ordersCubit.close()).thenAnswer((_) async {});
      sl.registerFactory<OrdersCubit>(() => ordersCubit);
      addTearDown(() => sl.unregister<OrdersCubit>());

      // Tab "Ca làm" của Nhân viên cũng lấy cubit từ DI.
      final scheduleCubit = _MockScheduleCubit();
      whenListen(
        scheduleCubit,
        const Stream<ScheduleState>.empty(),
        initialState: ScheduleState(
          status: ViewStatus.error,
          weekStart: DateTime(2026, 10, 12),
          selectedDate: DateTime(2026, 10, 12),
          errorMessage: 'chưa tải',
        ),
      );
      when(() => scheduleCubit.load()).thenAnswer((_) async {});
      when(() => scheduleCubit.close()).thenAnswer((_) async {});
      sl.registerFactory<ScheduleCubit>(() => scheduleCubit);
      addTearDown(() => sl.unregister<ScheduleCubit>());

      await tester.pumpWidget(
        IceFlowApp(authCubit: cubit, themeCubit: themeCubit),
      );
      await tester.pumpAndSettle();

      const staff = User(
        id: 'u-staff-1',
        email: 'van@iceflow.vn',
        name: 'Nguyễn Thị Vân',
        role: UserRole.staff,
      );
      cubit.emit(const Authenticated(staff));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDestination), findsNWidgets(3));
      expect(find.text(AppStrings.ordersEmpty), findsOneWidget);
      expect(find.text(AppStrings.navToday), findsNothing);
      expect(find.text(AppStrings.navHistory), findsNothing);
      await tester.tap(find.text(AppStrings.navSettings));
      await tester.pumpAndSettle();
      expect(find.text('van@iceflow.vn'), findsOneWidget);

      // Quản lý: tab đầu là "Duyệt ca" (cubit lấy từ DI), rồi Cài đặt.
      final teamCubit = _MockTeamScheduleCubit();
      whenListen(
        teamCubit,
        const Stream<TeamScheduleState>.empty(),
        initialState: TeamScheduleState(
          status: ViewStatus.loaded,
          weekStart: DateTime(2026, 10, 12),
          selectedDate: DateTime(2026, 10, 12),
          people: const [],
        ),
      );
      when(() => teamCubit.load()).thenAnswer((_) async {});
      when(() => teamCubit.close()).thenAnswer((_) async {});
      sl.registerFactory<TeamScheduleCubit>(() => teamCubit);
      addTearDown(() => sl.unregister<TeamScheduleCubit>());

      const admin = User(
        id: 'u-admin-1',
        email: 'chu@iceflow.vn',
        name: 'Nguyễn Văn Chủ',
        role: UserRole.admin,
      );
      // Đổi người dùng luôn đi qua đăng xuất: shell cũ bị gỡ, shell mới mở
      // ở tab đầu của vai trò mới.
      cubit.emit(const Unauthenticated());
      await tester.pumpAndSettle();
      cubit.emit(const Authenticated(admin));
      await tester.pumpAndSettle();
      expect(find.byType(NavigationDestination), findsNWidgets(4));
      expect(find.text(AppStrings.shiftReviewNonePending), findsOneWidget);
      expect(find.text(AppStrings.navSchedule), findsNothing);
      // "Thêm": lối vào Đơn hàng, Đối soát và Nhật ký, rồi tới tài khoản, cài đặt và đăng xuất.
      await tester.tap(find.text(AppStrings.navMore));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('more_orders')), findsOneWidget);
      expect(find.byKey(const Key('more_settle')), findsOneWidget);
      expect(find.byKey(const Key('more_audit_log')), findsOneWidget);
      expect(find.text('chu@iceflow.vn'), findsOneWidget);
      expect(find.text(AppStrings.themeTitle), findsOneWidget);
      // Menu dài hơn màn hình test: cuộn xuống mới tới Đăng xuất.
      await tester.scrollUntilVisible(
        find.text(AppStrings.logoutButton),
        200,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.text(AppStrings.logoutButton), findsOneWidget);
    });

    testWidgets('về trạng thái chưa đăng nhập → câu báo đang hiện và đang chờ '
        'đều bị xoá, không theo sang phiên của người kế tiếp', (tester) async {
      // Phiên chưa khôi phục xong: app còn ở AuthUnknown cho tới khi có kết quả.
      final restoring = Completer<Result<User?>>();
      when(() => repo.restoreSession()).thenAnswer((_) => restoring.future);
      when(() => preferences.readThemeMode()).thenAnswer((_) async => null);
      final cubit = buildCubit();
      addTearDown(cubit.close);
      final themeCubit = ThemeCubit(preferences: preferences);
      addTearDown(themeCubit.close);
      await tester.pumpWidget(
        IceFlowApp(authCubit: cubit, themeCubit: themeCubit),
      );
      await tester.pumpAndSettle();

      final messenger = tester.state<ScaffoldMessengerState>(
        find.byType(ScaffoldMessenger).first,
      );
      messenger
        ..showSnackBar(const SnackBar(content: Text('Đã gửi đăng ký')))
        ..showSnackBar(const SnackBar(content: Text('Câu báo đang chờ')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.text('Đã gửi đăng ký'), findsOneWidget);

      restoring.complete(const Ok<User?>(null));
      await tester.pumpAndSettle();

      expect(cubit.state, isA<Unauthenticated>());
      expect(find.text('Đã gửi đăng ký'), findsNothing);
      expect(find.text('Câu báo đang chờ'), findsNothing);
    });
  });
}
