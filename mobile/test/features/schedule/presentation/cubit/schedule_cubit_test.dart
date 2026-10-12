import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/domain/shift_rules.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockScheduleRepository extends Mock implements ScheduleRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(DateTime(2026));
    registerFallbackValue(ShiftSlot.slot00To03);
  });

  // Thứ Tư 14/10/2026, 10 giờ.
  final now = DateTime(2026, 10, 14, 10, 30);
  final today = DateTime(2026, 10, 14);
  final monday = DateTime(2026, 10, 12);
  final tomorrow = DateTime(2026, 10, 15);

  WeekSchedule weekWith(List<Shift> mine) => WeekSchedule(
        userId: 'me',
        today: today,
        currentHour: 10,
        staffLimit: null,
        driverLimit: null,
        lockedMonths: const [],
        people: [
          SchedulePerson(id: 'me', name: 'Tôi', role: UserRole.driver, shifts: mine),
        ],
      );

  final emptyWeek = weekWith(const []);
  final pending =
      Shift(date: tomorrow, slot: ShiftSlot.slot06To09, status: ShiftStatus.pending);
  final weekWithPending = weekWith([pending]);

  late _MockScheduleRepository repo;

  setUp(() => repo = _MockScheduleRepository());

  ScheduleCubit buildCubit() => ScheduleCubit(repo: repo, now: () => now);

  SlotInfo slot(ScheduleCubit cubit, ShiftSlot slot) =>
      cubit.state.slots.firstWhere((info) => info.slot == slot);

  group('ScheduleCubit', () {
    test('mở ở tuần này (thứ Hai), ngày hôm nay, đang tải', () {
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(
        cubit.state,
        ScheduleState(
          status: ViewStatus.loading,
          weekStart: monday,
          selectedDate: today,
        ),
      );
    });

    blocTest<ScheduleCubit, ScheduleState>(
      'load → hỏi đúng thứ Hai của tuần, có lịch',
      build: buildCubit,
      setUp: () =>
          when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek)),
      act: (cubit) => cubit.load(),
      skip: 1,
      expect: () => [
        ScheduleState(
          status: ViewStatus.loaded,
          weekStart: monday,
          selectedDate: today,
          week: emptyWeek,
        ),
      ],
      verify: (_) => verify(() => repo.getWeek(monday)).called(1),
    );

    blocTest<ScheduleCubit, ScheduleState>(
      'load lỗi lần đầu → trạng thái lỗi với câu báo mất kết nối',
      build: buildCubit,
      setUp: () => when(() => repo.getWeek(any()))
          .thenAnswer((_) async => const Err(NetworkFailure())),
      act: (cubit) => cubit.load(),
      skip: 1,
      expect: () => [
        ScheduleState(
          status: ViewStatus.error,
          weekStart: monday,
          selectedDate: today,
          errorMessage: FailureMessages.network,
        ),
      ],
    );

    test('tuần sau mở ở thứ Hai; quay lại tuần này mở ở hôm nay', () async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.showWeek(1);
      expect(cubit.state.weekStart, DateTime(2026, 10, 19));
      expect(cubit.state.selectedDate, DateTime(2026, 10, 19));
      verify(() => repo.getWeek(DateTime(2026, 10, 19))).called(1);

      await cubit.showWeek(-1);
      expect(cubit.state.weekStart, monday);
      expect(cubit.state.selectedDate, today);
    });

    test('đổi tuần nhanh: lịch của tuần cũ về muộn không đè lên tuần mới',
        () async {
      final slowThisWeek = Completer<Result<WeekSchedule>>();
      when(() => repo.getWeek(monday)).thenAnswer((_) => slowThisWeek.future);
      when(() => repo.getWeek(DateTime(2026, 10, 19)))
          .thenAnswer((_) async => Ok(emptyWeek));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      final loading = cubit.load();
      await cubit.showWeek(1);
      slowThisWeek.complete(Ok(weekWithPending));
      await loading;

      expect(cubit.state.weekStart, DateTime(2026, 10, 19));
      expect(cubit.state.week, emptyWeek);
    });

    test('đăng ký một khung giờ của ngày đang xem → gửi đúng ngày và giờ, '
        'tải lại lịch, báo chờ duyệt', () async {
      var loads = 0;
      when(() => repo.getWeek(any())).thenAnswer(
        (_) async => Ok(loads++ == 0 ? emptyWeek : weekWithPending),
      );
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) async => Ok(pending));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final result = await cubit.toggle(slot(cubit, ShiftSlot.slot06To09));

      expect(result, (ok: true, message: AppStrings.shiftRequested));
      verify(() => repo.requestShift(date: tomorrow, slot: ShiftSlot.slot06To09))
          .called(1);
      expect(slot(cubit, ShiftSlot.slot06To09).mine, ShiftStatus.pending);
      expect(cubit.state.busySlot, isNull);
      expect(cubit.state.selectedDate, tomorrow);
    });

    test('ca đang chờ duyệt → huỷ; ca bị từ chối → xin lại', () async {
      final rejected = Shift(
        date: tomorrow,
        slot: ShiftSlot.slot09To12,
        status: ShiftStatus.rejected,
      );
      when(() => repo.getWeek(any()))
          .thenAnswer((_) async => Ok(weekWith([pending, rejected])));
      when(() => repo.withdrawShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) async => const Ok<void>(null));
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) async => Ok(pending));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final withdrawn = await cubit.toggle(slot(cubit, ShiftSlot.slot06To09));
      expect(withdrawn, (ok: true, message: AppStrings.shiftWithdrawn));
      verify(() => repo.withdrawShift(date: tomorrow, slot: ShiftSlot.slot06To09))
          .called(1);

      final again = await cubit.toggle(slot(cubit, ShiftSlot.slot09To12));
      expect(again?.ok, isTrue);
      verify(() => repo.requestShift(date: tomorrow, slot: ShiftSlot.slot09To12))
          .called(1);
    });

    test('ca đã duyệt → không gọi server, nhắc liên hệ Quản lý', () async {
      final approved = Shift(
        date: tomorrow,
        slot: ShiftSlot.slot06To09,
        status: ShiftStatus.approved,
      );
      when(() => repo.getWeek(any()))
          .thenAnswer((_) async => Ok(weekWith([approved])));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final result = await cubit.toggle(slot(cubit, ShiftSlot.slot06To09));

      expect(result, (ok: false, message: AppStrings.shiftApprovedLocked));
      verifyNever(() => repo.withdrawShift(date: any(named: 'date'), slot: any(named: 'slot')));
      verifyNever(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')));
    });

    test('server báo ca đã đủ người (409) → giữ câu của server và tải lại lịch',
        () async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek));
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer(
        (_) async => const Err(
          ServerFailure('Ca này đã đủ 2 người. Chọn ca khác hoặc báo Quản lý.',
              statusCode: 409),
        ),
      );
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final result = await cubit.toggle(slot(cubit, ShiftSlot.slot06To09));

      expect(result?.ok, isFalse);
      expect(result?.message, 'Ca này đã đủ 2 người. Chọn ca khác hoặc báo Quản lý.');
      verify(() => repo.getWeek(monday)).called(2);
      expect(cubit.state.busySlot, isNull);
    });

    test('mất mạng khi đăng ký → báo lỗi, giữ lịch đang có, không tải lại',
        () async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek));
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final result = await cubit.toggle(slot(cubit, ShiftSlot.slot06To09));

      expect(result, (ok: false, message: FailureMessages.network));
      verify(() => repo.getWeek(monday)).called(1);
      expect(cubit.state.week, emptyWeek);
      expect(cubit.state.status, ViewStatus.loaded);
    });

    test('đang chờ server cho một khung giờ → lần bấm khác bị bỏ qua', () async {
      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek));
      final pendingCall = Completer<Result<Shift>>();
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) => pendingCall.future);
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      cubit.selectDay(tomorrow);

      final first = cubit.toggle(slot(cubit, ShiftSlot.slot06To09));
      expect(cubit.state.busySlot, ShiftSlot.slot06To09);
      expect(await cubit.toggle(slot(cubit, ShiftSlot.slot09To12)), isNull);

      pendingCall.complete(Ok(pending));
      await first;
      verify(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .called(1);
    });

    test('rời tab khi đang tải hoặc đang đăng ký → không lỗi', () async {
      final slowWeek = Completer<Result<WeekSchedule>>();
      when(() => repo.getWeek(any())).thenAnswer((_) => slowWeek.future);
      final loadingCubit = buildCubit();
      final loading = loadingCubit.load();
      await loadingCubit.close();
      slowWeek.complete(Ok(emptyWeek));
      await expectLater(loading, completes);

      when(() => repo.getWeek(any())).thenAnswer((_) async => Ok(emptyWeek));
      final slowRequest = Completer<Result<Shift>>();
      when(() => repo.requestShift(date: any(named: 'date'), slot: any(named: 'slot')))
          .thenAnswer((_) => slowRequest.future);
      final cubit = buildCubit();
      await cubit.load();
      cubit.selectDay(tomorrow);
      final toggling = cubit.toggle(slot(cubit, ShiftSlot.slot06To09));
      await cubit.close();
      slowRequest.complete(Ok(pending));
      expect(await toggling, isNull);
    });
  });
}
