import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/dto/order_dtos.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';

/// Chuyển DTO đơn hàng → domain. Trạng thái lạ, thiếu tiền hay thiếu số lượng
/// đều là payload hỏng: văn phòng gán xe và thu tiền theo các số này.
abstract final class OfficeOrderMapper {
  static Result<OfficeOrder> fromDto(OfficeOrderDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Order', 'id'));

    final status = OfficeOrderStatus.fromName(dto.status);
    if (status == null) {
      return Err(UnexpectedFailure('Unknown order status: ${dto.status}'));
    }
    final total = dto.total;
    if (total == null) return Err(MappingValidator.missing('Order', 'total'));

    final createdAt = MappingValidator.dateTime(dto.createdAt);
    if (createdAt == null) {
      return const Err(
        UnexpectedFailure('Order payload missing/unparseable `createdAt`'),
      );
    }
    // Có mà không đọc được → hỏng; không có → chưa giao / chưa đối soát.
    final deliveredAt = MappingValidator.dateTime(dto.deliveredAt);
    if (dto.deliveredAt != null && deliveredAt == null) {
      return const Err(UnexpectedFailure('Order payload unparseable `deliveredAt`'));
    }
    final completedAt = MappingValidator.dateTime(dto.completedAt);
    if (dto.completedAt != null && completedAt == null) {
      return const Err(UnexpectedFailure('Order payload unparseable `completedAt`'));
    }

    final customer = dto.customer;
    final customerName = MappingValidator.nonEmpty(customer?.name);
    if (customerName == null) {
      return Err(MappingValidator.missing('Order', 'customer.name'));
    }
    final customerCode = MappingValidator.nonEmpty(customer?.code);
    if (customerCode == null) {
      return Err(MappingValidator.missing('Order', 'customer.code'));
    }

    // Tài xế: không có → chưa gán; có mà thiếu id/tên → hỏng.
    final driver = dto.driver;
    final driverId = MappingValidator.nonEmpty(driver?.id);
    final driverName = MappingValidator.nonEmpty(driver?.name);
    if (driver != null && (driverId == null || driverName == null)) {
      return Err(MappingValidator.missing('Order', 'driver.id/name'));
    }

    final rawLines = dto.orderItems;
    if (rawLines == null) {
      return Err(MappingValidator.missing('Order', 'orderItems'));
    }
    final lines = <OrderLine>[];
    for (final lineDto in rawLines) {
      switch (fromLineDto(lineDto)) {
        case Ok<OrderLine>(:final value):
          lines.add(value);
        case Err<OrderLine>(:final failure):
          return Err(failure);
      }
    }

    return Ok(
      OfficeOrder(
        id: id,
        status: status,
        total: total.toDouble(),
        createdAt: createdAt,
        customerName: customerName,
        customerCode: customerCode,
        // Địa chỉ và điện thoại có thể để trống khi tạo khách.
        customerAddress: customer?.address ?? '',
        customerPhone: customer?.phone ?? '',
        lines: lines,
        notes: MappingValidator.nonEmpty(dto.notes?.trim()),
        driverId: driverId,
        driverName: driverName,
        deliveredAt: deliveredAt,
        completedAt: completedAt,
      ),
    );
  }

  static Result<OrderLine> fromLineDto(OrderLineDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Order item', 'id'));

    final productName = MappingValidator.nonEmpty(dto.product?.name);
    if (productName == null) {
      return Err(MappingValidator.missing('Order item', 'product.name'));
    }
    final sizeKg = dto.product?.sizeKg;
    if (sizeKg == null) {
      return Err(MappingValidator.missing('Order item', 'product.sizeKg'));
    }
    final unit = MappingValidator.nonEmpty(dto.product?.unit);
    if (unit == null) {
      return Err(MappingValidator.missing('Order item', 'product.unit'));
    }
    final quantity = dto.quantity;
    if (quantity == null) {
      return Err(MappingValidator.missing('Order item', 'quantity'));
    }
    final unitPrice = dto.unitPrice;
    if (unitPrice == null) {
      return Err(MappingValidator.missing('Order item', 'unitPrice'));
    }
    final lineTotal = dto.lineTotal;
    if (lineTotal == null) {
      return Err(MappingValidator.missing('Order item', 'lineTotal'));
    }
    return Ok(
      OrderLine(
        id: id,
        productName: productName,
        sizeKg: sizeKg,
        unit: unit,
        quantity: quantity,
        unitPrice: unitPrice.toDouble(),
        lineTotal: lineTotal.toDouble(),
        actualQty: dto.actualQty,
      ),
    );
  }

  static Result<OrderCounts> fromCountsDto(OrderCountsDto dto) {
    final total = dto.total;
    if (total == null) return Err(MappingValidator.missing('Order counts', 'total'));
    final raw = dto.byStatus;
    if (raw == null) {
      return Err(MappingValidator.missing('Order counts', 'byStatus'));
    }
    final byStatus = <OfficeOrderStatus, int>{};
    for (final status in OfficeOrderStatus.values) {
      final count = raw[status.wireName];
      if (count == null) {
        return Err(
          MappingValidator.missing('Order counts', 'byStatus.${status.wireName}'),
        );
      }
      byStatus[status] = count;
    }
    return Ok(OrderCounts(total: total, byStatus: byStatus));
  }

  static Result<DriverOption> fromDriverDto(DriverOptionDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Driver', 'id'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Driver', 'name'));
    return Ok(
      DriverOption(id: id, name: name, phone: MappingValidator.nonEmpty(dto.phone)),
    );
  }
}
