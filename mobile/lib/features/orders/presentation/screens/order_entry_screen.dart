import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/order_entry_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/widgets/quantity_stepper.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Màn "Lên đơn" (Quản lý, Nhân viên): chọn khách, nhập số lượng từng sản
/// phẩm, lưu. Đóng lại với đơn vừa lên, hoặc `null` nếu thoát giữa chừng.
class OrderEntryScreen extends StatelessWidget {
  const OrderEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<OrderEntryCubit>(
      create: (_) => sl<OrderEntryCubit>()..loadCustomers(),
      child: BlocBuilder<OrderEntryCubit, OrderEntryState>(
        builder: (context, state) {
          final customer = state.customer;
          return PopScope<CreatedOrder>(
            // Đã nhập số lượng thì hỏi lại trước khi thoát; lưu xong thì màn
            // tự đóng bằng lệnh riêng, không qua đây.
            canPop: state.quantities.isEmpty,
            onPopInvokedWithResult: (didPop, _) {
              if (!didPop && !state.submitting) _confirmLeave(context);
            },
            child: Scaffold(
              appBar: AppHeader(
                title: AppStrings.orderEntryTitle,
                subtitle: customer?.name ?? AppStrings.orderEntryPickCustomer,
              ),
              body: customer == null
                  ? _CustomerPicker(state: state)
                  : _OrderForm(state: state, customer: customer),
            ),
          );
        },
      ),
    );
  }
}

/// Hỏi lại trước khi bỏ một đơn đang nhập dở.
Future<void> _confirmLeave(BuildContext context) async {
  final navigator = Navigator.of(context);
  final leave = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text(AppStrings.orderEntryLeaveTitle),
      content: const Text(AppStrings.orderEntryLeaveBody),
      actions: [
        TextButton(
          key: const Key('order_entry_stay'),
          onPressed: () => Navigator.of(dialogContext).pop(false),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.orderEntryStay),
        ),
        TextButton(
          key: const Key('order_entry_leave'),
          onPressed: () => Navigator.of(dialogContext).pop(true),
          style: TextButton.styleFrom(
            minimumSize: const Size(64, 48),
            foregroundColor: Theme.of(dialogContext).colorScheme.error,
          ),
          child: const Text(AppStrings.orderEntryLeave),
        ),
      ],
    ),
  );
  if (leave == true) navigator.pop();
}

/// Bước 1: gõ để lọc danh sách khách ngay trên máy, bấm để chọn.
class _CustomerPicker extends StatelessWidget {
  const _CustomerPicker({required this.state});

  final OrderEntryState state;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OrderEntryCubit>();
    final matches = state.matches;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            key: const Key('order_entry_customer_search'),
            // Vào màn là gõ được ngay: nhân viên đang nghe điện thoại.
            autofocus: true,
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration(
              hintText: AppStrings.orderEntryCustomerHint,
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: cubit.search,
          ),
        ),
        Expanded(
          child: switch (state.customersStatus) {
            ViewStatus.error => ErrorView(
                message: state.customersError,
                onRetry: cubit.loadCustomers,
              ),
            ViewStatus.loaded when matches.isEmpty =>
              const EmptyView(message: AppStrings.orderEntryNoCustomers),
            ViewStatus.loaded => ListView.builder(
                itemCount: matches.length,
                itemBuilder: (context, index) {
                  final customer = matches[index];
                  final detail = [
                    customer.code,
                    if (customer.phone.isNotEmpty) customer.phone,
                    if (customer.address.isNotEmpty) customer.address,
                  ].join(' · ');
                  return ListTile(
                    key: Key('order_entry_customer_${customer.id}'),
                    title: Text(
                      customer.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      detail,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => cubit.selectCustomer(customer),
                  );
                },
              ),
            _ => const LoadingView(),
          },
        ),
      ],
    );
  }
}

/// Bước 2: số lượng từng sản phẩm theo giá của khách, ghi chú, tổng và nút lưu.
class _OrderForm extends HookWidget {
  const _OrderForm({required this.state, required this.customer});

  final OrderEntryState state;
  final CustomerOption customer;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<OrderEntryCubit>();
    final notes = useTextEditingController();
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;

    Future<void> save() async {
      FocusScope.of(context).unfocus();
      final created = await cubit.submit(notes: notes.text);
      if (created != null && context.mounted) {
        Navigator.of(context).pop(created);
      }
    }

    final Widget list;
    if (state.productsStatus == ViewStatus.error) {
      list = ErrorView(message: state.productsError, onRetry: cubit.loadPrices);
    } else if (state.productsStatus == ViewStatus.loading) {
      list = const LoadingView();
    } else if (state.products.isEmpty) {
      list = const EmptyView(message: AppStrings.orderEntryNoProducts);
    } else {
      list = ListView(
        padding: const EdgeInsets.only(bottom: 16),
        children: [
          for (final product in state.products)
            _ProductRow(
              key: Key('order_entry_product_${product.productId}'),
              product: product,
              quantity: state.quantityOf(product.productId),
              enabled: !state.submitting,
              onChanged: (quantity) =>
                  cubit.setQuantity(product.productId, quantity),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              key: const Key('order_entry_notes'),
              controller: notes,
              enabled: !state.submitting,
              maxLength: 500,
              maxLines: 2,
              minLines: 1,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                hintText: AppStrings.orderEntryNotesHint,
                border: OutlineInputBorder(),
                isDense: true,
                counterText: '',
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListTile(
          title: Text(
            '${customer.name} (${customer.code})',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          subtitle: customer.address.isEmpty
              ? null
              : Text(
                  customer.address,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
          trailing: TextButton(
            key: const Key('order_entry_change_customer'),
            onPressed: state.submitting ? null : cubit.changeCustomer,
            child: const Text(AppStrings.orderEntryChangeCustomer),
          ),
        ),
        const Divider(height: 1),
        Expanded(child: list),
        Material(
          elevation: 8,
          color: colorScheme.surface,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (state.submitError != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        state.submitError!,
                        key: const Key('order_entry_error'),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.error,
                        ),
                      ),
                    ),
                  Row(
                    children: [
                      Text(
                        AppStrings.orderEntryTotal(state.lineCount),
                        style: textTheme.titleMedium,
                      ),
                      const SizedBox(width: 8),
                      // Tổng rất lớn thì thu chữ lại chứ không tràn.
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerRight,
                          child: Text(
                            formatVnd(state.total),
                            key: const Key('order_entry_total'),
                            style: textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    key: const Key('order_entry_save'),
                    label: AppStrings.orderEntrySave,
                    icon: Icons.check,
                    onPressed: state.canSubmit || state.submitting ? save : null,
                    loading: state.submitting,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Một sản phẩm: tên, giá của khách, số còn bán được, và ô số lượng.
class _ProductRow extends StatelessWidget {
  const _ProductRow({
    required this.product,
    required this.quantity,
    required this.enabled,
    required this.onChanged,
    super.key,
  });

  final PricedProduct product;
  final int quantity;
  final bool enabled;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final muted = colorScheme.onSurfaceVariant;
    final price = product.price;
    final left = product.sellable;
    final active = enabled && product.canOrder;
    // Hết hàng, hoặc đang đặt quá số còn bán được.
    final short = left != null && (left <= 0 || quantity > left);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 2),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${product.name} ${product.sizeKg}kg',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.titleMedium,
                ),
                if (price == null)
                  Text(
                    AppStrings.orderEntryNoPrice,
                    style: textTheme.bodySmall?.copyWith(color: colorScheme.error),
                  )
                else
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: AppStrings.orderEntryPrice(
                            formatVnd(price),
                            product.unit,
                          ),
                        ),
                        if (left != null) ...[
                          const TextSpan(text: ' · '),
                          TextSpan(
                            text: AppStrings.orderEntrySellable(left),
                            style: short
                                ? TextStyle(
                                    color: colorScheme.error,
                                    fontWeight: FontWeight.w700,
                                  )
                                : null,
                          ),
                        ],
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.bodySmall?.copyWith(color: muted),
                  ),
              ],
            ),
          ),
          QuantityStepper(
            keyPrefix: 'order_entry',
            id: product.productId,
            quantity: quantity,
            enabled: active,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
