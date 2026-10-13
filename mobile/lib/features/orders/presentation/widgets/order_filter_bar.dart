import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';

/// Lựa chọn trong hộp lọc tài xế: một tài xế, đơn chưa gán, hoặc mọi tài xế
/// (cả hai để trống).
typedef _DriverChoice = ({DriverOption? driver, bool unassignedOnly});

String _day(DateTime date) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year}';
}

/// Hai bộ lọc của danh sách đơn: ngày tạo đơn và tài xế. Bộ lọc đang bật thì
/// chip tô đậm và có dấu ✕ để bỏ.
class OrderFilterBar extends StatelessWidget {
  const OrderFilterBar({required this.state, required this.cubit, super.key});

  final OrdersState state;
  final OrdersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final date = state.date;
    final driverLabel = state.unassignedOnly
        ? AppStrings.orderFilterUnassigned
        : state.driver?.name;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      child: Row(
        children: [
          Flexible(
            child: InputChip(
              key: const Key('orders_filter_date'),
              avatar: const Icon(Icons.event_outlined, size: 18),
              label: Text(
                date == null ? AppStrings.orderFilterAnyDate : _day(date),
                overflow: TextOverflow.ellipsis,
              ),
              selected: date != null,
              showCheckmark: false,
              onPressed: () => _pickDate(context),
              onDeleted: date == null ? null : () => cubit.setDate(null),
              deleteButtonTooltipMessage: AppStrings.orderFilterClear,
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: InputChip(
              key: const Key('orders_filter_driver'),
              avatar: const Icon(Icons.local_shipping_outlined, size: 18),
              label: Text(
                driverLabel ?? AppStrings.orderFilterAnyDriver,
                overflow: TextOverflow.ellipsis,
              ),
              selected: driverLabel != null,
              showCheckmark: false,
              onPressed: () => _pickDriver(context),
              onDeleted: driverLabel == null ? null : () => cubit.setDriver(),
              deleteButtonTooltipMessage: AppStrings.orderFilterClear,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickDate(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: state.date ?? now,
      firstDate: DateTime(now.year - 2),
      // Đơn không tạo trước cho ngày mai.
      lastDate: now,
    );
    if (picked != null) await cubit.setDate(picked);
  }

  Future<void> _pickDriver(BuildContext context) async {
    final choice = await showDialog<_DriverChoice>(
      context: context,
      builder: (_) => _DriverFilterDialog(cubit: cubit),
    );
    if (choice == null) return;
    await cubit.setDriver(
      driver: choice.driver,
      unassignedOnly: choice.unassignedOnly,
    );
  }
}

/// Hộp chọn bộ lọc tài xế: mọi tài xế, đơn chưa gán, rồi từng tài xế.
class _DriverFilterDialog extends HookWidget {
  const _DriverFilterDialog({required this.cubit});

  final OrdersCubit cubit;

  @override
  Widget build(BuildContext context) {
    final future = useMemoized(cubit.drivers);
    final result = useFuture(future).data;

    return AlertDialog(
      title: const Text(AppStrings.orderFilterDriverTitle),
      contentPadding: const EdgeInsets.only(top: 12, bottom: 8),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                key: const Key('driver_filter_all'),
                leading: const Icon(Icons.groups_outlined),
                title: const Text(AppStrings.orderFilterAnyDriver),
                onTap: () => Navigator.of(context)
                    .pop<_DriverChoice>((driver: null, unassignedOnly: false)),
              ),
              ListTile(
                key: const Key('driver_filter_unassigned'),
                leading: const Icon(Icons.person_off_outlined),
                title: const Text(AppStrings.orderFilterUnassigned),
                onTap: () => Navigator.of(context)
                    .pop<_DriverChoice>((driver: null, unassignedOnly: true)),
              ),
              const Divider(height: 1),
              if (result == null)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (result case Ok<List<DriverOption>>(:final value))
                for (final driver in value)
                  ListTile(
                    key: Key('driver_filter_${driver.id}'),
                    leading: const Icon(Icons.local_shipping_outlined),
                    title: Text(driver.name),
                    onTap: () => Navigator.of(context).pop<_DriverChoice>(
                      (driver: driver, unassignedOnly: false),
                    ),
                  )
              else
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    AppStrings.orderDriversFailed,
                    style: TextStyle(color: context.colorScheme.error),
                  ),
                ),
            ],
          ),
        ),
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
