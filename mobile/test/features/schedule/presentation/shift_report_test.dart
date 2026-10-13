import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/shift_report_repository.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/shift_report_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/screens/shift_report_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockRepo extends Mock implements ShiftReportRepository {}

final tai = ShiftReportPerson(
  id: 'u-1',
  name: 'Phạm Văn Tài',
  role: UserRole.driver,
  isActive: true,
  approvedShifts: 4,
  hours: 12,
  daysWorked: 2,
  pendingShifts: 1,
  rejectedShifts: 1,
  days: [
    ShiftReportDay(date: DateTime(2026, 10, 12), slots: const [ShiftSlot.slot06To09, ShiftSlot.slot09To12]),
    ShiftReportDay(date: DateTime(2026, 10, 13), slots: const [ShiftSlot.slot18To21, ShiftSlot.slot21To24]),
  ],
);
const van = ShiftReportPerson(
  id: 'u-2',
  name: 'Nguyễn Thị Vân',
  role: UserRole.staff,
  isActive: true,
  approvedShifts: 2,
  hours: 6,
  daysWorked: 1,
  pendingShifts: 0,
  rejectedShifts: 0,
);

ShiftReport reportOf(DateTime month, {List<ShiftReportPerson>? people, DateTime? lockedAt}) =>
    ShiftReport(month: month, people: people ?? [tai, van], lockedAt: lockedAt);

void main() {
  setUpAll(() => registerFallbackValue(DateTime(2026)));

  final october = DateTime(2026, 10);
  late _MockRepo repo;

  ShiftReportCubit buildCubit() =>
      ShiftReportCubit(repo: repo, now: () => DateTime(2026, 10, 13, 9));

  setUp(() {
    repo = _MockRepo();
    when(() => repo.getReport(any())).thenAnswer(
      (invocation) async => Ok(reportOf(invocation.positionalArguments.first as DateTime)),
    );
  });

  group('ShiftReportCubit', () {
    late ShiftReportCubit cubit;
    setUp(() => cubit = buildCubit());
    tearDown(() => cubit.close());

    test('mở ra ở tháng hiện tại; load → bảng công của tháng đó', () async {
      expect(cubit.state.month, october);
      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.report!.totalShifts, 6);
      expect(cubit.state.report!.totalHours, 18);
      verify(() => repo.getReport(october)).called(1);
    });

    test('tháng trước / tháng sau, kể cả qua năm', () async {
      await cubit.previousMonth();
      expect(cubit.state.month, DateTime(2026, 9));
      await cubit.nextMonth();
      await cubit.nextMonth();
      await cubit.nextMonth();
      await cubit.nextMonth();
      expect(cubit.state.month, DateTime(2027, 1));
      verify(() => repo.getReport(DateTime(2027, 1))).called(1);
    });

    test('bảng công về muộn của tháng cũ không đè lên tháng đang xem', () async {
      final slow = Completer<Result<ShiftReport>>();
      when(() => repo.getReport(DateTime(2026, 9))).thenAnswer((_) => slow.future);

      final first = cubit.previousMonth();
      await cubit.nextMonth();
      slow.complete(Ok(reportOf(DateTime(2026, 9), people: const [])));
      await first;

      expect(cubit.state.month, october);
      expect(cubit.state.report!.month, october);
    });

    test('lỗi lần đầu → câu báo; lỗi khi làm mới → giữ bảng công đang xem',
        () async {
      when(() => repo.getReport(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.report, isNull);

      when(() => repo.getReport(any())).thenAnswer((_) async => Ok(reportOf(october)));
      await cubit.load();
      when(() => repo.getReport(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.report, isNotNull);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    test('chốt công → bảng công mang thời điểm chốt; mở lại → hết', () async {
      await cubit.load();
      final lockedAt = DateTime.utc(2026, 11, 1, 2);
      when(() => repo.setLock(any(), locked: true)).thenAnswer((_) async => Ok(lockedAt));
      when(() => repo.setLock(any(), locked: false)).thenAnswer((_) async => const Ok(null));

      final locked = await cubit.setLock(locked: true);
      expect(locked, (ok: true, message: AppStrings.shiftReportLocked('Tháng 10/2026')));
      verify(() => repo.setLock(october, locked: true)).called(1);
      expect(cubit.state.report!.lockedAt, lockedAt);

      final reopened = await cubit.setLock(locked: false);
      expect(reopened, (ok: true, message: AppStrings.shiftReportReopened('Tháng 10/2026')));
      expect(cubit.state.report!.isLocked, isFalse);
    });

    test('còn ca chờ duyệt → câu của server, tháng vẫn mở', () async {
      await cubit.load();
      when(() => repo.setLock(any(), locked: any(named: 'locked'))).thenAnswer(
        (_) async => const Err(ServerFailure('Còn 1 ca chờ duyệt trong tháng này')),
      );

      final result = await cubit.setLock(locked: true);

      expect(result, (ok: false, message: 'Còn 1 ca chờ duyệt trong tháng này'));
      expect(cubit.state.report!.isLocked, isFalse);
    });
  });

  group('ShiftReportScreen', () {
    setUp(() => sl.registerFactory<ShiftReportCubit>(buildCubit));
    tearDown(() => sl.unregister<ShiftReportCubit>());

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: ShiftReportScreen()));
      await tester.pump();
    }

    String text(WidgetTester tester, String key) =>
        tester.widget<Text>(find.byKey(Key(key))).data!;

    testWidgets('tháng, tổng ca và giờ, từng người với ca / giờ / ngày công',
        (tester) async {
      await pumpScreen(tester);

      expect(text(tester, 'shift_report_month'), 'Tháng 10/2026');
      expect(text(tester, 'shift_report_totals'), AppStrings.shiftReportTotals(6, 18));
      expect(
        find.text('${AppStrings.roleDriver} · ${AppStrings.shiftReportPersonTotals(4, 12, 2)}'),
        findsOneWidget,
      );
      expect(
        find.text('${AppStrings.roleStaff} · ${AppStrings.shiftReportPersonTotals(2, 6, 1)}'),
        findsOneWidget,
      );
      expect(
        find.text(
          '${AppStrings.shiftReportPersonPending(1)} · ${AppStrings.shiftReportPersonRejected(1)}',
        ),
        findsOneWidget,
      );
    });

    testWidgets('mở một người → từng ngày với khung giờ đã duyệt', (tester) async {
      await pumpScreen(tester);
      await tester.tap(find.text('Phạm Văn Tài'));
      await tester.pumpAndSettle();

      expect(find.text('12/10: 06–09, 09–12'), findsOneWidget);
      expect(find.text('13/10: 18–21, 21–24'), findsOneWidget);
    });

    testWidgets('còn ca chờ duyệt → nhắc duyệt hết; tháng không ai có ca → câu báo',
        (tester) async {
      await pumpScreen(tester);
      expect(text(tester, 'shift_report_status'), AppStrings.shiftReportPendingHint(1));

      when(() => repo.getReport(any()))
          .thenAnswer((_) async => Ok(reportOf(DateTime(2026, 11), people: const [])));
      await tester.tap(find.byKey(const Key('shift_report_next')));
      await tester.pumpAndSettle();
      expect(text(tester, 'shift_report_month'), 'Tháng 11/2026');
      expect(find.text(AppStrings.shiftReportEmpty), findsOneWidget);
      expect(text(tester, 'shift_report_status'), AppStrings.shiftReportOpenHint);
    });

    testWidgets('chốt công: hỏi lại, huỷ thì thôi; đồng ý thì chốt và đổi nút',
        (tester) async {
      when(() => repo.getReport(any())).thenAnswer((_) async => Ok(reportOf(october, people: const [van])));
      when(() => repo.setLock(any(), locked: true))
          .thenAnswer((_) async => Ok(DateTime(2026, 11, 1, 9)));
      await pumpScreen(tester);

      await tester.tap(find.byKey(const Key('shift_report_lock')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.shiftReportLockTitle('Tháng 10/2026')), findsOneWidget);
      await tester.tap(find.text(AppStrings.cancelButton));
      await tester.pumpAndSettle();
      verifyNever(() => repo.setLock(any(), locked: any(named: 'locked')));

      await tester.tap(find.byKey(const Key('shift_report_lock')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('shift_report_confirm')));
      await tester.pumpAndSettle();

      verify(() => repo.setLock(october, locked: true)).called(1);
      expect(find.text(AppStrings.shiftReportLocked('Tháng 10/2026')), findsOneWidget);
      expect(text(tester, 'shift_report_status'), AppStrings.shiftReportLockedAt('01/11/2026'));
      expect(find.text(AppStrings.shiftReportReopenButton), findsOneWidget);
    });

    testWidgets('server từ chối chốt → báo câu của server', (tester) async {
      when(() => repo.setLock(any(), locked: any(named: 'locked'))).thenAnswer(
        (_) async => const Err(ServerFailure('Còn 1 ca chờ duyệt trong tháng này')),
      );
      await pumpScreen(tester);
      await tester.tap(find.byKey(const Key('shift_report_lock')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('shift_report_confirm')));
      await tester.pumpAndSettle();

      expect(find.text('Còn 1 ca chờ duyệt trong tháng này'), findsOneWidget);
      expect(find.text(AppStrings.shiftReportLockButton), findsOneWidget);
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getReport(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getReport(any())).thenAnswer((_) async => Ok(reportOf(october)));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(find.text('Phạm Văn Tài'), findsOneWidget);
    });

    testWidgets('màn hình 360dp, tên dài → không overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      when(() => repo.getReport(any())).thenAnswer(
        (_) async => Ok(
          reportOf(
            october,
            people: [
              ShiftReportPerson(
                id: 'u-1',
                name: 'Nguyễn Hoàng Thiên Phúc Bảo Long Quang Minh',
                role: UserRole.driver,
                isActive: true,
                approvedShifts: 240,
                hours: 720,
                daysWorked: 31,
                pendingShifts: 12,
                rejectedShifts: 34,
                days: [
                  ShiftReportDay(date: DateTime(2026, 10, 12), slots: ShiftSlot.values),
                ],
              ),
            ],
          ),
        ),
      );
      await pumpScreen(tester);
      expect(tester.takeException(), isNull);
      await tester.tap(find.textContaining('Nguyễn Hoàng'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
