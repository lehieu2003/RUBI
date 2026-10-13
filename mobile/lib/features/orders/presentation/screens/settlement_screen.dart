import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/pagination/search_debouncer.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/order_card.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';

/// Màn "Đối soát" của Quản lý: các đơn đã giao chờ chốt. Bấm một đơn để nhập
/// số thực giao của từng dòng rồi chốt — server ghi nợ và trừ kho theo số đó.
class SettlementScreen extends StatelessWidget {
  const SettlementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<OrdersCubit>(
      // Cùng cubit với màn Đơn hàng, đứng yên ở trạng thái "Đã giao".
      create: (_) => sl<OrdersCubit>()..selectTab(OfficeOrderStatus.delivered),
      child: Scaffold(
        appBar: AppBar(title: const Text(AppStrings.settleTitle)),
        body: const _SettlementBody(),
      ),
    );
  }
}

class _SettlementBody extends HookWidget {
  const _SettlementBody();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OrdersCubit>();
    final debouncer = useMemoized(SearchDebouncer.new);
    useEffect(() => debouncer.dispose, const []);

    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        final waiting = state.counts?.of(OfficeOrderStatus.delivered);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: TextField(
                key: const Key('settle_search'),
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  hintText: AppStrings.ordersSearchHint,
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                onChanged: (text) => debouncer.run(() => cubit.setSearch(text)),
                onSubmitted: cubit.setSearch,
              ),
            ),
            if (waiting != null && waiting > 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Text(
                  AppStrings.settlePendingCount(waiting),
                  key: const Key('settle_count'),
                  style: context.textTheme.titleSmall,
                ),
              ),
            if (state.orders.isEmpty && state.status == ViewStatus.error)
              Expanded(
                child: ErrorView(message: state.errorMessage, onRetry: cubit.load),
              )
            else if (state.orders.isEmpty && state.status == ViewStatus.loading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
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
                      if (state.orders.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(32),
                          child: Text(
                            AppStrings.settleEmpty,
                            textAlign: TextAlign.center,
                            style: context.textTheme.titleMedium,
                          ),
                        ),
                      for (final order in state.orders)
                        OrderCard(
                          order: order,
                          onTap: () => _openOrder(context, order),
                        ),
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
                                  key: const Key('settle_load_more'),
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
    );
  }

  Future<void> _openOrder(BuildContext context, OfficeOrder order) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final cubit = context.read<OrdersCubit>();
    final result = await showModalBottomSheet<OrderActionResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _SettleSheet(order: order, cubit: cubit),
    );
    if (result == null) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: result.ok ? null : errorColor,
        ),
      );
  }
}

/// Nhập số thực giao từng dòng của một đơn rồi chốt. Mở ra với số đặt; đóng
/// lại với kết quả chốt.
class _SettleSheet extends HookWidget {
  const _SettleSheet({required this.order, required this.cubit});

  final OfficeOrder order;
  final OrdersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final busy = useState(false);
    final actual = useState<Map<String, int>>({
      for (final line in order.lines) line.id: line.quantity,
    });
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;

    final debt = order.lines.fold<double>(
      0,
      (sum, line) => sum + actual.value[line.id]! * line.unitPrice,
    );

    void change(OrderLine line, int delta) {
      final next = actual.value[line.id]! + delta;
      if (next < 0) return;
      actual.value = {...actual.value, line.id: next};
    }

    Future<void> confirm() async {
      if (busy.value) return;
      busy.value = true;
      final result = await cubit.settle(order, actual.value);
      if (context.mounted) Navigator.of(context).pop(result);
    }

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(order.code, style: textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              '${order.customerName} (${order.customerCode})',
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            Text(
              order.driverName == null
                  ? AppStrings.orderUnassigned
                  : AppStrings.orderDriver(order.driverName!),
              style: textTheme.bodyMedium?.copyWith(color: muted),
            ),
            const Divider(height: 24),
            Text(AppStrings.settleActualLabel, style: textTheme.labelLarge),
            for (final line in order.lines)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${line.productName} ${line.sizeKg}kg',
                            style: textTheme.bodyLarge,
                          ),
                          Text(
                            AppStrings.settleOrdered(
                              line.quantity,
                              formatVnd(line.unitPrice),
                            ),
                            style: textTheme.bodySmall?.copyWith(color: muted),
                          ),
                        ],
                      ),
                    ),
                    IconButton.outlined(
                      key: Key('settle_minus_${line.id}'),
                      tooltip: AppStrings.settleDecreaseTooltip,
                      onPressed: busy.value || actual.value[line.id] == 0
                          ? null
                          : () => change(line, -1),
                      icon: const Icon(Icons.remove),
                    ),
                    SizedBox(
                      width: 44,
                      child: Text(
                        '${actual.value[line.id]}',
                        key: Key('settle_qty_${line.id}'),
                        textAlign: TextAlign.center,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          // Lệch so với số đặt thì nổi lên.
                          color: actual.value[line.id] == line.quantity
                              ? null
                              : context.colorScheme.error,
                        ),
                      ),
                    ),
                    IconButton.outlined(
                      key: Key('settle_plus_${line.id}'),
                      tooltip: AppStrings.settleIncreaseTooltip,
                      onPressed: busy.value ? null : () => change(line, 1),
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
              ),
            const Divider(height: 24),
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppStrings.settleDebtLabel,
                    style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  formatVnd(debt),
                  key: const Key('settle_debt'),
                  style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              AppStrings.settleNote,
              style: textTheme.bodySmall?.copyWith(color: muted),
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('settle_confirm'),
              onPressed: busy.value ? null : confirm,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              child: busy.value
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(AppStrings.settleConfirmButton),
            ),
          ],
        ),
      ),
    );
  }
}
