import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/dto/order_entry_dtos.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';

/// DTO → entity cho việc lên đơn. Thiếu field bắt buộc → `Err`, không suy
/// mặc định: một giá hay một mã khách đoán mò còn tệ hơn báo lỗi.
abstract final class OrderEntryMapper {
  static Result<CustomerOption> fromCustomerDto(CustomerOptionDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Customer', 'id'));
    final code = MappingValidator.nonEmpty(dto.code);
    if (code == null) return Err(MappingValidator.missing('Customer', 'code'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Customer', 'name'));
    return Ok(
      CustomerOption(
        id: id,
        code: code,
        name: name,
        // Địa chỉ và số điện thoại có thể để trống.
        address: dto.address ?? '',
        phone: dto.phone ?? '',
      ),
    );
  }

  static Result<PricedProduct> fromPricedProductDto(PricedProductDto dto) {
    final productId = MappingValidator.nonEmpty(dto.productId);
    if (productId == null) {
      return Err(MappingValidator.missing('Price list', 'productId'));
    }
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Price list', 'name'));
    final sizeKg = dto.sizeKg;
    if (sizeKg == null) {
      return Err(MappingValidator.missing('Price list', 'sizeKg'));
    }
    final unit = MappingValidator.nonEmpty(dto.unit);
    if (unit == null) return Err(MappingValidator.missing('Price list', 'unit'));
    return Ok(
      PricedProduct(
        productId: productId,
        name: name,
        sizeKg: sizeKg,
        unit: unit,
        price: dto.price?.toDouble(),
        sellable: dto.sellable,
      ),
    );
  }

  static Result<CreatedOrder> fromCreatedDto(CreatedOrderDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Created order', 'id'));
    final total = dto.total;
    if (total == null) {
      return Err(MappingValidator.missing('Created order', 'total'));
    }
    final customerName = MappingValidator.nonEmpty(dto.customerName);
    if (customerName == null) {
      return Err(MappingValidator.missing('Created order', 'customerName'));
    }
    return Ok(
      CreatedOrder(
        id: id,
        total: total.toDouble(),
        customerName: customerName,
      ),
    );
  }
}
