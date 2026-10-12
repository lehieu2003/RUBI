import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Vì sao một khung giờ không đăng ký / huỷ được nữa. Cùng luật với màn
/// "Ca làm của tôi" trên web và với server (`/api/schedule/my`).
enum SlotBlock {
  /// Ngày đã qua.
  past,

  /// Khung giờ của hôm nay đã kết thúc.
  ended,

  /// Tháng đã chốt bảng công.
  locked,

  /// Đủ số người cùng vai trò (chỉ chặn khi mình chưa có ca này).
  full,
}

/// Một khung giờ của một ngày, nhìn từ phía người đang đăng nhập.
class SlotInfo extends Equatable {
  const SlotInfo({
    required this.slot,
    required this.mine,
    required this.others,
    required this.block,
  });

  final ShiftSlot slot;

  /// Trạng thái ca của mình ở khung giờ này; `null` nếu chưa đăng ký.
  final ShiftStatus? mine;

  /// Tên những người khác đã có ca này (ca bị từ chối của họ server đã ẩn).
  final List<String> others;

  /// `null` khi còn thao tác được.
  final SlotBlock? block;

  @override
  List<Object?> get props => [slot, mine, others, block];
}

abstract final class ShiftRules {
  /// Thứ Hai của tuần chứa [date] (00:00 local).
  static DateTime mondayOf(DateTime date) =>
      DateTime(date.year, date.month, date.day - (date.weekday - 1));

  /// Tám khung giờ của [date] trong [week].
  static List<SlotInfo> slotsOf(WeekSchedule week, DateTime date) {
    final me = week.people.where((person) => person.id == week.userId).firstOrNull;
    final limit = switch (me?.role) {
      UserRole.driver => week.driverLimit,
      UserRole.staff => week.staffLimit,
      _ => null,
    };
    final month =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}';
    final isPast = date.isBefore(week.today);
    final isLocked = week.lockedMonths.contains(month);
    final isToday = date == week.today;

    bool has(SchedulePerson person, ShiftSlot slot) =>
        person.shifts.any((shift) => shift.date == date && shift.slot == slot);

    return [
      for (final slot in ShiftSlot.values)
        () {
          final mine = me?.shifts
              .where((shift) => shift.date == date && shift.slot == slot)
              .firstOrNull
              ?.status;
          final others = week.people
              .where((person) => person.id != week.userId && has(person, slot))
              .toList();
          final sameRole =
              others.where((person) => person.role == me?.role).length;
          final SlotBlock? block;
          if (isPast) {
            block = SlotBlock.past;
          } else if (isLocked) {
            block = SlotBlock.locked;
          } else if (isToday && slot.endHour <= week.currentHour) {
            block = SlotBlock.ended;
          } else if (mine == null && limit != null && sameRole >= limit) {
            block = SlotBlock.full;
          } else {
            block = null;
          }
          return SlotInfo(
            slot: slot,
            mine: mine,
            others: [for (final person in others) person.name],
            block: block,
          );
        }(),
    ];
  }

  /// Số ca của mình trong tuần theo trạng thái.
  static int countMine(WeekSchedule week, ShiftStatus status) {
    final me = week.people.where((person) => person.id == week.userId).firstOrNull;
    return me?.shifts.where((shift) => shift.status == status).length ?? 0;
  }
}
