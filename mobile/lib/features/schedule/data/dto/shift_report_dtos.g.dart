// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'shift_report_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ShiftReportDto _$ShiftReportDtoFromJson(Map<String, dynamic> json) =>
    ShiftReportDto(
      month: json['month'] as String?,
      lockedAt: json['lockedAt'] as String?,
      people: (json['people'] as List<dynamic>?)
          ?.map((e) => ShiftReportPersonDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

ShiftReportPersonDto _$ShiftReportPersonDtoFromJson(
  Map<String, dynamic> json,
) => ShiftReportPersonDto(
  id: json['id'] as String?,
  name: json['name'] as String?,
  role: json['role'] as String?,
  isActive: json['isActive'] as bool?,
  approvedShifts: (json['approvedShifts'] as num?)?.toInt(),
  hours: (json['hours'] as num?)?.toInt(),
  daysWorked: (json['daysWorked'] as num?)?.toInt(),
  pendingShifts: (json['pendingShifts'] as num?)?.toInt(),
  rejectedShifts: (json['rejectedShifts'] as num?)?.toInt(),
  days: (json['days'] as List<dynamic>?)
      ?.map((e) => ShiftReportDayDto.fromJson(e as Map<String, dynamic>))
      .toList(),
);

ShiftReportDayDto _$ShiftReportDayDtoFromJson(Map<String, dynamic> json) =>
    ShiftReportDayDto(
      date: json['date'] as String?,
      shifts: (json['shifts'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );
