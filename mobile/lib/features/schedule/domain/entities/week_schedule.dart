import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';

/// Khung giờ làm 3 tiếng — khớp giá trị server gửi (`SLOT_00_03`...).
enum ShiftSlot {
  slot00To03('SLOT_00_03', 0, 3),
  slot03To06('SLOT_03_06', 3, 6),
  slot06To09('SLOT_06_09', 6, 9),
  slot09To12('SLOT_09_12', 9, 12),
  slot12To15('SLOT_12_15', 12, 15),
  slot15To18('SLOT_15_18', 15, 18),
  slot18To21('SLOT_18_21', 18, 21),
  slot21To24('SLOT_21_24', 21, 24);

  const ShiftSlot(this.wireName, this.startHour, this.endHour);

  /// Giá trị gửi/nhận qua API.
  final String wireName;
  final int startHour;

  /// Giờ kết thúc (24 cho ca cuối ngày). Server từ chối ca của hôm nay khi
  /// `endHour <= currentHour`.
  final int endHour;

  /// Returns `null` for unknown/absent values — không suy mặc định một
  /// khung giờ khác (giống [UserRole.fromName]).
  static ShiftSlot? fromName(String? name) {
    for (final slot in values) {
      if (slot.wireName == name) return slot;
    }
    return null;
  }
}

/// Trạng thái duyệt của một ca — khớp giá trị server gửi.
enum ShiftStatus {
  pending,
  approved,
  rejected;

  /// Returns `null` for unknown/absent values — ca chưa duyệt không được
  /// hiển thị nhầm thành đã duyệt (hay ngược lại).
  static ShiftStatus? fromName(String? name) {
    return switch (name) {
      'PENDING' => pending,
      'APPROVED' => approved,
      'REJECTED' => rejected,
      _ => null,
    };
  }
}

/// Một ca đã đăng ký của một người.
class Shift extends Equatable {
  const Shift({required this.date, required this.slot, required this.status});

  /// Ngày của ca (chỉ năm/tháng/ngày, 00:00 local) — server gửi `yyyy-MM-dd`
  /// theo ngày Việt Nam, không kèm múi giờ.
  final DateTime date;
  final ShiftSlot slot;
  final ShiftStatus status;

  @override
  List<Object?> get props => [date, slot, status];
}

/// Một người (nhân viên / tài xế) và các ca của họ trong tuần.
class SchedulePerson extends Equatable {
  const SchedulePerson({
    required this.id,
    required this.name,
    required this.role,
    required this.shifts,
  });

  final String id;
  final String name;

  /// Chỉ `staff` hoặc `driver` (Quản lý không đăng ký ca).
  final UserRole role;

  /// Ca REJECTED của người khác đã bị server ẩn; của chính mình thì còn.
  final List<Shift> shifts;

  @override
  List<Object?> get props => [id, name, role, shifts];
}

/// Lịch cả nhóm trong 7 ngày kể từ ngày được hỏi, kèm dữ liệu để biết ca nào
/// còn đăng ký được.
class WeekSchedule extends Equatable {
  const WeekSchedule({
    required this.userId,
    required this.today,
    required this.currentHour,
    required this.staffLimit,
    required this.driverLimit,
    required this.lockedMonths,
    required this.people,
  });

  /// Id của người đang đăng nhập — để tìm dòng của mình trong [people].
  final String userId;

  /// "Hôm nay" theo giờ Việt Nam (00:00 local) — dùng giá trị này thay vì
  /// đồng hồ của máy để khớp cách server chặn ngày đã qua.
  final DateTime today;

  /// Giờ hiện tại theo giờ Việt Nam (0–23).
  final int currentHour;

  /// Số người tối đa mỗi ca theo vai trò; `null` = không giới hạn.
  final int? staffLimit;
  final int? driverLimit;

  /// Các tháng (`yyyy-MM`) đã chốt bảng công — không đổi ca được nữa.
  final List<String> lockedMonths;
  final List<SchedulePerson> people;

  @override
  List<Object?> get props => [
        userId,
        today,
        currentHour,
        staffLimit,
        driverLimit,
        lockedMonths,
        people,
      ];
}
