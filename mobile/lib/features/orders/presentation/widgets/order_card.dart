import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';

/// Giờ và ngày ngắn gọn của một đơn: "08:05 12/10".
String orderDateTime(DateTime date) {
  final local = date.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)} '
      '${two(local.day)}/${two(local.month)}';
}

/// Các dòng hàng của đơn trên một dòng chữ.
String orderLinesSummary(OfficeOrder order) => order.lines
    .map((line) => '${line.productName} ${line.sizeKg}kg × ${line.quantity}')
    .join(', ');

/// Nhãn trạng thái của một đơn.
class OrderStatusBadge extends StatelessWidget {
  const OrderStatusBadge({required this.status, super.key});

  final OfficeOrderStatus status;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final (background, foreground) = switch (status) {
      OfficeOrderStatus.pending => (
          colorScheme.surfaceContainerHighest,
          colorScheme.onSurface,
        ),
      OfficeOrderStatus.shipping => (
          colorScheme.primaryContainer,
          colorScheme.onPrimaryContainer,
        ),
      OfficeOrderStatus.delivered ||
      OfficeOrderStatus.completed =>
        (colorScheme.secondaryContainer, colorScheme.onSecondaryContainer),
      OfficeOrderStatus.cancelled => (
          colorScheme.errorContainer,
          colorScheme.onErrorContainer,
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        AppStrings.orderStatusLabel(status.wireName),
        style: context.textTheme.labelMedium?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

/// Một đơn trong danh sách.
class OrderCard extends StatelessWidget {
  const OrderCard({required this.order, required this.onTap, super.key});

  final OfficeOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final muted = colorScheme.onSurfaceVariant;
    return Card(
      key: Key('order_${order.id}'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${order.code} · ${orderDateTime(order.createdAt)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.labelLarge?.copyWith(color: muted),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OrderStatusBadge(status: order.status),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                order.customerName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              Text(
                orderLinesSummary(order),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      order.driverName == null
                          ? AppStrings.orderUnassigned
                          : AppStrings.orderDriver(order.driverName!),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: textTheme.bodySmall?.copyWith(
                        color: order.driverName == null &&
                                !order.status.isFinal
                            ? colorScheme.error
                            : muted,
                      ),
                    ),
                  ),
                  Text(
                    formatVnd(order.total),
                    style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
