import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/shift_rules.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/widgets/week_widgets.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Tab "Ca làm": lịch tuần của cả nhóm, đăng ký và huỷ ca của chính mình.
///
/// Chọn tuần ở thanh trên, chọn ngày ở dải 7 ngày, rồi bấm vào từng khung
/// giờ. Luật khoá khung giờ nằm ở [ShiftRules].
class ScheduleTab extends StatelessWidget {
  const ScheduleTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ScheduleCubit>(
      // Rời tab unmount cubit → quay lại tải lại từ đầu (như TodayTab).
      create: (_) => sl<ScheduleCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(title: AppStrings.navSchedule),
        body: BlocBuilder<ScheduleCubit, ScheduleState>(
          builder: (context, state) {
            final cubit = context.read<ScheduleCubit>();
            final week = state.week;
            final myShifts = week?.people
                    .where((person) => person.id == week.userId)
                    .expand((person) => person.shifts)
                    .toList() ??
                const <Shift>[];
            return Column(
              children: [
                WeekNavBar(
                  weekStart: state.weekStart,
                  onShowWeek: cubit.showWeek,
                ),
                WeekDayStrip(
                  weekStart: state.weekStart,
                  selectedDate: state.selectedDate,
                  today: week?.today,
                  // Chấm những ngày mình có ca.
                  isMarked: (date) => myShifts.any((shift) => shift.date == date),
                  onSelect: cubit.selectDay,
                ),
                if (week == null && state.status == ViewStatus.error)
                  Expanded(
                    child: ErrorView(
                      message: state.errorMessage,
                      onRetry: cubit.load,
                    ),
                  )
                else if (week == null)
                  const Expanded(
                    child: LoadingView(),
                  )
                else ...[
                  if (state.status == ViewStatus.error)
                    ErrorBanner(
                      message: state.errorMessage ?? '',
                      onRetry: cubit.load,
                    ),
                  _WeekSummary(week: week),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cubit.load,
                      child: ListView(
                        padding: const EdgeInsets.only(bottom: 16),
                        children: [
                          for (final info in state.slots)
                            _SlotTile(
                              info: info,
                              busy: state.busySlot == info.slot,
                              // Một lần chỉ gửi một khung giờ.
                              enabled: state.busySlot == null,
                              onPressed: () => _toggle(context, info),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _toggle(BuildContext context, SlotInfo info) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final result = await context.read<ScheduleCubit>().toggle(info);
    if (result == null) return;
    messenger.showMessage(
      result.message,
      errorColor: result.ok ? null : errorColor,
    );
  }
}

/// Lời nhắc + số ca của mình trong tuần theo trạng thái.
class _WeekSummary extends StatelessWidget {
  const _WeekSummary({required this.week});

  final WeekSchedule week;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;
    String count(String label, ShiftStatus status) =>
        '$label: ${ShiftRules.countMine(week, status)}';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.scheduleHint,
            style: textTheme.bodySmall?.copyWith(color: muted),
          ),
          const SizedBox(height: 4),
          Text(
            [
              count(AppStrings.shiftApproved, ShiftStatus.approved),
              count(AppStrings.shiftPending, ShiftStatus.pending),
              count(AppStrings.shiftRejected, ShiftStatus.rejected),
            ].join(' · '),
            style: textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// Một khung giờ: giờ, ai đã đăng ký, trạng thái của mình, nút thao tác.
class _SlotTile extends StatelessWidget {
  const _SlotTile({
    required this.info,
    required this.busy,
    required this.enabled,
    required this.onPressed,
  });

  final SlotInfo info;
  final bool busy;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final mine = info.mine;
    final block = info.block;

    final (statusLabel, statusColor) = switch (mine) {
      ShiftStatus.approved => (AppStrings.shiftApproved, colorScheme.primary),
      ShiftStatus.pending => (AppStrings.shiftPending, colorScheme.tertiary),
      ShiftStatus.rejected => (AppStrings.shiftRejected, colorScheme.error),
      null => (null, null),
    };
    final blockLabel = switch (block) {
      SlotBlock.past => AppStrings.shiftBlockedPast,
      SlotBlock.ended => AppStrings.shiftBlockedEnded,
      SlotBlock.locked => AppStrings.shiftBlockedLocked,
      SlotBlock.full => AppStrings.shiftBlockedFull,
      null => null,
    };
    // Ca đã duyệt chỉ Quản lý đổi được; khung giờ bị khoá thì không còn nút.
    final actionLabel = block != null || mine == ShiftStatus.approved
        ? null
        : switch (mine) {
            ShiftStatus.pending => AppStrings.shiftWithdrawButton,
            ShiftStatus.rejected => AppStrings.shiftRegisterAgainButton,
            _ => AppStrings.shiftRegisterButton,
          };

    return Card(
      key: Key('schedule_slot_${info.slot.wireName}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: Opacity(
                opacity: block != null && mine == null ? 0.55 : 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      shiftSlotLabel(info.slot),
                      style: textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    // Dòng riêng: trên máy hẹp, nằm cùng dòng với giờ thì
                    // tranh chỗ với nút bên phải.
                    if (statusLabel != null)
                      Text(
                        statusLabel,
                        style: textTheme.labelLarge?.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    const SizedBox(height: 2),
                    Text(
                      info.others.isEmpty
                          ? AppStrings.shiftNobody
                          : AppStrings.shiftOthers(info.others.join(', ')),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            if (busy)
              const SizedBox(
                width: 48,
                height: 48,
                child: Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  ),
                ),
              )
            else if (actionLabel != null)
              mine == ShiftStatus.pending
                  ? OutlinedButton(
                      onPressed: enabled ? onPressed : null,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(72, 48),
                      ),
                      child: Text(actionLabel),
                    )
                  : FilledButton.tonal(
                      onPressed: enabled ? onPressed : null,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(72, 48),
                      ),
                      child: Text(actionLabel),
                    )
            else if (blockLabel != null)
              Text(
                blockLabel,
                style: textTheme.labelLarge
                    ?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
          ],
        ),
      ),
    );
  }
}
