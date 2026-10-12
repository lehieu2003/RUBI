import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/team_schedule_rules.dart';

void main() {
  final tue = DateTime(2026, 10, 13);
  final wed = DateTime(2026, 10, 14);

  Shift shift(String id, DateTime date, ShiftSlot slot, ShiftStatus status) =>
      Shift(id: id, date: date, slot: slot, status: status);

  final people = [
    SchedulePerson(id: 'u1', name: 'Vân', role: UserRole.staff, shifts: [
      shift('s1', tue, ShiftSlot.slot09To12, ShiftStatus.approved),
    ]),
    SchedulePerson(id: 'u2', name: 'Tài', role: UserRole.driver, shifts: [
      shift('s2', tue, ShiftSlot.slot09To12, ShiftStatus.pending),
      shift('s3', tue, ShiftSlot.slot06To09, ShiftStatus.rejected),
      shift('s4', wed, ShiftSlot.slot21To24, ShiftStatus.pending),
    ]),
    SchedulePerson(id: 'u3', name: 'An', role: UserRole.driver, shifts: [
      shift('s5', tue, ShiftSlot.slot09To12, ShiftStatus.pending),
    ]),
    const SchedulePerson(id: 'u4', name: 'Rảnh', role: UserRole.staff, shifts: []),
  ];

  group('TeamScheduleRules.slotsOf', () {
    test('chỉ các khung giờ có người, theo thứ tự trong ngày', () {
      final slots = TeamScheduleRules.slotsOf(people, tue);
      expect(slots.map((slot) => slot.slot),
          [ShiftSlot.slot06To09, ShiftSlot.slot09To12]);
    });

    test('trong một khung: chờ duyệt trước (theo tên), rồi đã duyệt', () {
      final slot = TeamScheduleRules.slotsOf(people, tue)
          .firstWhere((slot) => slot.slot == ShiftSlot.slot09To12);
      expect(slot.entries.map((entry) => entry.shift.id), ['s5', 's2', 's1']);
      expect(slot.entries.first.personName, 'An');
      expect(slot.entries.first.role, UserRole.driver);
    });

    test('ngày không ai đăng ký → rỗng', () {
      expect(TeamScheduleRules.slotsOf(people, DateTime(2026, 10, 18)), isEmpty);
    });
  });

  test('pending: mọi yêu cầu chờ duyệt của cả tuần, không gồm ca khác', () {
    expect(TeamScheduleRules.pending(people).map((shift) => shift.id),
        ['s2', 's4', 's5']);
  });
}
