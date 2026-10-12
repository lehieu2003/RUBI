import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Một ca của một người, như Quản lý nhìn thấy.
class TeamShiftEntry extends Equatable {
  const TeamShiftEntry({
    required this.personName,
    required this.role,
    required this.shift,
  });

  final String personName;
  final UserRole role;

  /// Luôn có [Shift.id] (lịch của Quản lý), dùng để duyệt / từ chối.
  final Shift shift;

  @override
  List<Object?> get props => [personName, role, shift];
}

/// Một khung giờ của một ngày và những người có ca ở đó.
class TeamSlot extends Equatable {
  const TeamSlot({required this.slot, required this.entries});

  final ShiftSlot slot;
  final List<TeamShiftEntry> entries;

  @override
  List<Object?> get props => [slot, entries];
}

abstract final class TeamScheduleRules {
  /// Các khung giờ của [date] có người đăng ký, theo thứ tự trong ngày. Trong
  /// mỗi khung: chờ duyệt trước, rồi đã duyệt, rồi bị từ chối; cùng trạng thái
  /// thì theo tên.
  static List<TeamSlot> slotsOf(List<SchedulePerson> people, DateTime date) {
    final bySlot = <ShiftSlot, List<TeamShiftEntry>>{};
    for (final person in people) {
      for (final shift in person.shifts) {
        if (shift.date != date) continue;
        bySlot.putIfAbsent(shift.slot, () => []).add(
              TeamShiftEntry(
                personName: person.name,
                role: person.role,
                shift: shift,
              ),
            );
      }
    }
    return [
      for (final slot in ShiftSlot.values)
        if (bySlot[slot] case final entries?)
          TeamSlot(
            slot: slot,
            entries: entries
              ..sort((a, b) {
                final byStatus = _order(a.shift.status) - _order(b.shift.status);
                return byStatus != 0
                    ? byStatus
                    : a.personName.compareTo(b.personName);
              }),
          ),
    ];
  }

  /// Mọi yêu cầu đang chờ duyệt trong tuần.
  static List<Shift> pending(List<SchedulePerson> people) => [
        for (final person in people)
          for (final shift in person.shifts)
            if (shift.status == ShiftStatus.pending) shift,
      ];

  static int _order(ShiftStatus status) => switch (status) {
        ShiftStatus.pending => 0,
        ShiftStatus.approved => 1,
        ShiftStatus.rejected => 2,
      };
}
