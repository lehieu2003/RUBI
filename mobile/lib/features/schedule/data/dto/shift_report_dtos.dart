// DTOs cho bảng công: `GET /api/reports/shifts`,
// `POST /api/reports/shifts/lock` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`shift_report_dtos.g.dart`; sửa file
// này xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'shift_report_dtos.g.dart';

/// `data` của `GET /api/reports/shifts`.
@JsonSerializable(createToJson: false)
class ShiftReportDto {
  const ShiftReportDto({this.month, this.lockedAt, this.people});

  factory ShiftReportDto.fromJson(Map<String, dynamic> json) =>
      _$ShiftReportDtoFromJson(json);

  /// `YYYY-MM`.
  final String? month;

  /// `null` hợp lệ: tháng còn mở.
  final String? lockedAt;
  final List<ShiftReportPersonDto>? people;
}

@JsonSerializable(createToJson: false)
class ShiftReportPersonDto {
  const ShiftReportPersonDto({
    this.id,
    this.name,
    this.role,
    this.isActive,
    this.approvedShifts,
    this.hours,
    this.daysWorked,
    this.pendingShifts,
    this.rejectedShifts,
    this.days,
  });

  factory ShiftReportPersonDto.fromJson(Map<String, dynamic> json) =>
      _$ShiftReportPersonDtoFromJson(json);

  final String? id;
  final String? name;
  final String? role;
  final bool? isActive;
  final int? approvedShifts;
  final int? hours;
  final int? daysWorked;
  final int? pendingShifts;
  final int? rejectedShifts;
  final List<ShiftReportDayDto>? days;
}

@JsonSerializable(createToJson: false)
class ShiftReportDayDto {
  const ShiftReportDayDto({this.date, this.shifts});

  factory ShiftReportDayDto.fromJson(Map<String, dynamic> json) =>
      _$ShiftReportDayDtoFromJson(json);

  /// `YYYY-MM-DD`.
  final String? date;

  /// Giá trị khung giờ của server (`SLOT_09_12`...).
  final List<String>? shifts;
}
