import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/team_schedule_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockTeamScheduleRepository extends Mock implements TeamScheduleRepository {}

void main() {
  setUpAll(() => registerFallbackValue(DateTime(2026)));

  // Thứ Tư 14/10/2026.
  final now = DateTime(2026, 10, 14, 10);
  final today = DateTime(2026, 10, 14);
  final monday = DateTime(2026, 10, 12);

  Shift shift(String id, ShiftStatus status, {DateTime? date}) => Shift(
        id: id,
        date: date ?? today,
        slot: ShiftSlot.slot09To12,
        status: status,
      );

  List<SchedulePerson> team(List<Shift> shifts) => [
        SchedulePerson(id: 'u1', name: 'Tài', role: UserRole.driver, shifts: shifts),
      ];

  late _MockTeamScheduleRepository repo;

  setUp(() => repo = _MockTeamScheduleRepository());

  TeamScheduleCubit buildCubit() => TeamScheduleCubit(repo: repo, now: () => now);

  void stubReview(Result<int> result) {
    when(() => repo.reviewShifts(
          shiftIds: any(named: 'shiftIds'),
          approve: any(named: 'approve'),
        )).thenAnswer((_) async => result);
  }

  group('TeamScheduleCubit', () {
    test('mở ở tuần này, hôm nay; load hỏi đúng thứ Hai và đếm yêu cầu chờ',
        () async {
      when(() => repo.getTeamWeek(any())).thenAnswer(
        (_) async => Ok(team([
          shift('s1', ShiftStatus.pending),
          shift('s2', ShiftStatus.approved),
        ])),
      );
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(cubit.state.weekStart, monday);
      expect(cubit.state.selectedDate, today);

      await cubit.load();

      verify(() => repo.getTeamWeek(monday)).called(1);
      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.pending.map((s) => s.id), ['s1']);
      expect(cubit.state.slots.single.entries, hasLength(2));
    });

    test('load lỗi lần đầu → trạng thái lỗi', () async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.load();

      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);
      expect(cubit.state.people, isNull);
    });

    test('duyệt một ca → gửi đúng id, báo số ca, tải lại lịch', () async {
      var loads = 0;
      when(() => repo.getTeamWeek(any())).thenAnswer(
        (_) async => Ok(team([
          shift('s1', loads++ == 0 ? ShiftStatus.pending : ShiftStatus.approved),
        ])),
      );
      stubReview(const Ok(1));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.review(cubit.state.pending, approve: true);

      expect(result, (ok: true, message: AppStrings.shiftsApproved(1)));
      verify(() => repo.reviewShifts(shiftIds: ['s1'], approve: true)).called(1);
      expect(cubit.state.pending, isEmpty);
      expect(cubit.state.busy, isFalse);
    });

    test('từ chối → gửi approve: false, báo đã từ chối', () async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => Ok(team([shift('s1', ShiftStatus.pending)])));
      stubReview(const Ok(1));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.review(cubit.state.pending, approve: false);

      expect(result, (ok: true, message: AppStrings.shiftsRejected(1)));
      verify(() => repo.reviewShifts(shiftIds: ['s1'], approve: false)).called(1);
    });

    test('tháng đã chốt công (409) → giữ câu của server và tải lại', () async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => Ok(team([shift('s1', ShiftStatus.pending)])));
      stubReview(const Err(
        ServerFailure('Tháng 10/2026 đã chốt bảng công.', statusCode: 409),
      ));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.review(cubit.state.pending, approve: true);

      expect(result, (ok: false, message: 'Tháng 10/2026 đã chốt bảng công.'));
      verify(() => repo.getTeamWeek(monday)).called(2);
    });

    test('mất mạng khi duyệt → báo lỗi, giữ lịch, không tải lại', () async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => Ok(team([shift('s1', ShiftStatus.pending)])));
      stubReview(const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.review(cubit.state.pending, approve: true);

      expect(result, (ok: false, message: FailureMessages.network));
      verify(() => repo.getTeamWeek(monday)).called(1);
      expect(cubit.state.pending, hasLength(1));
    });

    test('không có ca nào, hoặc đang gửi lần khác → bỏ qua', () async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => Ok(team([shift('s1', ShiftStatus.pending)])));
      final slow = Completer<Result<int>>();
      when(() => repo.reviewShifts(
            shiftIds: any(named: 'shiftIds'),
            approve: any(named: 'approve'),
          )).thenAnswer((_) => slow.future);
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      expect(await cubit.review(const [], approve: true), isNull);

      final first = cubit.review(cubit.state.pending, approve: true);
      expect(cubit.state.busy, isTrue);
      expect(await cubit.review(cubit.state.pending, approve: false), isNull);
      slow.complete(const Ok(1));
      await first;
      verify(() => repo.reviewShifts(
            shiftIds: any(named: 'shiftIds'),
            approve: any(named: 'approve'),
          )).called(1);
    });

    test('tuần sau mở ở thứ Hai; rời tab khi đang tải → không lỗi', () async {
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => Ok(team(const [])));
      final cubit = buildCubit();
      await cubit.showWeek(1);
      expect(cubit.state.weekStart, DateTime(2026, 10, 19));
      expect(cubit.state.selectedDate, DateTime(2026, 10, 19));

      final slow = Completer<Result<List<SchedulePerson>>>();
      when(() => repo.getTeamWeek(any())).thenAnswer((_) => slow.future);
      final loading = cubit.load();
      await cubit.close();
      slow.complete(Ok(team(const [])));
      await expectLater(loading, completes);
    });
  });
}
