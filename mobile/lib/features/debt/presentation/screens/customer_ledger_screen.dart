import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/ledger_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';

String _dateTime(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)} '
      '${two(local.day)}/${two(local.month)}/${local.year}';
}

/// Sổ nợ của một khách: số còn nợ, các dòng ghi nợ / thu tiền (mới nhất
/// trước, tải dần), và ghi nhận thu tiền.
class CustomerLedgerScreen extends StatelessWidget {
  const CustomerLedgerScreen({super.key, required this.debt});

  final CustomerDebt debt;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<LedgerCubit>(
      create: (_) => sl<LedgerCubit>(param1: debt)..load(),
      child: Scaffold(
        appBar: AppBar(title: Text(debt.customerName)),
        body: BlocBuilder<LedgerCubit, LedgerState>(
          builder: (context, state) {
            final cubit = context.read<LedgerCubit>();
            return Column(
              children: [
                _Outstanding(
                  amount: state.outstandingDebt,
                  onPay: () => _openPayment(context),
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
                    child: Center(child: CircularProgressIndicator()),
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
                            Padding(
                              padding: const EdgeInsets.all(32),
                              child: Text(
                                AppStrings.ledgerEmpty,
                                textAlign: TextAlign.center,
                                style: context.textTheme.titleMedium,
                              ),
                            ),
                          for (final entry in state.entries)
                            _EntryTile(entry: entry),
                          if (state.hasMore)
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: state.loadingMore
                                  ? const Center(
                                      child: Padding(
                                        padding: EdgeInsets.all(8),
                                        child: CircularProgressIndicator(),
                                      ),
                                    )
                                  : TextButton(
                                      key: const Key('ledger_load_more'),
                                      onPressed: cubit.loadMore,
                                      style: TextButton.styleFrom(
                                        minimumSize: const Size.fromHeight(48),
                                      ),
                                      child: const Text(AppStrings.loadMoreButton),
                                    ),
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

  Future<void> _openPayment(BuildContext context) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<LedgerCubit>();
    final message = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _PaymentSheet(cubit: cubit),
    );
    if (message == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

/// Số còn nợ và nút thu tiền.
class _Outstanding extends StatelessWidget {
  const _Outstanding({required this.amount, required this.onPay});

  final double amount;
  final VoidCallback onPay;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            AppStrings.ledgerOutstandingLabel,
            style: textTheme.labelMedium
                ?.copyWith(color: context.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 2),
          Text(
            formatVnd(amount),
            key: const Key('ledger_outstanding'),
            style: textTheme.headlineSmall?.copyWith(
              color: amount > 0 ? context.colorScheme.error : null,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            key: const Key('ledger_pay'),
            // Hết nợ thì không còn gì để thu.
            onPressed: amount > 0 ? onPay : null,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            icon: const Icon(Icons.payments_outlined),
            label: const Text(AppStrings.paymentButton),
          ),
        ],
      ),
    );
  }
}

/// Một dòng sổ nợ: ghi nợ (đỏ, dấu +) hoặc thu tiền (dấu −).
class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});

  final LedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final isPayment = entry.type == LedgerEntryType.payment;
    return ListTile(
      key: Key('ledger_entry_${entry.id}'),
      leading: Icon(
        isPayment ? Icons.south_west : Icons.north_east,
        color: isPayment ? colorScheme.primary : colorScheme.error,
      ),
      title: Text(
        isPayment ? AppStrings.ledgerPayment : AppStrings.ledgerDebt,
        style: textTheme.bodyLarge,
      ),
      subtitle: Text(
        [
          _dateTime(entry.createdAt),
          // Dòng ghi nợ mang ghi chú kỹ thuật của hệ thống: không hiện.
          if (isPayment && entry.notes != null) entry.notes!,
        ].join(' · '),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Text(
        '${isPayment ? '−' : '+'}${formatVnd(entry.amount)}',
        style: textTheme.titleMedium?.copyWith(
          color: isPayment ? colorScheme.primary : colorScheme.error,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Sheet ghi nhận thu tiền. Đóng lại với câu báo thành công; lỗi hiện ngay
/// trong sheet.
class _PaymentSheet extends HookWidget {
  const _PaymentSheet({required this.cubit});

  final LedgerCubit cubit;

  @override
  Widget build(BuildContext context) {
    final amountController = useTextEditingController();
    final notesController = useTextEditingController();
    final submitting = useState(false);
    final error = useState<String?>(null);
    final outstanding = cubit.state.outstandingDebt;

    Future<void> submit() async {
      if (submitting.value) return;
      final amount = int.tryParse(amountController.text.trim());
      if (amount == null || amount <= 0) {
        error.value = AppStrings.paymentInvalid;
        return;
      }
      if (amount > outstanding) {
        error.value = AppStrings.paymentAboveDebt(formatVnd(outstanding));
        return;
      }
      submitting.value = true;
      error.value = null;
      final result =
          await cubit.recordPayment(amount, notes: notesController.text);
      if (!context.mounted) return;
      if (result.ok) {
        Navigator.of(context).pop(result.message);
      } else {
        submitting.value = false;
        error.value = result.message;
      }
    }

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        0,
        24,
        24 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(AppStrings.paymentTitle, style: context.textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(
            AppStrings.paymentOutstanding(formatVnd(outstanding)),
            style: context.textTheme.bodyMedium
                ?.copyWith(color: context.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          TextField(
            key: const Key('payment_amount'),
            controller: amountController,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: AppStrings.paymentAmountLabel,
              suffixText: 'đ',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('payment_notes'),
            controller: notesController,
            maxLength: 300,
            decoration: const InputDecoration(
              labelText: AppStrings.paymentNotesLabel,
            ),
            onSubmitted: (_) => submit(),
          ),
          if (error.value != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                error.value!,
                style: TextStyle(
                  color: context.colorScheme.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          const SizedBox(height: 16),
          FilledButton(
            key: const Key('payment_submit'),
            onPressed: submitting.value ? null : submit,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: submitting.value
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  )
                : const Text(AppStrings.paymentSubmit),
          ),
        ],
      ),
    );
  }
}
