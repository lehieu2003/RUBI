import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
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
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) {
      return Err(MappingValidator.missing('Order', 'id'));
    }

    final total = dto.total?.toDouble();
    if (total == null) {
      return Err(MappingValidator.missing('Order', 'total'));
    }

    final customer = dto.customer;
    final customerName = MappingValidator.nonEmpty(customer?.name);
    if (customerName == null) {
      return Err(MappingValidator.missing('Order', 'customer.name'));
    }
    // SĐT / địa chỉ không bắt buộc (server lưu '' khi bỏ trống): rỗng thì
    // card ẩn nút Gọi / Chỉ đường, đơn vẫn giao được.
    final customerAddress = customer?.address ?? '';
    final customerPhone = customer?.phone ?? '';

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
      return Err(MappingValidator.missing('Order', 'orderItems'));
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
        notes: MappingValidator.nonEmpty(dto.notes?.trim()),
      ),
    );
  }

  static Result<OrderItem> fromItemDto(OrderItemDto dto) {
    final productName = MappingValidator.nonEmpty(dto.product?.name);
    if (productName == null) {
      return Err(MappingValidator.missing('Order item', 'product.name'));
    }
    final quantity = dto.quantity?.toDouble();
    if (quantity == null) {
      return Err(MappingValidator.missing('Order item', 'quantity'));
    }
    final unitPrice = dto.unitPrice?.toDouble();
    if (unitPrice == null) {
      return Err(MappingValidator.missing('Order item', 'unitPrice'));
    }
    final lineTotal = dto.lineTotal?.toDouble();
    if (lineTotal == null) {
      return Err(MappingValidator.missing('Order item', 'lineTotal'));
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
}
