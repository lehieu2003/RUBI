import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/shift_report_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

String _two(int value) => value.toString().padLeft(2, '0');

/// Màn "Bảng công" của Quản lý: ca đã duyệt, giờ và ngày công của từng người
/// theo tháng; chốt công khi đã duyệt hết ca.
class ShiftReportScreen extends StatelessWidget {
  const ShiftReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ShiftReportCubit>(
      create: (_) => sl<ShiftReportCubit>()..load(),
      child: Scaffold(
        appBar: const AppHeader(
          title: AppStrings.shiftReportTitle,
          subtitle: AppStrings.shiftReportSubtitle,
        ),
        body: BlocBuilder<ShiftReportCubit, ShiftReportState>(
          builder: (context, state) {
            final cubit = context.read<ShiftReportCubit>();
            final report = state.report;
            return Column(
              children: [
                _MonthBar(
                  month: state.month,
                  onPrevious: cubit.previousMonth,
                  onNext: cubit.nextMonth,
                ),
                if (report == null && state.status == ViewStatus.error)
                  Expanded(
                    child: ErrorView(
                      message: state.errorMessage,
                      onRetry: cubit.load,
                    ),
                  )
                else if (report == null)
                  const Expanded(child: LoadingView())
                else
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cubit.load,
                      child: ListView(
                        padding: const EdgeInsets.only(bottom: 24),
                        children: [
                          if (state.errorMessage != null)
                            ErrorBanner(
                              message: state.errorMessage!,
                              onRetry: cubit.load,
                            ),
                          _Summary(
                            report: report,
                            onToggleLock: () => _toggleLock(context, report),
                          ),
                          if (report.people.isEmpty)
                            const EmptyView(message: AppStrings.shiftReportEmpty),
                          for (final person in report.people)
                            _PersonTile(person: person),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _toggleLock(BuildContext context, ShiftReport report) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final cubit = context.read<ShiftReportCubit>();
    final label = AppStrings.shiftReportMonth(report.month.month, report.month.year);
    final locking = !report.isLocked;
    final ok = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: Text(
              locking
                  ? AppStrings.shiftReportLockTitle(label)
                  : AppStrings.shiftReportReopenTitle(label),
            ),
            content: Text(
              locking
                  ? AppStrings.shiftReportLockBody
                  : AppStrings.shiftReportReopenBody,
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                child: const Text(AppStrings.cancelButton),
              ),
              TextButton(
                key: const Key('shift_report_confirm'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                child: Text(
                  locking
                      ? AppStrings.shiftReportLockButton
                      : AppStrings.shiftReportReopenButton,
                ),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    final result = await cubit.setLock(locked: locking);
    messenger.showMessage(
      result.message,
      errorColor: result.ok ? null : errorColor,
    );
  }
}

/// Thanh chọn tháng: ‹ Tháng 10/2026 ›.
class _MonthBar extends StatelessWidget {
  const _MonthBar({
    required this.month,
    required this.onPrevious,
    required this.onNext,
  });

  final DateTime month;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 0),
      child: Row(
        children: [
          IconButton(
            key: const Key('shift_report_previous'),
            tooltip: AppStrings.shiftReportPreviousMonth,
            onPressed: onPrevious,
            icon: const Icon(Icons.chevron_left),
          ),
          Expanded(
            child: Text(
              AppStrings.shiftReportMonth(month.month, month.year),
              key: const Key('shift_report_month'),
              textAlign: TextAlign.center,
              style: context.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            key: const Key('shift_report_next'),
            tooltip: AppStrings.shiftReportNextMonth,
            onPressed: onNext,
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }
}

/// Tổng của tháng, tình trạng chốt công và nút chốt / mở lại.
class _Summary extends StatelessWidget {
  const _Summary({required this.report, required this.onToggleLock});

  final ShiftReport report;
  final VoidCallback onToggleLock;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final lockedAt = report.lockedAt?.toLocal();
    final pending = report.pendingShifts;
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              AppStrings.shiftReportTotals(report.totalShifts, report.totalHours),
              key: const Key('shift_report_totals'),
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              lockedAt != null
                  ? AppStrings.shiftReportLockedAt(
                      '${_two(lockedAt.day)}/${_two(lockedAt.month)}/${lockedAt.year}',
                    )
                  : pending > 0
                      ? AppStrings.shiftReportPendingHint(pending)
                      : AppStrings.shiftReportOpenHint,
              key: const Key('shift_report_status'),
              style: textTheme.bodyMedium?.copyWith(
                color: lockedAt == null && pending > 0
                    ? colorScheme.error
                    : colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            AppButton(
              key: const Key('shift_report_lock'),
              label: report.isLocked
                  ? AppStrings.shiftReportReopenButton
                  : AppStrings.shiftReportLockButton,
              icon: report.isLocked ? Icons.lock_open_outlined : Icons.lock_outline,
              variant: report.isLocked
                  ? AppButtonVariant.secondary
                  : AppButtonVariant.primary,
              onPressed: onToggleLock,
            ),
          ],
        ),
      ),
    );
  }
}

/// Công của một người; mở ra để xem từng ngày.
class _PersonTile extends StatelessWidget {
  const _PersonTile({required this.person});

  final ShiftReportPerson person;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final muted = colorScheme.onSurfaceVariant;
    final role = person.role == UserRole.driver
        ? AppStrings.roleDriver
        : AppStrings.roleStaff;
    final waiting = [
      if (person.pendingShifts > 0)
        AppStrings.shiftReportPersonPending(person.pendingShifts),
      if (person.rejectedShifts > 0)
        AppStrings.shiftReportPersonRejected(person.rejectedShifts),
    ].join(' · ');
    return ExpansionTile(
      key: Key('shift_report_person_${person.id}'),
      title: Text(
        person.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: textTheme.titleMedium,
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$role · ${AppStrings.shiftReportPersonTotals(person.approvedShifts, person.hours, person.daysWorked)}',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (waiting.isNotEmpty)
            Text(
              waiting,
              style: textTheme.bodySmall?.copyWith(color: colorScheme.error),
            ),
        ],
      ),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (person.days.isEmpty)
          Text(
            AppStrings.shiftReportNoApproved,
            style: textTheme.bodyMedium?.copyWith(color: muted),
          ),
        for (final day in person.days)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Text(
              '${_two(day.date.day)}/${_two(day.date.month)}: '
              '${day.slots.map((slot) => '${_two(slot.startHour)}–${_two(slot.endHour)}').join(', ')}',
              style: textTheme.bodyMedium,
            ),
          ),
      ],
    );
  }
}
