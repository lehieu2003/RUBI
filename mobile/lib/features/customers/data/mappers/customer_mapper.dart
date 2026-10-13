import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/customers/data/dto/customer_dtos.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';

/// DTO → entity cho danh bạ khách hàng. Thiếu field bắt buộc → `Err`.
abstract final class CustomerMapper {
  static Result<Customer> fromDto(CustomerDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Customer', 'id'));
    final code = MappingValidator.nonEmpty(dto.code);
    if (code == null) return Err(MappingValidator.missing('Customer', 'code'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Customer', 'name'));
    return Ok(
      Customer(
        id: id,
        code: code,
        name: name,
        // Địa chỉ và số điện thoại có thể để trống.
        address: dto.address ?? '',
        phone: dto.phone ?? '',
      ),
    );
  }

  static Result<CustomerPrice> fromPriceDto(CustomerPriceDto dto) {
    final productId = MappingValidator.nonEmpty(dto.productId);
    if (productId == null) {
      return Err(MappingValidator.missing('Customer price', 'productId'));
    }
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) {
      return Err(MappingValidator.missing('Customer price', 'name'));
    }
    final sizeKg = dto.sizeKg;
    if (sizeKg == null) {
      return Err(MappingValidator.missing('Customer price', 'sizeKg'));
    }
    final unit = MappingValidator.nonEmpty(dto.unit);
    if (unit == null) {
      return Err(MappingValidator.missing('Customer price', 'unit'));
    }
    return Ok(
      CustomerPrice(
        productId: productId,
        name: name,
        sizeKg: sizeKg,
        unit: unit,
        price: dto.price?.toDouble(),
        basePrice: dto.basePrice?.toDouble(),
        customPrice: dto.customPrice?.toDouble(),
      ),
    );
  }
}
