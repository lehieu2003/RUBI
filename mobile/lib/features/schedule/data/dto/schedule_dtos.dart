// DTOs cho các response của `/api/schedule/my` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`schedule_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate: field SAI KIỂU ném TypeError ngay tại đây (cố tình để rẻ), và
// repository biến mọi exception — kể cả TypeError — thành
// `Err(UnexpectedFailure)` nên callers chỉ bao giờ thấy `Result`, không có
// exception nào xuyên lớp.
import 'package:json_annotation/json_annotation.dart';

part 'schedule_dtos.g.dart';

/// `data` của `GET /api/schedule/my`.
@JsonSerializable(createToJson: false)
class WeekScheduleDto {
  const WeekScheduleDto({
    this.userId,
    this.today,
    this.currentHour,
    this.limits,
    this.lockedMonths,
    this.people,
  });

  factory WeekScheduleDto.fromJson(Map<String, dynamic> json) =>
      _$WeekScheduleDtoFromJson(json);

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
@JsonSerializable(createToJson: false)
class ShiftLimitsDto {
  const ShiftLimitsDto({this.staff, this.driver});

  factory ShiftLimitsDto.fromJson(Map<String, dynamic> json) =>
      _$ShiftLimitsDtoFromJson(json);

  @JsonKey(name: 'STAFF')
  final int? staff;
  @JsonKey(name: 'DRIVER')
  final int? driver;
}

/// Một phần tử của `data.people`.
@JsonSerializable(createToJson: false)
class SchedulePersonDto {
  const SchedulePersonDto({this.id, this.name, this.role, this.shifts});

  factory SchedulePersonDto.fromJson(Map<String, dynamic> json) =>
      _$SchedulePersonDtoFromJson(json);

  final String? id;
  final String? name;

  /// Giá trị server gửi: `STAFF | DRIVER`.
  final String? role;
  final List<ShiftDto>? shifts;
}

/// Một ca: phần tử của `people[].shifts` và `data.shift` của
/// `POST /api/schedule/my`.
@JsonSerializable(createToJson: false)
class ShiftDto {
  const ShiftDto({this.shiftDate, this.shift, this.status});

  factory ShiftDto.fromJson(Map<String, dynamic> json) =>
      _$ShiftDtoFromJson(json);

  /// `yyyy-MM-dd`.
  final String? shiftDate;

  /// `SLOT_00_03` ... `SLOT_21_24`.
  final String? shift;

  /// `PENDING | APPROVED | REJECTED`.
  final String? status;
}

/// `data` của `POST /api/schedule/my`.
@JsonSerializable(createToJson: false)
class RequestShiftDataDto {
  const RequestShiftDataDto({this.shift});

  factory RequestShiftDataDto.fromJson(Map<String, dynamic> json) =>
      _$RequestShiftDataDtoFromJson(json);

  final ShiftDto? shift;
}
