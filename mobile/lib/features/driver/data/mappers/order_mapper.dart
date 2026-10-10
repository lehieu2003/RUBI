import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/data/dto/driver_dtos.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';

/// Chuyển [OrderDto] → domain [DeliveryOrder].
///
/// Trả `Err(UnexpectedFailure)` cho payload thiếu/broken thay vì ném exception
/// (field SAI KIỂU đã ném TypeError ở DTO — repository giữ lại trong Result).
/// Khác [UserRole.fromName], status lạ KHÔNG lỗi: map về `shipping` theo
/// safe-default có chủ ý của [OrderStatus.fromName].
abstract final class OrderMapper {
  static Result<DeliveryOrder> fromDto(OrderDto dto) {
    final id = _nonEmpty(dto.id);
    if (id == null) {
      return const Err(UnexpectedFailure('Order payload missing `id`'));
    }

    final total = dto.total?.toDouble();
    if (total == null) {
      return const Err(UnexpectedFailure('Order payload missing `total`'));
    }

    final customer = dto.customer;
    final customerName = _nonEmpty(customer?.name);
    if (customerName == null) {
      return const Err(UnexpectedFailure('Order payload missing `customer.name`'));
    }
    final customerAddress = _nonEmpty(customer?.address);
    if (customerAddress == null) {
      return const Err(
        UnexpectedFailure('Order payload missing `customer.address`'),
      );
    }
    final customerPhone = _nonEmpty(customer?.phone);
    if (customerPhone == null) {
      return const Err(UnexpectedFailure('Order payload missing `customer.phone`'));
    }

    final createdAt = DateTime.tryParse(dto.createdAt ?? '');
    if (createdAt == null) {
      return const Err(
        UnexpectedFailure('Order payload missing/unparseable `createdAt`'),
      );
    }

    // deliveredAt: ISO hoặc null (đơn đang giao). Có mà không parse được → hỏng.
    final deliveredAt = dto.deliveredAt == null
        ? null
        : DateTime.tryParse(dto.deliveredAt!);
    if (dto.deliveredAt != null && deliveredAt == null) {
      return const Err(
        UnexpectedFailure('Order payload unparseable `deliveredAt`'),
      );
    }

    final rawItems = dto.orderItems;
    if (rawItems == null) {
      return const Err(UnexpectedFailure('Order payload missing `orderItems`'));
    }
    final items = <OrderItem>[];
    for (final itemDto in rawItems) {
      switch (fromItemDto(itemDto)) {
        case Ok<OrderItem>(:final value):
          items.add(value);
        case Err<OrderItem>(:final failure):
          return Err(failure);
      }
    }

    return Ok(
      DeliveryOrder(
        id: id,
        status: OrderStatus.fromName(dto.status),
        total: total,
        customerName: customerName,
        customerAddress: customerAddress,
        customerPhone: customerPhone,
        items: items,
        createdAt: createdAt,
        deliveredAt: deliveredAt,
      ),
    );
  }

  static Result<OrderItem> fromItemDto(OrderItemDto dto) {
    final productName = _nonEmpty(dto.productName);
    if (productName == null) {
      return const Err(
        UnexpectedFailure('Order item payload missing `product.name`'),
      );
    }
    final quantity = dto.quantity?.toDouble();
    if (quantity == null) {
      return const Err(UnexpectedFailure('Order item payload missing `quantity`'));
    }
    final unitPrice = dto.unitPrice?.toDouble();
    if (unitPrice == null) {
      return const Err(UnexpectedFailure('Order item payload missing `unitPrice`'));
    }
    final lineTotal = dto.lineTotal?.toDouble();
    if (lineTotal == null) {
      return const Err(UnexpectedFailure('Order item payload missing `lineTotal`'));
    }
    return Ok(
      OrderItem(
        productName: productName,
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      ),
    );
  }

  static String? _nonEmpty(String? value) =>
      (value == null || value.isEmpty) ? null : value;
}
