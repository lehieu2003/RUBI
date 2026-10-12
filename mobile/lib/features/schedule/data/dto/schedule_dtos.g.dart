// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'schedule_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

WeekScheduleDto _$WeekScheduleDtoFromJson(Map<String, dynamic> json) =>
    WeekScheduleDto(
      userId: json['userId'] as String?,
      today: json['today'] as String?,
      currentHour: (json['currentHour'] as num?)?.toInt(),
      limits: json['limits'] == null
          ? null
          : ShiftLimitsDto.fromJson(json['limits'] as Map<String, dynamic>),
      lockedMonths: (json['lockedMonths'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      people: (json['people'] as List<dynamic>?)
          ?.map((e) => SchedulePersonDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

ShiftLimitsDto _$ShiftLimitsDtoFromJson(Map<String, dynamic> json) =>
    ShiftLimitsDto(
      staff: (json['STAFF'] as num?)?.toInt(),
      driver: (json['DRIVER'] as num?)?.toInt(),
    );

SchedulePersonDto _$SchedulePersonDtoFromJson(Map<String, dynamic> json) =>
    SchedulePersonDto(
      id: json['id'] as String?,
      name: json['name'] as String?,
      role: json['role'] as String?,
      shifts: (json['shifts'] as List<dynamic>?)
          ?.map((e) => ShiftDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

ShiftDto _$ShiftDtoFromJson(Map<String, dynamic> json) => ShiftDto(
  id: json['id'] as String?,
  shiftDate: json['shiftDate'] as String?,
  shift: json['shift'] as String?,
  status: json['status'] as String?,
);

RequestShiftDataDto _$RequestShiftDataDtoFromJson(Map<String, dynamic> json) =>
    RequestShiftDataDto(
      shift: json['shift'] == null
          ? null
          : ShiftDto.fromJson(json['shift'] as Map<String, dynamic>),
    );
