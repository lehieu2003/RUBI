import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/order_entry_screen.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/order_card.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/order_filter_bar.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/load_more_button.dart';
import 'package:iceflow_mobile/shared/widgets/search_field.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Màn "Đơn hàng" của văn phòng (Quản lý, Nhân viên): danh sách theo trạng
/// thái, tìm kiếm; bấm một đơn để xem chi tiết, gán tài xế, đổi trạng thái
/// hoặc huỷ.
class OrdersTab extends StatelessWidget {
  const OrdersTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<OrdersCubit>(
      // Rời màn unmount cubit → quay lại tải lại từ đầu.
      create: (_) => sl<OrdersCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(
          title: AppStrings.navOrders,
          subtitle: AppStrings.ordersSubtitle,
          actions: [
            // Trên thanh đầu chứ không nổi ở góc dưới: câu báo "Đã lên đơn"
            // ở đáy màn hình không được che nút khi lên liền mấy đơn.
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Builder(
                builder: (context) => FilledButton.tonalIcon(
                  key: const Key('orders_new'),
                  onPressed: () => _newOrder(context),
                  icon: const Icon(Icons.add),
                  label: const Text(AppStrings.orderEntryButton),
                ),
              ),
            ),
          ],
        ),
        body: const _OrdersBody(),
      ),
    );
  }

  Future<void> _newOrder(BuildContext context) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<OrdersCubit>();
    final created = await Navigator.of(context).push<CreatedOrder>(
      MaterialPageRoute(builder: (_) => const OrderEntryScreen()),
    );
    if (created == null) return;
    messenger.showMessage(
      AppStrings.orderEntrySaved(created.code, formatVnd(created.total)),
    );
    if (!cubit.isClosed) await cubit.load();
  }
}

class _OrdersBody extends StatelessWidget {
  const _OrdersBody();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OrdersCubit>();

    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        return Column(
          children: [
            SearchField(
              key: const Key('orders_search'),
              hint: AppStrings.ordersSearchHint,
              onSearch: cubit.setSearch,
            ),
            OrderFilterBar(state: state, cubit: cubit),
            _StatusTabs(state: state, onSelect: cubit.selectTab),
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
                        const EmptyView(message: AppStrings.ordersEmpty),
                      for (final order in state.orders)
                        OrderCard(
                          order: order,
                          onTap: () => _openOrder(context, order),
                        ),
                      if (state.hasMore)
                        LoadMoreButton(
                          key: const Key('orders_load_more'),
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
    final errorColor = context.colorScheme.error;
    final cubit = context.read<OrdersCubit>();
    final result = await showModalBottomSheet<OrderActionResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _OrderSheet(order: order, cubit: cubit),
    );
    if (result == null) return;
    messenger.showMessage(
      result.message,
      errorColor: result.ok ? null : errorColor,
    );
  }
}

/// Dải tab trạng thái kèm số đơn: Tất cả (9), Chờ giao (3)...
class _StatusTabs extends StatelessWidget {
  const _StatusTabs({required this.state, required this.onSelect});

  final OrdersState state;
  final ValueChanged<OfficeOrderStatus?> onSelect;

  @override
  Widget build(BuildContext context) {
    final counts = state.counts;
    String label(String name, int? count) =>
        count == null ? name : '$name ($count)';
    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              key: const Key('orders_tab_all'),
              label: Text(label(AppStrings.ordersTabAll, counts?.total)),
              selected: state.tab == null,
              onSelected: (_) => onSelect(null),
            ),
          ),
          for (final status in OfficeOrderStatus.values)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ChoiceChip(
                key: Key('orders_tab_${status.wireName}'),
                label: Text(
                  label(
                    AppStrings.orderStatusLabel(status.wireName),
                    counts?.of(status),
                  ),
                ),
                selected: state.tab == status,
                onSelected: (_) => onSelect(status),
              ),
            ),
        ],
      ),
    );
  }
}

/// Chi tiết một đơn và các thao tác còn làm được với nó. Đóng lại với kết
/// quả của thao tác vừa làm.
class _OrderSheet extends HookWidget {
  const _OrderSheet({required this.order, required this.cubit});

  final OfficeOrder order;
  final OrdersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final busy = useState(false);
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final muted = colorScheme.onSurfaceVariant;
    final status = order.status;

    Future<void> run(Future<OrderActionResult> Function() action) async {
      if (busy.value) return;
      busy.value = true;
      final result = await action();
      if (context.mounted) Navigator.of(context).pop(result);
    }

    Future<void> assign() async {
      final driver = await showDialog<DriverOption>(
        context: context,
        builder: (_) => _DriverDialog(cubit: cubit),
      );
      if (driver == null) return;
      await run(() => cubit.assign(order, driver));
    }

    Future<void> cancel() async {
      final reason = await showDialog<String>(
        context: context,
        builder: (_) => const _CancelDialog(),
      );
      if (reason == null) return;
      await run(
        () => cubit.changeStatus(
          order,
          OfficeOrderStatus.cancelled,
          cancellationReason: reason,
        ),
      );
    }

    Widget action(String label, VoidCallback onPressed, {Key? key, bool primary = false}) {
      return Padding(
        padding: const EdgeInsets.only(top: 8),
        child: AppButton(
          key: key,
          label: label,
          onPressed: busy.value ? null : onPressed,
          variant: primary ? AppButtonVariant.primary : AppButtonVariant.secondary,
        ),
      );
    }

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Text(order.code, style: textTheme.titleLarge)),
                OrderStatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${order.customerName} (${order.customerCode})',
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (order.customerAddress.isNotEmpty)
              Text(order.customerAddress, style: textTheme.bodyMedium?.copyWith(color: muted)),
            if (order.customerPhone.isNotEmpty)
              Text(order.customerPhone, style: textTheme.bodyMedium?.copyWith(color: muted)),
            const Divider(height: 24),
            for (final line in order.lines)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${line.productName} ${line.sizeKg}kg × ${line.quantity}'
                        '${line.actualQty == null ? '' : ' (thực giao ${line.actualQty})'}',
                        style: textTheme.bodyLarge,
                      ),
                    ),
                    Text(formatVnd(line.lineTotal), style: textTheme.bodyLarge),
                  ],
                ),
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppStrings.totalLabel,
                    style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  formatVnd(order.total),
                  style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const Divider(height: 24),
            Text(
              order.driverName == null
                  ? AppStrings.orderUnassigned
                  : AppStrings.orderDriver(order.driverName!),
              style: textTheme.bodyLarge,
            ),
            if (order.notes != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${AppStrings.orderNotesLabel}: ${order.notes}',
                  style: textTheme.bodyMedium,
                ),
              ),
            const SizedBox(height: 8),
            // Thao tác theo trạng thái. Đơn đã đối soát hoặc đã huỷ: chỉ xem.
            if (status == OfficeOrderStatus.pending ||
                status == OfficeOrderStatus.shipping)
              action(
                order.driverName == null
                    ? AppStrings.orderAssignButton
                    : AppStrings.orderReassignButton,
                assign,
                key: const Key('order_assign'),
                // Chưa có tài xế thì gán là việc cần làm trước.
                primary: order.driverName == null,
              ),
            if (status == OfficeOrderStatus.pending)
              action(
                AppStrings.orderSendOutButton,
                () => run(() => cubit.changeStatus(order, OfficeOrderStatus.shipping)),
                key: const Key('order_send_out'),
                primary: order.driverName != null,
              ),
            if (status == OfficeOrderStatus.shipping) ...[
              action(
                AppStrings.orderMarkDeliveredButton,
                () => run(() => cubit.changeStatus(order, OfficeOrderStatus.delivered)),
                key: const Key('order_mark_delivered'),
                primary: true,
              ),
              action(
                AppStrings.orderBackToPendingButton,
                () => run(() => cubit.changeStatus(order, OfficeOrderStatus.pending)),
                key: const Key('order_back_to_pending'),
              ),
            ],
            if (status == OfficeOrderStatus.delivered)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  AppStrings.orderSettleHint,
                  style: textTheme.bodyMedium?.copyWith(color: muted),
                ),
              ),
            if (!status.isFinal)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: AppButton(
                  key: const Key('order_cancel'),
                  label: AppStrings.orderCancelButton,
                  onPressed: busy.value ? null : cancel,
                  variant: AppButtonVariant.text,
                  danger: true,
                ),
              ),
            if (busy.value)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: LoadingView(),
              ),
          ],
        ),
      ),
    );
  }
}

/// Hộp chọn tài xế: tải danh sách tài xế còn giao được, bấm một người để chọn.
class _DriverDialog extends HookWidget {
  const _DriverDialog({required this.cubit});

  final OrdersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final future = useMemoized(cubit.drivers);
    final snapshot = useFuture(future);
    final result = snapshot.data;

    final Widget content;
    if (result == null) {
      content = const Padding(
        padding: EdgeInsets.all(24),
        child: LoadingView(),
      );
    } else if (result case Ok<List<DriverOption>>(:final value)) {
      content = value.isEmpty
          ? const Padding(
              padding: EdgeInsets.all(24),
              child: Text(AppStrings.orderNoDrivers),
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final driver in value)
                  ListTile(
                    key: Key('driver_${driver.id}'),
                    leading: const Icon(Icons.local_shipping_outlined),
                    title: Text(driver.name),
                    subtitle: driver.phone == null ? null : Text(driver.phone!),
                    onTap: () => Navigator.of(context).pop(driver),
                  ),
              ],
            );
    } else {
      content = Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          AppStrings.orderDriversFailed,
          style: TextStyle(color: context.colorScheme.error),
        ),
      );
    }

    return AlertDialog(
      title: const Text(AppStrings.orderAssignTitle),
      contentPadding: const EdgeInsets.only(top: 12, bottom: 8),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(child: content),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.cancelButton),
        ),
      ],
    );
  }
}

/// Hộp nhập lý do huỷ đơn; đóng lại với lý do (bắt buộc).
class _CancelDialog extends HookWidget {
  const _CancelDialog();

  @override
  Widget build(BuildContext context) {
    final controller = useTextEditingController();
    final error = useState<String?>(null);

    void submit() {
      final reason = controller.text.trim();
      if (reason.isEmpty) {
        error.value = AppStrings.orderCancelReasonRequired;
        return;
      }
      Navigator.of(context).pop(reason);
    }

    return AlertDialog(
      title: const Text(AppStrings.orderCancelTitle),
      content: TextField(
        key: const Key('order_cancel_reason'),
        controller: controller,
        autofocus: true,
        maxLines: 2,
        decoration: InputDecoration(
          hintText: AppStrings.orderCancelHint,
          errorText: error.value,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.cancelButton),
        ),
        TextButton(
          key: const Key('order_cancel_confirm'),
          onPressed: submit,
          style: TextButton.styleFrom(
            minimumSize: const Size(64, 48),
            foregroundColor: context.colorScheme.error,
          ),
          child: const Text(AppStrings.orderCancelConfirm),
        ),
      ],
    );
  }
}
