import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/presentation/cubit/customers_cubit.dart';
import 'package:iceflow_mobile/features/customers/presentation/screens/customers_tab.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';
import 'package:url_launcher/url_launcher.dart';

/// Chi tiết một khách: liên hệ (bấm để gọi), bảng giá áp cho khách, và với
/// Quản lý là lối vào sổ nợ.
class CustomerDetailScreen extends StatelessWidget {
  const CustomerDetailScreen({
    required this.customer,
    this.canManage = false,
    this.onOpenLedger,
    super.key,
  });

  final Customer customer;

  /// Quản lý: bấm một dòng giá để đặt hoặc gỡ giá riêng của khách.
  final bool canManage;
  final CustomerLedgerOpener? onOpenLedger;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;
    return BlocProvider<CustomerDetailCubit>(
      create: (_) => sl<CustomerDetailCubit>(param1: customer)..load(),
      child: Scaffold(
        appBar: AppHeader(title: customer.name, subtitle: customer.code),
        body: BlocBuilder<CustomerDetailCubit, CustomerDetailState>(
          builder: (context, state) {
            final cubit = context.read<CustomerDetailCubit>();
            return ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                Card(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: Column(
                    children: [
                      ListTile(
                        key: const Key('customer_call'),
                        leading: const Icon(Icons.phone_outlined),
                        title: Text(
                          customer.phone.isEmpty
                              ? AppStrings.customerNoPhone
                              : customer.phone,
                        ),
                        trailing: customer.phone.isEmpty
                            ? null
                            : const Icon(Icons.call),
                        onTap: customer.phone.isEmpty
                            ? null
                            : () => _call(context, customer.phone),
                      ),
                      ListTile(
                        leading: const Icon(Icons.place_outlined),
                        title: Text(
                          customer.address.isEmpty
                              ? AppStrings.customerNoAddress
                              : customer.address,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onOpenLedger != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: AppButton(
                      key: const Key('customer_ledger'),
                      label: AppStrings.customerLedgerButton,
                      icon: Icons.account_balance_wallet_outlined,
                      variant: AppButtonVariant.secondary,
                      onPressed: () => onOpenLedger!(context, customer),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  child: Text(
                    AppStrings.customerPricesTitle,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (state.status == ViewStatus.loading && state.prices.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: LoadingView(),
                  )
                else if (state.status == ViewStatus.error)
                  ErrorBanner(
                    message: state.errorMessage ?? '',
                    onRetry: cubit.load,
                  )
                else if (state.prices.isEmpty)
                  const EmptyView(message: AppStrings.customerPricesEmpty)
                else
                  for (final price in state.prices)
                    ListTile(
                      key: Key('customer_price_${price.productId}'),
                      dense: true,
                      title: Text(
                        '${price.name} ${price.sizeKg}kg',
                        style: textTheme.bodyLarge,
                      ),
                      // Có giá riêng thì nói rõ, kèm giá mặc định để so.
                      subtitle: price.hasCustomPrice
                          ? Text(
                              price.basePrice == null
                                  ? AppStrings.customerPriceCustomBadge
                                  : '${AppStrings.customerPriceCustomBadge} · '
                                      '${AppStrings.customerPriceDefault(formatVnd(price.basePrice!))}',
                              style: textTheme.bodySmall?.copyWith(
                                color: context.colorScheme.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            )
                          : null,
                      trailing: Text(
                        price.price == null
                            ? AppStrings.customerPriceMissing
                            : AppStrings.orderEntryPrice(
                                formatVnd(price.price!),
                                price.unit,
                              ),
                        style: textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: price.price == null ? muted : null,
                        ),
                      ),
                      onTap: canManage
                          ? () => _editPrice(context, price)
                          : null,
                    ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _editPrice(BuildContext context, CustomerPrice price) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final errorColor = context.colorScheme.error;
    final cubit = context.read<CustomerDetailCubit>();
    final result = await showDialog<CustomerActionResult>(
      context: context,
      builder: (_) => _CustomPriceDialog(price: price, cubit: cubit),
    );
    if (result == null) return;
    messenger.showMessage(
      result.message,
      errorColor: result.ok ? null : errorColor,
    );
  }

  Future<void> _call(BuildContext context, String phone) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await launchUrl(
        Uri(scheme: 'tel', path: phone),
        mode: LaunchMode.externalApplication,
      );
    } on Object {
      messenger.showMessage(AppStrings.launchFailed);
    }
  }
}

/// Hộp đặt giá riêng của khách cho một sản phẩm, hoặc trả về giá mặc định.
/// Đóng lại với kết quả của thao tác vừa làm.
class _CustomPriceDialog extends HookWidget {
  const _CustomPriceDialog({required this.price, required this.cubit});

  final CustomerPrice price;
  final CustomerDetailCubit cubit;

  @override
  Widget build(BuildContext context) {
    final current = price.customPrice ?? price.basePrice;
    final input = useTextEditingController(
      text: current == null ? '' : current.round().toString(),
    );
    final error = useState<String?>(null);
    final busy = useState(false);

    Future<void> run(Future<CustomerActionResult> Function() action) async {
      if (busy.value) return;
      busy.value = true;
      error.value = null;
      final result = await action();
      if (!context.mounted) return;
      if (result.ok) {
        Navigator.of(context).pop(result);
      } else {
        busy.value = false;
        error.value = result.message;
      }
    }

    void save() {
      final value = int.tryParse(input.text.trim());
      if (value == null || value <= 0 || value > 99999999) {
        error.value = AppStrings.customerPriceInvalid;
        return;
      }
      run(() => cubit.setCustomPrice(price, value.toDouble()));
    }

    return AlertDialog(
      title: Text(
        AppStrings.customerPriceTitle('${price.name} ${price.sizeKg}kg'),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (price.basePrice != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                AppStrings.customerPriceDefault(formatVnd(price.basePrice!)),
              ),
            ),
          TextField(
            key: const Key('customer_price_input'),
            controller: input,
            autofocus: true,
            enabled: !busy.value,
            maxLength: 8,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            onSubmitted: (_) => save(),
            decoration: InputDecoration(
              labelText: AppStrings.customerPriceLabel,
              helperText: AppStrings.customerPriceHelper,
              helperMaxLines: 2,
              suffixText: 'đ',
              errorText: error.value,
              errorMaxLines: 3,
              isDense: true,
              counterText: '',
            ),
          ),
          if (price.hasCustomPrice)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: AppButton(
                key: const Key('customer_price_remove'),
                label: AppStrings.customerPriceUseDefault,
                icon: Icons.undo,
                variant: AppButtonVariant.text,
                onPressed: busy.value
                    ? null
                    : () => run(() => cubit.removeCustomPrice(price)),
              ),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: busy.value ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.cancelButton),
        ),
        FilledButton(
          key: const Key('customer_price_save'),
          onPressed: busy.value ? null : save,
          style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
          child: busy.value
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              : const Text(AppStrings.customerSaveButton),
        ),
      ],
    );
  }
}
