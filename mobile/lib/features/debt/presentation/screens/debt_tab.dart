import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/debt_cubit.dart';
import 'package:iceflow_mobile/features/debt/presentation/screens/customer_ledger_screen.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

String _day(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year}';
}

/// Tab "Công nợ" của Quản lý: tổng nợ và từng khách đang nợ; bấm vào một
/// khách để xem sổ nợ và ghi nhận thu tiền.
class DebtTab extends StatelessWidget {
  const DebtTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<DebtCubit>(
      // Rời tab unmount cubit → quay lại tải lại từ đầu.
      create: (_) => sl<DebtCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(title: AppStrings.navDebt),
        body: BlocBuilder<DebtCubit, DebtState>(
          builder: (context, state) {
            final cubit = context.read<DebtCubit>();
            final debts = state.debts;
            if (debts == null && state.status == ViewStatus.error) {
              return ErrorView(message: state.errorMessage, onRetry: cubit.load);
            }
            if (debts == null) {
              return const LoadingView();
            }
            return Column(
              children: [
                if (state.status == ViewStatus.error)
                  ErrorBanner(
                    message: state.errorMessage ?? '',
                    onRetry: cubit.load,
                  ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: cubit.load,
                    child: ListView(
                      padding: const EdgeInsets.only(bottom: 16),
                      children: [
                        _Total(amount: state.totalOutstanding, count: debts.length),
                        if (debts.isEmpty)
                          const EmptyView(message: AppStrings.debtNone),
                        for (final debt in debts)
                          _DebtCard(
                            debt: debt,
                            onTap: () => _openLedger(context, debt),
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

  Future<void> _openLedger(BuildContext context, CustomerDebt debt) async {
    final cubit = context.read<DebtCubit>();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerLedgerScreen(debt: debt),
      ),
    );
    // Có thể vừa thu tiền: lấy lại số nợ của cả danh sách.
    if (!cubit.isClosed) await cubit.load();
  }
}

/// Tổng số tiền khách còn nợ.
class _Total extends StatelessWidget {
  const _Total({required this.amount, required this.count});

  final double amount;
  final int count;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppStrings.debtTotalLabel(count),
            style: textTheme.labelMedium
                ?.copyWith(color: context.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 2),
          Text(
            formatVnd(amount),
            key: const Key('debt_total'),
            style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

/// Một khách: tên, số nợ, lần trả gần nhất.
class _DebtCard extends StatelessWidget {
  const _DebtCard({required this.debt, required this.onTap});

  final CustomerDebt debt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    final lastPaid = debt.lastPaymentAt;
    return Card(
      key: Key('debt_customer_${debt.customerId}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      debt.customerName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formatVnd(debt.outstandingDebt),
                      style: textTheme.titleMedium?.copyWith(
                        color: context.colorScheme.error,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      lastPaid == null
                          ? AppStrings.debtNeverPaid
                          : AppStrings.debtLastPaid(_day(lastPaid)),
                      style: textTheme.bodySmall?.copyWith(
                        color: context.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
