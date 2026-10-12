import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/schedule_dtos.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Chuyển DTO của `/api/schedule/my` → domain.
///
/// Trả `Err(UnexpectedFailure)` cho payload thiếu/broken thay vì ném exception
/// (field SAI KIỂU đã ném TypeError ở DTO — repository giữ lại trong Result).
/// Khung giờ, trạng thái, vai trò lạ đều là lỗi: không suy mặc định, vì hiển
/// thị sai ca hay sai trạng thái duyệt là sai dữ liệu chấm công.
abstract final class ScheduleMapper {
  static final _dateOnly = RegExp(r'^\d{4}-\d{2}-\d{2}$');
  static final _month = RegExp(r'^\d{4}-(0[1-9]|1[0-2])$');

  static Result<WeekSchedule> fromDto(WeekScheduleDto dto) {
    final userId = MappingValidator.nonEmpty(dto.userId);
    if (userId == null) {
      return Err(MappingValidator.missing('Schedule', 'userId'));
    }

    final today = parseDateOnly(dto.today);
    if (today == null) {
      return const Err(
        UnexpectedFailure('Schedule payload missing/unparseable `today`'),
      );
    }

    final currentHour = dto.currentHour;
    if (currentHour == null || currentHour < 0 || currentHour > 23) {
      return const Err(
        UnexpectedFailure('Schedule payload missing/invalid `currentHour`'),
      );
    }

    final limits = dto.limits;
    if (limits == null) {
      return Err(MappingValidator.missing('Schedule', 'limits'));
    }

    final lockedMonths = dto.lockedMonths;
    if (lockedMonths == null) {
      return Err(MappingValidator.missing('Schedule', 'lockedMonths'));
    }
    if (lockedMonths.any((month) => !_month.hasMatch(month))) {
      return const Err(
        UnexpectedFailure('Schedule payload has malformed `lockedMonths`'),
      );
    }

    final rawPeople = dto.people;
    if (rawPeople == null) {
      return Err(MappingValidator.missing('Schedule', 'people'));
    }
    final people = <SchedulePerson>[];
    for (final personDto in rawPeople) {
      switch (fromPersonDto(personDto)) {
        case Ok<SchedulePerson>(:final value):
          people.add(value);
        case Err<SchedulePerson>(:final failure):
          return Err(failure);
      }
    }

    return Ok(
      WeekSchedule(
        userId: userId,
        today: today,
        currentHour: currentHour,
        staffLimit: limits.staff,
        driverLimit: limits.driver,
        lockedMonths: lockedMonths,
        people: people,
      ),
    );
  }

  static Result<SchedulePerson> fromPersonDto(SchedulePersonDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) {
      return Err(MappingValidator.missing('Schedule person', 'id'));
    }
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) {
      return Err(MappingValidator.missing('Schedule person', 'name'));
    }

    final role = UserRole.fromName(dto.role);
    if (role != UserRole.staff && role != UserRole.driver) {
      return Err(UnexpectedFailure('Unknown schedule role: ${dto.role}'));
    }

    final rawShifts = dto.shifts;
    if (rawShifts == null) {
      return Err(MappingValidator.missing('Schedule person', 'shifts'));
    }
    final shifts = <Shift>[];
    for (final shiftDto in rawShifts) {
      switch (fromShiftDto(shiftDto)) {
        case Ok<Shift>(:final value):
          shifts.add(value);
        case Err<Shift>(:final failure):
          return Err(failure);
      }
    }

    return Ok(SchedulePerson(id: id, name: name, role: role!, shifts: shifts));
  }

  static Result<Shift> fromShiftDto(ShiftDto dto) {
    final date = parseDateOnly(dto.shiftDate);
    if (date == null) {
      return const Err(
        UnexpectedFailure('Shift payload missing/unparseable `shiftDate`'),
      );
    }
    final slot = ShiftSlot.fromName(dto.shift);
    if (slot == null) {
      return Err(UnexpectedFailure('Unknown shift slot: ${dto.shift}'));
    }
    final status = ShiftStatus.fromName(dto.status);
    if (status == null) {
      return Err(UnexpectedFailure('Unknown shift status: ${dto.status}'));
    }
    return Ok(Shift(date: date, slot: slot, status: status));
  }

  /// `yyyy-MM-dd` → 00:00 local của ngày đó; `null` nếu thiếu, sai định dạng
  /// hoặc không phải ngày có thật (VD `2026-02-31`).
  static DateTime? parseDateOnly(String? value) {
    if (value == null || !_dateOnly.hasMatch(value)) return null;
    final year = int.parse(value.substring(0, 4));
    final month = int.parse(value.substring(5, 7));
    final day = int.parse(value.substring(8, 10));
    final date = DateTime(year, month, day);
    // DateTime tự cuộn ngày không có thật sang tháng sau — coi là hỏng.
    if (date.month != month || date.day != day) return null;
    return date;
  }
}
