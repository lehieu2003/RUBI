import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/order_card.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/quantity_stepper.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/load_more_button.dart';
import 'package:iceflow_mobile/shared/widgets/search_field.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

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
        appBar: AppHeader(
          title: AppStrings.settleTitle,
          subtitle: AppStrings.settleSubtitle,
        ),
        body: const _SettlementBody(),
      ),
    );
  }
}

class _SettlementBody extends StatelessWidget {
  const _SettlementBody();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OrdersCubit>();

    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        final waiting = state.counts?.of(OfficeOrderStatus.delivered);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SearchField(
              key: const Key('settle_search'),
              hint: AppStrings.ordersSearchHint,
              onSearch: cubit.setSearch,
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
              const Expanded(child: LoadingView())
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
                        const EmptyView(message: AppStrings.settleEmpty),
                      for (final order in state.orders)
                        OrderCard(
                          order: order,
                          onTap: () => _openOrder(context, order),
                        ),
                      if (state.hasMore)
                        LoadMoreButton(
                          key: const Key('settle_load_more'),
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
    );
  }

  Future<void> _openOrder(BuildContext context, OfficeOrder order) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<OrdersCubit>();
    final result = await showModalBottomSheet<OrderActionResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _SettleSheet(order: order, cubit: cubit),
    );
    if (result == null || !result.ok) return;
    messenger.showMessage(result.message);
  }
}

/// Nhập số thực giao từng dòng của một đơn rồi chốt. Mở ra với số đặt; đóng
/// lại với kết quả chốt khi thành công, hoặc giữ nguyên số đã nhập khi lỗi.
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

    void set(OrderLine line, int quantity) {
      if (quantity < 0) return;
      actual.value = {...actual.value, line.id: quantity};
    }

    Future<void> confirm() async {
      if (busy.value) return;
      busy.value = true;
      final result = await cubit.settle(order, actual.value);
      if (!context.mounted) return;
      if (result.ok) {
        Navigator.of(context).pop(result);
      } else {
        busy.value = false;
        ScaffoldMessenger.of(context).showMessage(
          result.message,
          errorColor: context.colorScheme.error,
        );
      }
    }

    return SafeArea(
      child: SingleChildScrollView(
        // Bàn phím số mở ra thì nội dung dâng lên theo, không bị che.
        padding: EdgeInsets.fromLTRB(
          24,
          0,
          24,
          24 + MediaQuery.viewInsetsOf(context).bottom,
        ),
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
                    QuantityStepper(
                      keyPrefix: 'settle',
                      id: line.id,
                      quantity: actual.value[line.id]!,
                      enabled: !busy.value,
                      // Thực giao 0 là một câu trả lời, không phải ô chưa nhập.
                      showZero: true,
                      // Lệch so với số đặt thì nổi lên.
                      highlighted: actual.value[line.id] != line.quantity,
                      onChanged: (quantity) => set(line, quantity),
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
            AppButton(
              key: const Key('settle_confirm'),
              label: AppStrings.settleConfirmButton,
              onPressed: confirm,
              loading: busy.value,
            ),
          ],
        ),
      ),
    );
  }
}
