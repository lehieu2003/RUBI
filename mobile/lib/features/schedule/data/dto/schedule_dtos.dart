// DTOs cho các response của `/api/schedule/my` (envelope `{ success, data|error }`).
//
// Parse dạng nullable, không validate: field SAI KIỂU ném TypeError ngay tại
// đây (cố tình để rẻ), và repository biến mọi exception — kể cả TypeError —
// thành `Err(UnexpectedFailure)` nên callers chỉ bao giờ thấy `Result`,
// không có exception nào xuyên lớp.

/// `data` của `GET /api/schedule/my`.
class WeekScheduleDto {
  const WeekScheduleDto({
    this.userId,
    this.today,
    this.currentHour,
    this.limits,
    this.lockedMonths,
    this.people,
  });

  factory WeekScheduleDto.fromJson(Map<String, dynamic> json) {
    final limitsJson = json['limits'];
    final rawLockedMonths = json['lockedMonths'];
    final rawPeople = json['people'];
    return WeekScheduleDto(
      userId: json['userId'] as String?,
      today: json['today'] as String?,
      currentHour: json['currentHour'] as int?,
      limits: limitsJson is Map<String, dynamic>
          ? ShiftLimitsDto.fromJson(limitsJson)
          : null,
      lockedMonths: rawLockedMonths is List
          ? rawLockedMonths.map((e) => e as String).toList()
          : null,
      people: rawPeople is List
          ? rawPeople
              .map((e) => SchedulePersonDto.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  final String? userId;

  /// `yyyy-MM-dd` theo giờ Việt Nam.
  final String? today;
  final int? currentHour;
  final ShiftLimitsDto? limits;

  /// Mỗi phần tử dạng `yyyy-MM`.
  final List<String>? lockedMonths;
  final List<SchedulePersonDto>? people;
}

/// Object `limits` — `null` ở từng field nghĩa là không giới hạn.
class ShiftLimitsDto {
  const ShiftLimitsDto({this.staff, this.driver});

  factory ShiftLimitsDto.fromJson(Map<String, dynamic> json) => ShiftLimitsDto(
        staff: json['STAFF'] as int?,
        driver: json['DRIVER'] as int?,
      );

  final int? staff;
  final int? driver;
}

/// Một phần tử của `data.people`.
class SchedulePersonDto {
  const SchedulePersonDto({this.id, this.name, this.role, this.shifts});

  factory SchedulePersonDto.fromJson(Map<String, dynamic> json) {
    final rawShifts = json['shifts'];
    return SchedulePersonDto(
      id: json['id'] as String?,
      name: json['name'] as String?,
      role: json['role'] as String?,
      shifts: rawShifts is List
          ? rawShifts
              .map((e) => ShiftDto.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  final String? id;
  final String? name;

  /// Giá trị server gửi: `STAFF | DRIVER`.
  final String? role;
  final List<ShiftDto>? shifts;
}

/// Một ca: phần tử của `people[].shifts` và `data.shift` của
/// `POST /api/schedule/my`.
class ShiftDto {
  const ShiftDto({this.shiftDate, this.shift, this.status});

  factory ShiftDto.fromJson(Map<String, dynamic> json) => ShiftDto(
        shiftDate: json['shiftDate'] as String?,
        shift: json['shift'] as String?,
        status: json['status'] as String?,
      );

  /// `yyyy-MM-dd`.
  final String? shiftDate;

  /// `SLOT_00_03` ... `SLOT_21_24`.
  final String? shift;

  /// `PENDING | APPROVED | REJECTED`.
  final String? status;
}

/// `data` của `POST /api/schedule/my`.
class RequestShiftDataDto {
  const RequestShiftDataDto({this.shift});

  factory RequestShiftDataDto.fromJson(Map<String, dynamic> json) {
    final shiftJson = json['shift'];
    return RequestShiftDataDto(
      shift: shiftJson is Map<String, dynamic>
          ? ShiftDto.fromJson(shiftJson)
          : null,
    );
  }

  final ShiftDto? shift;
}
