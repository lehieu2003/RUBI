import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

const _weekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

String _two(int value) => value.toString().padLeft(2, '0');

/// "12/10".
String scheduleDayLabel(DateTime date) => '${_two(date.day)}/${_two(date.month)}';

/// "06:00 – 09:00".
String shiftSlotLabel(ShiftSlot slot) =>
    '${_two(slot.startHour)}:00 – ${_two(slot.endHour)}:00';

/// "◀ Tuần 12/10 – 18/10 ▶". Dùng chung cho màn đăng ký ca và màn duyệt ca.
class WeekNavBar extends StatelessWidget {
  const WeekNavBar({
    super.key,
    required this.weekStart,
    required this.onShowWeek,
  });

  /// Thứ Hai của tuần đang xem.
  final DateTime weekStart;

  /// -1: tuần trước, +1: tuần sau.
  final ValueChanged<int> onShowWeek;

  @override
  Widget build(BuildContext context) {
    final weekEnd =
        DateTime(weekStart.year, weekStart.month, weekStart.day + 6);
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
      child: Row(
        children: [
          IconButton(
            onPressed: () => onShowWeek(-1),
            tooltip: AppStrings.prevWeekTooltip,
            icon: const Icon(Icons.chevron_left),
          ),
          Expanded(
            child: Text(
              AppStrings.weekLabel(
                scheduleDayLabel(weekStart),
                scheduleDayLabel(weekEnd),
              ),
              textAlign: TextAlign.center,
              style: context.textTheme.titleMedium,
            ),
          ),
          IconButton(
            onPressed: () => onShowWeek(1),
            tooltip: AppStrings.nextWeekTooltip,
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }
}

/// Dải 7 ngày của tuần; ngày được [isMarked] thì có chấm.
class WeekDayStrip extends StatelessWidget {
  const WeekDayStrip({
    super.key,
    required this.weekStart,
    required this.selectedDate,
    required this.isMarked,
    required this.onSelect,
    this.today,
  });

  final DateTime weekStart;
  final DateTime selectedDate;

  /// "Hôm nay" theo server; `null` khi chưa biết.
  final DateTime? today;
  final bool Function(DateTime date) isMarked;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final start = weekStart;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          for (var index = 0; index < 7; index++)
            () {
              final date = DateTime(start.year, start.month, start.day + index);
              final selected = date == selectedDate;
              final isToday = date == today;
              final marked = isMarked(date);
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Material(
                    color: selected
                        ? colorScheme.primary
                        : colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      key: Key('schedule_day_$index'),
                      onTap: () => onSelect(date),
                      borderRadius: BorderRadius.circular(12),
                      child: Semantics(
                        selected: selected,
                        label: isToday ? AppStrings.scheduleToday : null,
                        child: SizedBox(
                          height: 64,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                _weekdayLabels[index],
                                style: context.textTheme.labelMedium?.copyWith(
                                  color: selected
                                      ? colorScheme.onPrimary
                                      : colorScheme.onSurfaceVariant,
                                ),
                              ),
                              Text(
                                '${date.day}',
                                style: context.textTheme.titleMedium?.copyWith(
                                  color: selected
                                      ? colorScheme.onPrimary
                                      : colorScheme.onSurface,
                                  fontWeight: isToday
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                ),
                              ),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: !marked
                                      ? Colors.transparent
                                      : selected
                                          ? colorScheme.onPrimary
                                          : colorScheme.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }(),
        ],
      ),
    );
  }
}
