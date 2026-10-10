import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';

/// Mở sheet xác nhận đã giao cho [order].
///
/// [onConfirmed] chạy SAU khi xác nhận thành công (sheet đã pop).
Future<void> showConfirmSheet(
  BuildContext context, {
  required DeliveryOrder order,
  required VoidCallback onConfirmed,
}) {
  // Đọc cubit từ context của trang gọi — sheet được đẩy lên root navigator
  // nên KHÔNG thừa kế BlocProvider phía dưới trang.
  final cubit = context.read<TodayOrdersCubit>();
  return showModalBottomSheet<void>(
    context: context,
    builder: (_) => _ConfirmSheet(
      order: order,
      cubit: cubit,
      onConfirmed: onConfirmed,
    ),
  );
}

class _ConfirmSheet extends StatefulWidget {
  const _ConfirmSheet({
    required this.order,
    required this.cubit,
    required this.onConfirmed,
  });

  final DeliveryOrder order;
  final TodayOrdersCubit cubit;
  final VoidCallback onConfirmed;

  @override
  State<_ConfirmSheet> createState() => _ConfirmSheetState();
}

class _ConfirmSheetState extends State<_ConfirmSheet> {
  bool _confirming = false;
  String? _error;

  Future<void> _confirm() async {
    if (_confirming) return;
    setState(() {
      _confirming = true;
      _error = null;
    });
    // Capture trước await — sau khi pop context của sheet hết giá trị.
    final messenger = ScaffoldMessenger.of(context);
    await widget.cubit.confirm(widget.order.id);
    if (!mounted) return;

    // Thành công = đơn trong state MỚI đã `delivered` (cubit chỉ đổi status
    // khi use case Ok; thất bại thì danh sách giữ nguyên).
    DeliveryOrder? fresh;
    for (final o in widget.cubit.state.orders) {
      if (o.id == widget.order.id) fresh = o;
    }
    if (fresh != null && fresh.status == OrderStatus.delivered) {
      Navigator.of(context).pop();
      widget.onConfirmed();
      messenger.showSnackBar(
        SnackBar(content: const Text(AppStrings.confirmedSnack)),
      );
    } else {
      setState(() {
        _confirming = false;
        _error = widget.cubit.state.errorMessage ?? AppStrings.confirmGenericError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      // Không bị che khi bàn phím mở.
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              AppStrings.confirmSheetTitle,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              AppStrings.confirmSheetBody(widget.order.customerName),
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(
                  color: colorScheme.error,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _confirming
                        ? null
                        : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 48),
                    ),
                    child: const Text(AppStrings.cancelButton),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _confirming ? null : _confirm,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 48),
                    ),
                    child: _confirming
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : const Text(AppStrings.confirmAction),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
