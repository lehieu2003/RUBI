import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Bảng công một tháng: ca đã duyệt, giờ và ngày công của từng người.
class ShiftReport extends Equatable {
  const ShiftReport({
    required this.month,
    required this.people,
    this.lockedAt,
  });

  /// Ngày đầu của tháng.
  final DateTime month;

  /// Chỉ những người có ít nhất một ca trong tháng.
  final List<ShiftReportPerson> people;

  /// Thời điểm chốt công; `null` khi tháng còn mở.
  final DateTime? lockedAt;

  bool get isLocked => lockedAt != null;

  int get totalShifts =>
      people.fold(0, (sum, person) => sum + person.approvedShifts);
  int get totalHours => people.fold(0, (sum, person) => sum + person.hours);
  int get pendingShifts =>
      people.fold(0, (sum, person) => sum + person.pendingShifts);

  @override
  List<Object?> get props => [month, people, lockedAt];
}

/// Công của một người trong tháng.
class ShiftReportPerson extends Equatable {
  const ShiftReportPerson({
    required this.id,
    required this.name,
    required this.role,
    required this.isActive,
    required this.approvedShifts,
    required this.hours,
    required this.daysWorked,
    required this.pendingShifts,
    required this.rejectedShifts,
    this.days = const [],
  });

  final String id;
  final String name;
  final UserRole role;

  /// `false`: tài khoản đã khóa (vẫn tính công các ca đã làm).
  final bool isActive;
  final int approvedShifts;

  /// Giờ công = số ca đã duyệt × 3.
  final int hours;
  final int daysWorked;
  final int pendingShifts;
  final int rejectedShifts;

  /// Các ngày có ca đã duyệt, kèm khung giờ.
  final List<ShiftReportDay> days;

  @override
  List<Object?> get props => [
        id,
        name,
        role,
        isActive,
        approvedShifts,
        hours,
        daysWorked,
        pendingShifts,
        rejectedShifts,
        days,
      ];
}

/// Các ca đã duyệt của một người trong một ngày.
class ShiftReportDay extends Equatable {
  const ShiftReportDay({required this.date, required this.slots});

  final DateTime date;
  final List<ShiftSlot> slots;

  @override
  List<Object?> get props => [date, slots];
}
