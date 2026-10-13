// DTOs cho sản phẩm và giá mặc định: `GET /api/prices/global`,
// `POST /api/products`, `PATCH /api/products/{id}`
// (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`product_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'product_dtos.g.dart';

/// Một sản phẩm. `price` chỉ có trong `GET /api/prices/global`.
@JsonSerializable(createToJson: false)
class ProductDto {
  const ProductDto({
    this.id,
    this.name,
    this.sizeKg,
    this.unit,
    this.minStock,
    this.isActive,
    this.price,
  });

  factory ProductDto.fromJson(Map<String, dynamic> json) =>
      _$ProductDtoFromJson(json);

  final String? id;
  final String? name;
  final int? sizeKg;
  final String? unit;

  /// `null` hợp lệ: cảnh báo tồn kho đang tắt.
  final int? minStock;
  final bool? isActive;

  /// `null` hợp lệ: chưa có giá (hoặc response không kèm giá).
  final num? price;
}
