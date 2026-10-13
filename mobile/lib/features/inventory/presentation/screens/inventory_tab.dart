import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';
import 'package:iceflow_mobile/features/inventory/presentation/cubit/inventory_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

String _number(num value) {
  final digits = value.round().abs().toString();
  final grouped = digits.replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+$)'),
    (match) => '${match[1]}.',
  );
  return value < 0 ? '-$grouped' : grouped;
}

/// Tab "Kho lạnh" của Quản lý: tồn từng sản phẩm, cảnh báo sắp hết, nhập mẻ
/// sản xuất và kiểm kho.
class InventoryTab extends StatelessWidget {
  const InventoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<InventoryCubit>(
      // Rời tab unmount cubit → quay lại tải lại từ đầu.
      create: (_) => sl<InventoryCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(title: AppStrings.navInventory),
        body: BlocBuilder<InventoryCubit, InventoryState>(
          builder: (context, state) {
            final cubit = context.read<InventoryCubit>();
            final stock = state.stock;
            if (stock == null && state.status == ViewStatus.error) {
              return ErrorView(message: state.errorMessage, onRetry: cubit.load);
            }
            if (stock == null) {
              return const LoadingView();
            }
            final low = stock.lowStockItems;
            return Column(
              children: [
                if (state.status == ViewStatus.error)
                  ErrorBanner(
                    message: state.errorMessage ?? '',
                    onRetry: cubit.load,
                  ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: cubit.load,
                    child: ListView(
                      padding: const EdgeInsets.only(bottom: 16),
                      children: [
                        _Totals(stock: stock),
                        if (low.isNotEmpty) _LowStockAlert(items: low),
                        if (stock.items.isEmpty)
                          const EmptyView(message: AppStrings.stockEmpty),
                        for (final item in stock.items)
                          _StockCard(
                            item: item,
                            onProduction: () => _openSheet(
                              context,
                              item,
                              counting: false,
                            ),
                            onCount: () => _openSheet(
                              context,
                              item,
                              counting: true,
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

  Future<void> _openSheet(
    BuildContext context,
    StockItem item, {
    required bool counting,
  }) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<InventoryCubit>();
    final message = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _StockSheet(item: item, counting: counting, cubit: cubit),
    );
    if (message == null) return;
    messenger.showMessage(message);
  }
}

/// Tổng số bao và tổng khối lượng trong kho.
class _Totals extends StatelessWidget {
  const _Totals({required this.stock});

  final Stock stock;

  @override
  Widget build(BuildContext context) {
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;
    Widget figure(String label, String value) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: textTheme.labelMedium?.copyWith(color: muted)),
              const SizedBox(height: 2),
              Text(
                value,
                style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
        );
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          figure(AppStrings.stockTotalBags, _number(stock.totalBags)),
          figure(AppStrings.stockTotalKg, '${_number(stock.totalKg)} kg'),
        ],
      ),
    );
  }
}

/// Khung cảnh báo các sản phẩm sắp hết.
class _LowStockAlert extends StatelessWidget {
  const _LowStockAlert({required this.items});

  final List<StockItem> items;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    return Container(
      key: const Key('inventory_low_stock_alert'),
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: colorScheme.onErrorContainer),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AppStrings.stockLowTitle,
                  style: textTheme.titleSmall?.copyWith(
                    color: colorScheme.onErrorContainer,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                for (final item in items)
                  Text(
                    AppStrings.stockLowLine(
                      '${item.productName} ${item.sizeKg}kg',
                      _number(item.sellable),
                      item.unit,
                      _number(item.minStock ?? 0),
                    ),
                    style: textTheme.bodyMedium
                        ?.copyWith(color: colorScheme.onErrorContainer),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Một sản phẩm: tồn trên sổ, còn bán được, và hai thao tác.
class _StockCard extends StatelessWidget {
  const _StockCard({
    required this.item,
    required this.onProduction,
    required this.onCount,
  });

  final StockItem item;
  final VoidCallback onProduction;
  final VoidCallback onCount;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final negative = item.quantityOnHand < 0;
    return Card(
      key: Key('inventory_item_${item.productId}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${item.productName} ${item.sizeKg}kg',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                if (item.lowStock)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      AppStrings.stockLowBadge,
                      style: textTheme.labelMedium?.copyWith(
                        color: colorScheme.onErrorContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              AppStrings.stockOnHand(_number(item.quantityOnHand), item.unit),
              style: textTheme.bodyLarge?.copyWith(
                color: negative ? colorScheme.error : null,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              AppStrings.stockSellable(_number(item.sellable)),
              style: textTheme.bodyMedium?.copyWith(
                color: item.lowStock
                    ? colorScheme.error
                    : colorScheme.onSurfaceVariant,
              ),
            ),
            if (negative)
              Text(
                AppStrings.stockNegativeHint,
                style: textTheme.bodySmall?.copyWith(color: colorScheme.error),
              ),
            const SizedBox(height: 4),
            // Wrap: trên máy hẹp hoặc cỡ chữ lớn, nút thứ hai xuống dòng.
            Wrap(
              children: [
                TextButton.icon(
                  onPressed: onProduction,
                  style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                  icon: const Icon(Icons.add),
                  label: const Text(AppStrings.stockProductionButton),
                ),
                TextButton.icon(
                  onPressed: onCount,
                  style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text(AppStrings.stockCountButton),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Sheet nhập mẻ ([counting] = false) hoặc kiểm kho ([counting] = true).
/// Đóng lại với câu báo thành công; lỗi hiện ngay trong sheet.
class _StockSheet extends HookWidget {
  const _StockSheet({
    required this.item,
    required this.counting,
    required this.cubit,
  });

  final StockItem item;
  final bool counting;
  final InventoryCubit cubit;

  @override
  Widget build(BuildContext context) {
    final quantityController = useTextEditingController();
    final noteController = useTextEditingController();
    final submitting = useState(false);
    final error = useState<String?>(null);
    final textTheme = context.textTheme;

    Future<void> submit() async {
      if (submitting.value) return;
      final quantity = int.tryParse(quantityController.text.trim());
      // Nhập mẻ phải lớn hơn 0; kiểm kho có thể đếm ra 0.
      if (quantity == null || quantity < (counting ? 0 : 1)) {
        error.value = counting
            ? AppStrings.stockCountInvalid
            : AppStrings.stockProductionInvalid;
        return;
      }
      submitting.value = true;
      error.value = null;
      final result = counting
          ? await cubit.recordCount(item, quantity, note: noteController.text)
          : await cubit.recordProduction(item, quantity);
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
          Text(
            counting
                ? AppStrings.stockCountTitle
                : AppStrings.stockProductionTitle,
            style: textTheme.titleLarge,
          ),
          const SizedBox(height: 4),
          Text(
            '${item.productName} ${item.sizeKg}kg · '
            '${AppStrings.stockOnHand(_number(item.quantityOnHand), item.unit)}',
            style: textTheme.bodyMedium
                ?.copyWith(color: context.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          TextField(
            key: const Key('stock_sheet_quantity'),
            controller: quantityController,
            autofocus: true,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: counting
                  ? AppStrings.stockCountLabel(item.unit)
                  : AppStrings.stockProductionLabel(item.unit),
            ),
            onSubmitted: counting ? null : (_) => submit(),
          ),
          if (counting) ...[
            const SizedBox(height: 12),
            TextField(
              key: const Key('stock_sheet_note'),
              controller: noteController,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: AppStrings.stockNoteLabel,
              ),
              onSubmitted: (_) => submit(),
            ),
          ],
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
            key: const Key('stock_sheet_submit'),
            onPressed: submitting.value ? null : submit,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            child: submitting.value
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 3),
                  )
                : Text(
                    counting
                        ? AppStrings.stockCountSubmit
                        : AppStrings.stockProductionSubmit,
                  ),
          ),
        ],
      ),
    );
  }
}
