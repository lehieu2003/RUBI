import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';
import 'package:iceflow_mobile/features/audit/presentation/cubit/audit_log_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/load_more_button.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

String _dateTime(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)} '
      '${two(local.day)}/${two(local.month)}/${local.year}';
}

/// Tên thao tác để hiển thị. Mã app chưa biết thì hiện nguyên mã.
String auditActionLabel(String action) => switch (action) {
      'ORDER_CREATED' => 'Lên đơn',
      'ORDER_ASSIGNED' => 'Gán tài xế',
      'ORDER_STATUS_CHANGED' => 'Đổi trạng thái',
      'ORDER_CANCELLED' => 'Hủy đơn',
      'ORDER_DELIVERED' => 'Đã giao',
      'ORDER_SETTLED' => 'Chốt đơn',
      'DEBT_PAYMENT' => 'Thu tiền',
      _ => action,
    };

/// Màn "Nhật ký" của Quản lý: ai đã làm gì với đơn hàng và công nợ, lúc nào.
/// Chỉ đọc.
class AuditLogScreen extends StatelessWidget {
  const AuditLogScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuditLogCubit>(
      create: (_) => sl<AuditLogCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(
          title: AppStrings.auditLogTitle,
          subtitle: AppStrings.auditLogSubtitle,
        ),
        body: BlocBuilder<AuditLogCubit, AuditLogState>(
          builder: (context, state) {
            final cubit = context.read<AuditLogCubit>();
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<AuditFilter>(
                      key: const Key('audit_filter'),
                      showSelectedIcon: false,
                      segments: const [
                        ButtonSegment(
                          value: AuditFilter.all,
                          label: Text(AppStrings.auditFilterAll),
                        ),
                        ButtonSegment(
                          value: AuditFilter.order,
                          label: Text(AppStrings.auditFilterOrder),
                        ),
                        ButtonSegment(
                          value: AuditFilter.debt,
                          label: Text(AppStrings.auditFilterDebt),
                        ),
                      ],
                      selected: {state.filter},
                      onSelectionChanged: (selection) =>
                          cubit.selectFilter(selection.first),
                    ),
                  ),
                ),
                if (state.entries.isEmpty && state.status == ViewStatus.error)
                  Expanded(
                    child: ErrorView(
                      message: state.errorMessage,
                      onRetry: cubit.load,
                    ),
                  )
                else if (state.entries.isEmpty &&
                    state.status == ViewStatus.loading)
                  const Expanded(
                    child: LoadingView(),
                  )
                else
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cubit.load,
                      child: ListView(
                        padding: const EdgeInsets.only(bottom: 16),
                        children: [
                          if (state.errorMessage != null)
                            ErrorBanner(
                              message: state.errorMessage!,
                              onRetry: cubit.load,
                            ),
                          if (state.entries.isEmpty)
                            const EmptyView(message: AppStrings.auditLogEmpty),
                          for (final entry in state.entries)
                            _EntryCard(entry: entry),
                          if (state.hasMore)
                            LoadMoreButton(
                              key: const Key('audit_load_more'),
                              loading: state.loadingMore,
                              onPressed: cubit.loadMore,
                            ),
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
}

/// Một dòng nhật ký: thao tác, nội dung, rồi ai / lúc nào / đơn nào / khách nào.
class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry});

  final AuditEntry entry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    return Card(
      key: Key('audit_entry_${entry.id}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: colorScheme.secondaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    auditActionLabel(entry.action),
                    style: textTheme.labelMedium?.copyWith(
                      color: colorScheme.onSecondaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _dateTime(entry.createdAt),
                    textAlign: TextAlign.end,
                    style: textTheme.bodySmall
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(entry.summary, style: textTheme.bodyLarge),
            const SizedBox(height: 4),
            Text(
              [
                entry.userName,
                if (entry.orderCode != null) entry.orderCode!,
                if (entry.customerName != null) entry.customerName!,
              ].join(' · '),
              style: textTheme.bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
