import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/screens/schedule_tab.dart';
import 'package:mocktail/mocktail.dart';

class _MockScheduleRepository extends Mock implements ScheduleRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(DateTime(2026));
    registerFallbackValue(ShiftSlot.slot00To03);
  });

  // Thứ Tư 14/10/2026, 10 giờ. Tuần: 12/10 – 18/10.
  final now = DateTime(2026, 10, 14, 10, 30);
  final today = DateTime(2026, 10, 14);
  final tomorrow = DateTime(2026, 10, 15);

  Shift shift(DateTime date, ShiftSlot slot, ShiftStatus status) =>
      Shift(date: date, slot: slot, status: status);

  WeekSchedule week({List<Shift> mine = const [], int? driverLimit}) =>
      WeekSchedule(
        userId: 'me',
        today: today,
        currentHour: 10,
        staffLimit: null,
        driverLimit: driverLimit,
        lockedMonths: const [],
        people: [
          SchedulePerson(id: 'me', name: 'Tôi', role: UserRole.driver, shifts: mine),
          SchedulePerson(
            id: 'an',
            name: 'Phạm Văn Tài',
            role: UserRole.driver,
            shifts: [shift(tomorrow, ShiftSlot.slot12To15, ShiftStatus.approved)],
          ),
        ],
      );

  late _MockScheduleRepository repo;

  setUp(() {
    repo = _MockScheduleRepository();
    // Cubit thật trên repository giả, đồng hồ cố định.
    sl.registerFactory<ScheduleCubit>(
      () => ScheduleCubit(repo: repo, now: () => now),
    );
  });

  tearDown(() => sl.unregister<ScheduleCubit>());

  Future<void> pumpTab(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ScheduleTab()));
    await tester.pump();
  }

  Finder slotTile(ShiftSlot slot) => find.byKey(Key('schedule_slot_${slot.wireName}'));
  Finder inSlot(ShiftSlot slot, String text) =>
      find.descendant(of: slotTile(slot), matching: find.text(text));

  group('ScheduleTab', () {
    testWidgets('mở ở tuần này, hôm nay: ca đã qua giờ bị khoá, ca còn lại có '
        'nút Đăng ký', (tester) async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(week()));
      await pumpTab(tester);

      expect(find.text('Tuần 12/10 – 18/10'), findsOneWidget);
      expect(find.text(AppStrings.scheduleHint), findsOneWidget);
      expect(find.text('06:00 – 09:00'), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftBlockedEnded), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftRegisterButton), findsNothing);
      expect(inSlot(ShiftSlot.slot09To12, AppStrings.shiftRegisterButton), findsOneWidget);
      verify(() => repo.getWeek(DateTime(2026, 10, 12))).called(1);
    });

    testWidgets('chọn ngày mai → thấy ai đã có ca; bấm Đăng ký → gửi đúng ca, '
        'hiện Chờ duyệt và nút Huỷ', (tester) async {
      var loads = 0;
      when(() => repo.getWeek(any())).thenAnswer(
        (_) async => Ok(
          loads++ == 0
              ? week()
              : week(mine: [shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.pending)]),
        ),
      );
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer(
        (_) async => Ok(shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.pending)),
      );
      await pumpTab(tester);

      await tester.tap(find.byKey(const Key('schedule_day_3'))); // thứ Năm 15/10
      await tester.pump();
      expect(inSlot(ShiftSlot.slot12To15, 'Đã có: Phạm Văn Tài'), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftNobody), findsOneWidget);

      await tester.tap(inSlot(ShiftSlot.slot06To09, AppStrings.shiftRegisterButton));
      await tester.pump();
      await tester.pump();

      verify(() => repo.requestShift(date: tomorrow, slot: ShiftSlot.slot06To09)).called(1);
      expect(find.text(AppStrings.shiftRequested), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftPending), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftWithdrawButton), findsOneWidget);
      expect(find.textContaining('${AppStrings.shiftPending}: 1'), findsOneWidget);
    });

    testWidgets('ca đã duyệt không có nút; ca bị từ chối có Đăng ký lại; ca đủ '
        'người bị khoá', (tester) async {
      when(() => repo.getWeek(any())).thenAnswer(
        (_) async => Ok(
          week(
            driverLimit: 1,
            mine: [
              shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.approved),
              shift(tomorrow, ShiftSlot.slot09To12, ShiftStatus.rejected),
            ],
          ),
        ),
      );
      await pumpTab(tester);
      await tester.tap(find.byKey(const Key('schedule_day_3')));
      await tester.pump();

      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftApproved), findsOneWidget);
      expect(
        find.descendant(of: slotTile(ShiftSlot.slot06To09), matching: find.byType(FilledButton)),
        findsNothing,
      );
      expect(inSlot(ShiftSlot.slot09To12, AppStrings.shiftRejected), findsOneWidget);
      expect(inSlot(ShiftSlot.slot09To12, AppStrings.shiftRegisterAgainButton), findsOneWidget);
      // Ca 12–15 đã có một tài xế, giới hạn là 1.
      expect(inSlot(ShiftSlot.slot12To15, AppStrings.shiftBlockedFull), findsOneWidget);
    });

    testWidgets('server từ chối → hiện câu của server', (tester) async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(week()));
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer(
        (_) async => const Err(
          ServerFailure('Tháng 10/2026 đã chốt bảng công.', statusCode: 409),
        ),
      );
      await pumpTab(tester);
      await tester.tap(find.byKey(const Key('schedule_day_3')));
      await tester.pump();

      await tester.tap(inSlot(ShiftSlot.slot06To09, AppStrings.shiftRegisterButton));
      await tester.pump();
      await tester.pump();

      expect(find.text('Tháng 10/2026 đã chốt bảng công.'), findsOneWidget);
    });

    testWidgets('tải lỗi lần đầu → câu báo lỗi và Thử lại; mũi tên sang tuần sau',
        (tester) async {
      when(() => repo.getWeek(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpTab(tester);

      expect(find.text(FailureMessages.network), findsOneWidget);
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(week()));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();
      await tester.pump();
      expect(find.text('09:00 – 12:00'), findsOneWidget);

      await tester.tap(find.byTooltip(AppStrings.nextWeekTooltip));
      await tester.pump();
      await tester.pump();
      expect(find.text('Tuần 19/10 – 25/10'), findsOneWidget);
      verify(() => repo.getWeek(DateTime(2026, 10, 19))).called(1);
    });

    testWidgets('điện thoại hẹp (360dp), tên dài, đủ mọi trạng thái → không '
        'tràn bố cục', (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      when(() => repo.getWeek(any())).thenAnswer(
        (_) async => Ok(
          WeekSchedule(
            userId: 'me',
            today: today,
            currentHour: 10,
            staffLimit: null,
            driverLimit: 2,
            lockedMonths: const [],
            people: [
              SchedulePerson(
                id: 'me',
                name: 'Tôi',
                role: UserRole.driver,
                shifts: [
                  shift(tomorrow, ShiftSlot.slot00To03, ShiftStatus.approved),
                  shift(tomorrow, ShiftSlot.slot03To06, ShiftStatus.pending),
                  shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.rejected),
                ],
              ),
              for (final name in [
                'Nguyễn Hoàng Thiên Phúc Trường An',
                'Trần Thị Ngọc Bảo Châu Minh Khuê',
              ])
                SchedulePerson(
                  id: name,
                  name: name,
                  role: UserRole.driver,
                  shifts: [
                    for (final slot in ShiftSlot.values)
                      shift(tomorrow, slot, ShiftStatus.approved),
                  ],
                ),
            ],
          ),
        ),
      );
      await pumpTab(tester);
      await tester.tap(find.byKey(const Key('schedule_day_3')));
      await tester.pump();

      expect(inSlot(ShiftSlot.slot03To06, AppStrings.shiftWithdrawButton), findsOneWidget);
      expect(inSlot(ShiftSlot.slot06To09, AppStrings.shiftRegisterAgainButton), findsOneWidget);
      expect(inSlot(ShiftSlot.slot09To12, AppStrings.shiftBlockedFull), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
