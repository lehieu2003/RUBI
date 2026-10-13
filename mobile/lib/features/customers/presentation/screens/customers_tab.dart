import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/presentation/cubit/customers_cubit.dart';
import 'package:iceflow_mobile/features/customers/presentation/screens/customer_detail_screen.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Mở sổ nợ của một khách. Do nơi dựng màn (shell) cấp cho Quản lý; Nhân
/// viên không có.
typedef CustomerLedgerOpener = Future<void> Function(
  BuildContext context,
  Customer customer,
);

/// Màn "Khách hàng" (Quản lý, Nhân viên): danh bạ khách, tìm ngay trên máy;
/// bấm một khách để xem liên hệ và bảng giá.
///
/// [canManage] bật nút thêm khách; [onOpenLedger] bật lối vào sổ nợ ở màn
/// chi tiết — cả hai chỉ dành cho Quản lý.
class CustomersTab extends StatelessWidget {
  const CustomersTab({this.canManage = false, this.onOpenLedger, super.key});

  final bool canManage;
  final CustomerLedgerOpener? onOpenLedger;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<CustomersCubit>(
      create: (_) => sl<CustomersCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(
          title: AppStrings.navCustomers,
          subtitle: AppStrings.customersSubtitle,
          actions: [
            if (canManage)
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Builder(
                  builder: (context) => FilledButton.tonalIcon(
                    key: const Key('customers_new'),
                    onPressed: () => _newCustomer(context),
                    icon: const Icon(Icons.person_add_alt_1_outlined),
                    label: const Text(AppStrings.customerAddButton),
                  ),
                ),
              ),
          ],
        ),
        body: _CustomersBody(onOpenLedger: onOpenLedger),
      ),
    );
  }

  Future<void> _newCustomer(BuildContext context) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<CustomersCubit>();
    final message = await showDialog<String>(
      context: context,
      builder: (_) => _NewCustomerDialog(cubit: cubit),
    );
    if (message != null) messenger.showMessage(message);
  }
}

class _CustomersBody extends StatelessWidget {
  const _CustomersBody({required this.onOpenLedger});

  final CustomerLedgerOpener? onOpenLedger;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<CustomersCubit>();
    return BlocBuilder<CustomersCubit, CustomersState>(
      builder: (context, state) {
        final matches = state.matches;
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: TextField(
                key: const Key('customers_search'),
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  hintText: AppStrings.customersSearchHint,
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                // Lọc trên máy nên không cần chờ ngừng gõ.
                onChanged: cubit.search,
              ),
            ),
            if (state.customers.isEmpty && state.status == ViewStatus.error)
              Expanded(
                child: ErrorView(message: state.errorMessage, onRetry: cubit.load),
              )
            else if (state.customers.isEmpty && state.status == ViewStatus.loading)
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
                      if (matches.isEmpty)
                        EmptyView(
                          message: state.customers.isEmpty
                              ? AppStrings.customersEmpty
                              : AppStrings.customersNoMatch,
                        ),
                      for (final customer in matches)
                        _CustomerTile(
                          customer: customer,
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => CustomerDetailScreen(
                                customer: customer,
                                onOpenLedger: onOpenLedger,
                              ),
                            ),
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
}

/// Một khách trong danh sách.
class _CustomerTile extends StatelessWidget {
  const _CustomerTile({required this.customer, required this.onTap});

  final Customer customer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final detail = [
      customer.code,
      if (customer.phone.isNotEmpty) customer.phone,
      if (customer.address.isNotEmpty) customer.address,
    ].join(' · ');
    return ListTile(
      key: Key('customer_${customer.id}'),
      leading: CircleAvatar(
        child: Text(customer.name.characters.first.toUpperCase()),
      ),
      title: Text(
        customer.name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: context.textTheme.titleMedium,
      ),
      subtitle: Text(detail, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

/// Hộp thêm khách hàng; đóng lại với câu báo khi đã thêm xong.
class _NewCustomerDialog extends HookWidget {
  const _NewCustomerDialog({required this.cubit});

  final CustomersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final code = useTextEditingController();
    final name = useTextEditingController();
    final phone = useTextEditingController();
    final address = useTextEditingController();
    final error = useState<String?>(null);
    final busy = useState(false);

    Future<void> submit() async {
      if (busy.value) return;
      if (code.text.trim().isEmpty || name.text.trim().isEmpty) {
        error.value = AppStrings.customerCodeNameRequired;
        return;
      }
      busy.value = true;
      error.value = null;
      final result = await cubit.create(
        code: code.text,
        name: name.text,
        phone: phone.text,
        address: address.text,
      );
      if (!context.mounted) return;
      if (result.ok) {
        Navigator.of(context).pop(result.message);
      } else {
        busy.value = false;
        error.value = result.message;
      }
    }

    InputDecoration field(String label) =>
        InputDecoration(labelText: label, isDense: true);

    return AlertDialog(
      title: const Text(AppStrings.customerAddTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: const Key('customer_new_code'),
              controller: code,
              autofocus: true,
              enabled: !busy.value,
              maxLength: 50,
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.next,
              decoration: field(AppStrings.customerCodeLabel)
                  .copyWith(counterText: ''),
            ),
            TextField(
              key: const Key('customer_new_name'),
              controller: name,
              enabled: !busy.value,
              maxLength: 200,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: field(AppStrings.customerNameLabel)
                  .copyWith(counterText: ''),
            ),
            TextField(
              key: const Key('customer_new_phone'),
              controller: phone,
              enabled: !busy.value,
              maxLength: 30,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: field(AppStrings.customerPhoneLabel)
                  .copyWith(counterText: ''),
            ),
            TextField(
              key: const Key('customer_new_address'),
              controller: address,
              enabled: !busy.value,
              maxLength: 300,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => submit(),
              decoration: field(AppStrings.customerAddressLabel)
                  .copyWith(counterText: ''),
            ),
            if (error.value != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  error.value!,
                  key: const Key('customer_new_error'),
                  style: TextStyle(color: context.colorScheme.error),
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: busy.value ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.cancelButton),
        ),
        FilledButton(
          key: const Key('customer_new_save'),
          onPressed: busy.value ? null : submit,
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
