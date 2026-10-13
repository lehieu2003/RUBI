import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/shift_report_dtos.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// DTO → entity cho bảng công. Đây là số liệu tính lương: thiếu hay lạ một
/// trường là `Err`, không suy mặc định.
abstract final class ShiftReportMapper {
  /// Ngày theo lịch từ `YYYY-MM-DD` (hoặc `YYYY-MM` với [monthOnly]); `null`
  /// nếu sai định dạng.
  static DateTime? _date(String? value, {bool monthOnly = false}) {
    if (value == null) return null;
    final parts = value.split('-');
    if (parts.length != (monthOnly ? 2 : 3)) return null;
    final numbers = [for (final part in parts) int.tryParse(part)];
    if (numbers.contains(null)) return null;
    return DateTime(numbers[0]!, numbers[1]!, monthOnly ? 1 : numbers[2]!);
  }

  static Result<ShiftReport> fromDto(ShiftReportDto dto) {
    final month = _date(dto.month, monthOnly: true);
    if (month == null) return Err(MappingValidator.missing('Shift report', 'month'));
    final rows = dto.people;
    if (rows == null) return Err(MappingValidator.missing('Shift report', 'people'));
    DateTime? lockedAt;
    if (dto.lockedAt != null) {
      lockedAt = MappingValidator.dateTime(dto.lockedAt);
      if (lockedAt == null) {
        return Err(MappingValidator.missing('Shift report', 'lockedAt'));
      }
    }
    final people = <ShiftReportPerson>[];
    for (final row in rows) {
      switch (_person(row)) {
        case Ok<ShiftReportPerson>(:final value):
          people.add(value);
        case Err<ShiftReportPerson>(:final failure):
          return Err(failure);
      }
    }
    return Ok(ShiftReport(month: month, people: people, lockedAt: lockedAt));
  }

  static Result<ShiftReportPerson> _person(ShiftReportPersonDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Shift report person', 'id'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) {
      return Err(MappingValidator.missing('Shift report person', 'name'));
    }
    final role = UserRole.fromName(dto.role);
    if (role == null) {
      return Err(UnexpectedFailure('Shift report person has unknown role `${dto.role}`'));
    }
    final counts = {
      'isActive': dto.isActive,
      'approvedShifts': dto.approvedShifts,
      'hours': dto.hours,
      'daysWorked': dto.daysWorked,
      'pendingShifts': dto.pendingShifts,
      'rejectedShifts': dto.rejectedShifts,
      'days': dto.days,
    };
    for (final entry in counts.entries) {
      if (entry.value == null) {
        return Err(MappingValidator.missing('Shift report person', entry.key));
      }
    }
    final days = <ShiftReportDay>[];
    for (final day in dto.days!) {
      final date = _date(day.date);
      if (date == null) {
        return Err(MappingValidator.missing('Shift report day', 'date'));
      }
      final slots = <ShiftSlot>[];
      for (final name in day.shifts ?? const <String>[]) {
        final slot = ShiftSlot.fromName(name);
        if (slot == null) {
          return Err(UnexpectedFailure('Shift report day has unknown shift `$name`'));
        }
        slots.add(slot);
      }
      days.add(ShiftReportDay(date: date, slots: slots));
    }
    return Ok(
      ShiftReportPerson(
        id: id,
        name: name,
        role: role,
        isActive: dto.isActive!,
        approvedShifts: dto.approvedShifts!,
        hours: dto.hours!,
        daysWorked: dto.daysWorked!,
        pendingShifts: dto.pendingShifts!,
        rejectedShifts: dto.rejectedShifts!,
        days: days,
      ),
    );
  }
}
