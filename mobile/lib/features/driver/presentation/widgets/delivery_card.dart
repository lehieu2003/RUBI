import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';

// `formatVnd` / `formatQuantity` nay ở core, dùng chung cho mọi feature.
export 'package:iceflow_mobile/core/extensions/number_format.dart';

/// Thẻ đơn giao trong danh sách của driver.
///
/// Dùng cho cả tab "Đơn hôm nay" (đầy đủ nút thao tác) lẫn danh sách lịch
/// sử của Task 15 ([readOnly] = true → ẩn toàn bộ hàng nút).
class DeliveryCard extends StatelessWidget {
  const DeliveryCard({
    super.key,
    required this.order,
    this.onConfirm,
    this.onCall,
    this.onDirections,
    this.readOnly = false,
    this.isConfirming = false,
  });

  final DeliveryOrder order;

  /// Bấm "✓ ĐÃ GIAO" — chỉ có ý nghĩa với đơn đang giao.
  final VoidCallback? onConfirm;
  final VoidCallback? onCall;
  final VoidCallback? onDirections;

  /// Ẩn toàn bộ hàng nút (xem lịch sử không cần thao tác).
  final bool readOnly;

  /// Đơn này đang chờ xác nhận (cubit bận) → nút chính disabled + spinner.
  final bool isConfirming;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final isDelivered = order.status == OrderStatus.delivered;
    final textTheme = context.textTheme;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        order.customerAddress,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _StatusBadge(isDelivered: isDelivered),
              ],
            ),
            if (order.notes != null) ...[
              const SizedBox(height: 8),
              // Dặn dò của khách: nổi bật để tài xế thấy trước khi giao.
              Container(
                key: const Key('delivery_notes'),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: colorScheme.tertiaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.sticky_note_2_outlined,
                      size: 18,
                      color: colorScheme.onTertiaryContainer,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        order.notes!,
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.bodyMedium?.copyWith(
                          color: colorScheme.onTertiaryContainer,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              _itemsSummary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              '${AppStrings.totalLabel}: ${formatVnd(order.total)}',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            // readOnly (lịch sử) → không nút nào. Đơn đã giao vẫn giữ
            // Gọi / Chỉ đường (driver có thể cần gọi sau khi giao) nhưng
            // ẨN nút xác nhận.
            if (!readOnly) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onCall,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 48),
                      ),
                      icon: const Icon(Icons.call_outlined, size: 20),
                      label: const Text(AppStrings.callButton),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onDirections,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 48),
                      ),
                      icon: const Icon(Icons.map_outlined, size: 20),
                      label: const Text(AppStrings.directionsButton),
                    ),
                  ),
                ],
              ),
              if (!isDelivered) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    // Chặn bấm khi đang chờ cubit xác nhận (chống bấm đôi).
                    onPressed: isConfirming ? null : onConfirm,
                    icon: isConfirming
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.5),
                          )
                        : const Icon(Icons.check, size: 20),
                    label: const Text(AppStrings.confirmDeliveredButton),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  /// '2 đá 10kg, 1 đá 5kg' — tối đa 2 mặt hàng, dư thì '+N sản phẩm khác'.
  String get _itemsSummary {
    final shown = order.items
        .take(2)
        .map((item) => '${formatQuantity(item.quantity)} ${item.productName}')
        .toList();
    final hidden = order.items.length - shown.length;
    if (hidden > 0) shown.add(AppStrings.productsOther(hidden));
    return shown.join(', ');
  }
}

/// Pill trạng thái: 'Đang giao' (primary) / 'Đã giao' (secondary/xám).
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.isDelivered});

  final bool isDelivered;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final background = isDelivered
        ? colorScheme.secondaryContainer
        : colorScheme.primaryContainer;
    final foreground = isDelivered
        ? colorScheme.onSecondaryContainer
        : colorScheme.onPrimaryContainer;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        isDelivered ? AppStrings.badgeDelivered : AppStrings.badgeShipping,
        style: context.textTheme.labelMedium?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
