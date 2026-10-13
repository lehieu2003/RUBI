import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
    this.onOpenLedger,
    super.key,
  });

  final Customer customer;
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
                if (state.status == ViewStatus.loading)
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
                    ),
              ],
            );
          },
        ),
      ),
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
