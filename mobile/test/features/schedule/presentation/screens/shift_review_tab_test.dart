import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/team_schedule_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/screens/shift_review_tab.dart';
import 'package:mocktail/mocktail.dart';

class _MockTeamScheduleRepository extends Mock implements TeamScheduleRepository {}

void main() {
  setUpAll(() => registerFallbackValue(DateTime(2026)));

  // Thứ Tư 14/10/2026. Tuần: 12/10 – 18/10.
  final now = DateTime(2026, 10, 14, 10);
  final today = DateTime(2026, 10, 14);
  final tomorrow = DateTime(2026, 10, 15);

  Shift shift(String id, DateTime date, ShiftSlot slot, ShiftStatus status) =>
      Shift(id: id, date: date, slot: slot, status: status);

  List<SchedulePerson> team({ShiftStatus first = ShiftStatus.pending}) => [
        SchedulePerson(id: 'u1', name: 'Phạm Văn Tài', role: UserRole.driver, shifts: [
          shift('s1', today, ShiftSlot.slot09To12, first),
          shift('s3', tomorrow, ShiftSlot.slot21To24, ShiftStatus.pending),
        ]),
        SchedulePerson(id: 'u2', name: 'Lê Văn Lên Đơn', role: UserRole.staff, shifts: [
          shift('s2', today, ShiftSlot.slot09To12, ShiftStatus.approved),
        ]),
      ];

  late _MockTeamScheduleRepository repo;

  setUp(() {
    repo = _MockTeamScheduleRepository();
    sl.registerFactory<TeamScheduleCubit>(
      () => TeamScheduleCubit(repo: repo, now: () => now),
    );
  });

  tearDown(() => sl.unregister<TeamScheduleCubit>());

  Future<void> pumpTab(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ShiftReviewTab()));
    await tester.pump();
  }

  Finder entry(String id) => find.byKey(Key('shift_review_entry_$id'));
  Finder inEntry(String id, String text) =>
      find.descendant(of: entry(id), matching: find.text(text));

  group('ShiftReviewTab', () {
    testWidgets('hôm nay: ai làm ca nào, vai trò, trạng thái; chỉ yêu cầu chờ '
        'duyệt có nút', (tester) async {
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => Ok(team()));
      await pumpTab(tester);

      expect(find.text('Tuần 12/10 – 18/10'), findsOneWidget);
      expect(find.text(AppStrings.shiftReviewPendingCount(2)), findsOneWidget);
      expect(find.text('09:00 – 12:00'), findsOneWidget);
      expect(inEntry('s1', 'Phạm Văn Tài'), findsOneWidget);
      expect(inEntry('s1', AppStrings.approveButton), findsOneWidget);
      expect(inEntry('s1', AppStrings.rejectButton), findsOneWidget);
      expect(inEntry('s2', 'Lê Văn Lên Đơn'), findsOneWidget);
      expect(inEntry('s2', AppStrings.approveButton), findsNothing);
      expect(
        find.descendant(
          of: entry('s2'),
          matching: find.textContaining(AppStrings.roleStaff, findRichText: true),
        ),
        findsOneWidget,
      );
    });

    testWidgets('bấm Duyệt → gửi đúng ca, báo kết quả, nút biến mất',
        (tester) async {
      var loads = 0;
      when(() => repo.getTeamWeek(any())).thenAnswer(
        (_) async => Ok(team(first: loads++ == 0 ? ShiftStatus.pending : ShiftStatus.approved)),
      );
      when(() => repo.reviewShifts(shiftIds: any(named: 'shiftIds'), approve: any(named: 'approve')))
          .thenAnswer((_) async => const Ok(1));
      await pumpTab(tester);

      await tester.tap(inEntry('s1', AppStrings.approveButton));
      await tester.pump();
      await tester.pump();

      verify(() => repo.reviewShifts(shiftIds: ['s1'], approve: true)).called(1);
      expect(find.text(AppStrings.shiftsApproved(1)), findsOneWidget);
      expect(inEntry('s1', AppStrings.approveButton), findsNothing);
      expect(find.text(AppStrings.shiftReviewPendingCount(1)), findsOneWidget);
    });

    testWidgets('bấm Từ chối → gửi approve: false', (tester) async {
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => Ok(team()));
      when(() => repo.reviewShifts(shiftIds: any(named: 'shiftIds'), approve: any(named: 'approve')))
          .thenAnswer((_) async => const Ok(1));
      await pumpTab(tester);

      await tester.tap(inEntry('s1', AppStrings.rejectButton));
      await tester.pump();
      await tester.pump();

      verify(() => repo.reviewShifts(shiftIds: ['s1'], approve: false)).called(1);
      expect(find.text(AppStrings.shiftsRejected(1)), findsOneWidget);
    });

    testWidgets('Duyệt tất cả: hỏi lại, rồi gửi mọi yêu cầu chờ của cả tuần',
        (tester) async {
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => Ok(team()));
      when(() => repo.reviewShifts(shiftIds: any(named: 'shiftIds'), approve: any(named: 'approve')))
          .thenAnswer((_) async => const Ok(2));
      await pumpTab(tester);

      await tester.tap(find.byKey(const Key('shift_review_approve_all')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.approveAllBody(2)), findsOneWidget);
      // Huỷ thì không gửi gì.
      await tester.tap(find.text(AppStrings.cancelButton));
      await tester.pumpAndSettle();
      verifyNever(() => repo.reviewShifts(shiftIds: any(named: 'shiftIds'), approve: any(named: 'approve')));

      await tester.tap(find.byKey(const Key('shift_review_approve_all')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(AppStrings.approveAllButton).last);
      await tester.pumpAndSettle();

      verify(() => repo.reviewShifts(shiftIds: ['s1', 's3'], approve: true)).called(1);
      expect(find.text(AppStrings.shiftsApproved(2)), findsOneWidget);
    });

    testWidgets('ngày không có ca → câu báo; tuần không còn yêu cầu → không có '
        'nút Duyệt tất cả', (tester) async {
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => const Ok([]));
      await pumpTab(tester);

      expect(find.text(AppStrings.shiftReviewEmptyDay), findsOneWidget);
      expect(find.text(AppStrings.shiftReviewNonePending), findsOneWidget);
      expect(find.byKey(const Key('shift_review_approve_all')), findsNothing);
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getTeamWeek(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpTab(tester);

      expect(find.text(FailureMessages.network), findsOneWidget);
      when(() => repo.getTeamWeek(any())).thenAnswer((_) async => Ok(team()));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();
      await tester.pump();
      expect(inEntry('s1', 'Phạm Văn Tài'), findsOneWidget);
    });

    testWidgets('điện thoại hẹp (360dp), tên dài → không tràn bố cục',
        (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      when(() => repo.getTeamWeek(any())).thenAnswer(
        (_) async => Ok([
          for (final name in [
            'Nguyễn Hoàng Thiên Phúc Trường An Bình Minh',
            'Trần Thị Ngọc Bảo Châu Minh Khuê Thanh Tâm',
          ])
            SchedulePerson(id: name, name: name, role: UserRole.driver, shifts: [
              shift('p-$name', today, ShiftSlot.slot09To12, ShiftStatus.pending),
              shift('a-$name', today, ShiftSlot.slot12To15, ShiftStatus.approved),
              shift('r-$name', today, ShiftSlot.slot15To18, ShiftStatus.rejected),
            ]),
        ]),
      );
      await pumpTab(tester);

      expect(find.text(AppStrings.approveButton), findsNWidgets(2));
      expect(tester.takeException(), isNull);
    });
  });
}
