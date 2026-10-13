// DTOs cho việc lên đơn: `GET /api/customers`,
// `GET /api/customers/{id}/prices`, `POST /api/orders`
// (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`order_entry_dtos.g.dart`; sửa file
// này xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'order_entry_dtos.g.dart';

/// Một phần tử của `data` trong `GET /api/customers`.
@JsonSerializable(createToJson: false)
class CustomerOptionDto {
  const CustomerOptionDto({this.id, this.code, this.name, this.address, this.phone});

  factory CustomerOptionDto.fromJson(Map<String, dynamic> json) =>
      _$CustomerOptionDtoFromJson(json);

  final String? id;
  final String? code;
  final String? name;
  final String? address;
  final String? phone;
}

/// Một phần tử của `data` trong `GET /api/customers/{id}/prices`.
@JsonSerializable(createToJson: false)
class PricedProductDto {
  const PricedProductDto({
    this.productId,
    this.name,
    this.sizeKg,
    this.unit,
    this.price,
    this.sellable,
  });

  factory PricedProductDto.fromJson(Map<String, dynamic> json) =>
      _$PricedProductDtoFromJson(json);

  final String? productId;
  final String? name;
  final int? sizeKg;
  final String? unit;

  /// `null` hợp lệ: sản phẩm chưa có giá.
  final num? price;

  /// `null` hợp lệ: sản phẩm chưa từng có số tồn.
  final int? sellable;
}

/// `data` của `POST /api/orders`.
@JsonSerializable(createToJson: false)
class CreatedOrderDto {
  const CreatedOrderDto({this.id, this.total, this.customerName});

  factory CreatedOrderDto.fromJson(Map<String, dynamic> json) =>
      _$CreatedOrderDtoFromJson(json);

  final String? id;
  final num? total;
  final String? customerName;
}
