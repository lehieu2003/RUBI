import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/team_schedule_rules.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/team_schedule_cubit.dart';
import 'package:iceflow_mobile/features/schedule/presentation/widgets/week_widgets.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Tab "Duyệt ca" của Quản lý: ai làm ca nào trong tuần, và duyệt / từ chối
/// các yêu cầu nhân viên, tài xế gửi lên.
class ShiftReviewTab extends StatelessWidget {
  const ShiftReviewTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<TeamScheduleCubit>(
      // Rời tab unmount cubit → quay lại tải lại từ đầu.
      create: (_) => sl<TeamScheduleCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(title: AppStrings.navShiftReview),
        body: BlocBuilder<TeamScheduleCubit, TeamScheduleState>(
          builder: (context, state) {
            final cubit = context.read<TeamScheduleCubit>();
            final people = state.people;
            final pending = state.pending;
            final now = DateTime.now();
            return Column(
              children: [
                WeekNavBar(
                  weekStart: state.weekStart,
                  onShowWeek: cubit.showWeek,
                ),
                WeekDayStrip(
                  weekStart: state.weekStart,
                  selectedDate: state.selectedDate,
                  today: DateTime(now.year, now.month, now.day),
                  // Chấm những ngày còn yêu cầu chờ duyệt.
                  isMarked: (date) => pending.any((shift) => shift.date == date),
                  onSelect: cubit.selectDay,
                ),
                if (people == null && state.status == ViewStatus.error)
                  Expanded(
                    child: ErrorView(
                      message: state.errorMessage,
                      onRetry: cubit.load,
                    ),
                  )
                else if (people == null)
                  const Expanded(
                    child: LoadingView(),
                  )
                else ...[
                  if (state.status == ViewStatus.error)
                    ErrorBanner(
                      message: state.errorMessage ?? '',
                      onRetry: cubit.load,
                    ),
                  _PendingBar(
                    count: pending.length,
                    enabled: !state.busy,
                    onApproveAll: () => _approveAll(context, pending),
                  ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cubit.load,
                      child: state.slots.isEmpty
                          ? ListView(
                              children: [
                                const EmptyView(message: AppStrings.shiftReviewEmptyDay),
                              ],
                            )
                          : ListView(
                              padding: const EdgeInsets.only(bottom: 16),
                              children: [
                                for (final slot in state.slots)
                                  _SlotCard(
                                    slot: slot,
                                    enabled: !state.busy,
                                    onReview: (shift, approve) => _review(
                                      context,
                                      [shift],
                                      approve: approve,
                                    ),
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

  Future<void> _review(
    BuildContext context,
    List<Shift> shifts, {
    required bool approve,
  }) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final result = await context
        .read<TeamScheduleCubit>()
        .review(shifts, approve: approve);
    if (result == null) return;
    messenger.showMessage(
      result.message,
      errorColor: result.ok ? null : errorColor,
    );
  }

  Future<void> _approveAll(BuildContext context, List<Shift> pending) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text(AppStrings.approveAllTitle),
        content: Text(AppStrings.approveAllBody(pending.length)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: const Text(AppStrings.cancelButton),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
            child: const Text(AppStrings.approveAllButton),
          ),
        ],
      ),
    );
    if ((confirmed ?? false) && context.mounted) {
      await _review(context, pending, approve: true);
    }
  }
}

/// "3 yêu cầu chờ duyệt trong tuần" + nút duyệt tất cả.
class _PendingBar extends StatelessWidget {
  const _PendingBar({
    required this.count,
    required this.enabled,
    required this.onApproveAll,
  });

  final int count;
  final bool enabled;
  final VoidCallback onApproveAll;

  @override
  Widget build(BuildContext context) {
    final muted = context.colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              count == 0
                  ? AppStrings.shiftReviewNonePending
                  : AppStrings.shiftReviewPendingCount(count),
              style: context.textTheme.bodyMedium?.copyWith(
                color: count == 0 ? muted : null,
                fontWeight: count == 0 ? null : FontWeight.w600,
              ),
            ),
          ),
          if (count > 0)
            TextButton(
              key: const Key('shift_review_approve_all'),
              onPressed: enabled ? onApproveAll : null,
              style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
              child: const Text(AppStrings.approveAllButton),
            ),
        ],
      ),
    );
  }
}

/// Một khung giờ và những người có ca ở đó.
class _SlotCard extends StatelessWidget {
  const _SlotCard({
    required this.slot,
    required this.enabled,
    required this.onReview,
  });

  final TeamSlot slot;
  final bool enabled;
  final void Function(Shift shift, bool approve) onReview;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    return Card(
      key: Key('shift_review_slot_${slot.slot.wireName}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              shiftSlotLabel(slot.slot),
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            for (final entry in slot.entries)
              _EntryRow(entry: entry, enabled: enabled, onReview: onReview),
          ],
        ),
      ),
    );
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({
    required this.entry,
    required this.enabled,
    required this.onReview,
  });

  final TeamShiftEntry entry;
  final bool enabled;
  final void Function(Shift shift, bool approve) onReview;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final status = entry.shift.status;
    final (statusLabel, statusColor) = switch (status) {
      ShiftStatus.approved => (AppStrings.shiftApproved, colorScheme.primary),
      ShiftStatus.pending => (AppStrings.shiftPending, colorScheme.tertiary),
      ShiftStatus.rejected => (AppStrings.shiftRejected, colorScheme.error),
    };
    final roleLabel = entry.role == UserRole.driver
        ? AppStrings.roleDriver
        : AppStrings.roleStaff;

    return Padding(
      key: Key('shift_review_entry_${entry.shift.id}'),
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            entry.personName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.bodyLarge,
          ),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: '$roleLabel · '),
                TextSpan(
                  text: statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            style: textTheme.bodySmall
                ?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          // Chỉ yêu cầu chờ duyệt mới có nút; hàng riêng để không tranh chỗ
          // với tên trên máy hẹp.
          if (status == ShiftStatus.pending)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  FilledButton.tonal(
                    onPressed: enabled ? () => onReview(entry.shift, true) : null,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(88, 48),
                    ),
                    child: const Text(AppStrings.approveButton),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed:
                        enabled ? () => onReview(entry.shift, false) : null,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(88, 48),
                      foregroundColor: colorScheme.error,
                    ),
                    child: const Text(AppStrings.rejectButton),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
