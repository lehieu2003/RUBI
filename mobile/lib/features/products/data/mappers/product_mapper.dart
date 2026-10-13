import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/products/data/dto/product_dtos.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';

/// DTO → entity cho sản phẩm. Thiếu field bắt buộc → `Err`.
abstract final class ProductMapper {
  /// [price] thay cho giá của DTO khi response không kèm giá (tạo / sửa
  /// sản phẩm).
  static Result<Product> fromDto(ProductDto dto, {double? price}) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) return Err(MappingValidator.missing('Product', 'id'));
    final name = MappingValidator.nonEmpty(dto.name);
    if (name == null) return Err(MappingValidator.missing('Product', 'name'));
    final sizeKg = dto.sizeKg;
    if (sizeKg == null) return Err(MappingValidator.missing('Product', 'sizeKg'));
    final unit = MappingValidator.nonEmpty(dto.unit);
    if (unit == null) return Err(MappingValidator.missing('Product', 'unit'));
    final isActive = dto.isActive;
    if (isActive == null) {
      return Err(MappingValidator.missing('Product', 'isActive'));
    }
    return Ok(
      Product(
        id: id,
        name: name,
        sizeKg: sizeKg,
        unit: unit,
        isActive: isActive,
        price: dto.price?.toDouble() ?? price,
        minStock: dto.minStock,
      ),
    );
  }
}
