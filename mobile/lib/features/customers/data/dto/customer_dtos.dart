// DTOs cho danh bạ khách hàng: `GET/POST /api/customers`,
// `GET /api/customers/{id}/prices` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`customer_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'customer_dtos.g.dart';

/// Một khách hàng trong `GET /api/customers`, và `data` của `POST`.
@JsonSerializable(createToJson: false)
class CustomerDto {
  const CustomerDto({this.id, this.code, this.name, this.address, this.phone});

  factory CustomerDto.fromJson(Map<String, dynamic> json) =>
      _$CustomerDtoFromJson(json);

  final String? id;
  final String? code;
  final String? name;
  final String? address;
  final String? phone;
}

/// Một phần tử của `data` trong `GET /api/customers/{id}/prices`.
@JsonSerializable(createToJson: false)
class CustomerPriceDto {
  const CustomerPriceDto({
    this.productId,
    this.name,
    this.sizeKg,
    this.unit,
    this.price,
  });

  factory CustomerPriceDto.fromJson(Map<String, dynamic> json) =>
      _$CustomerPriceDtoFromJson(json);

  final String? productId;
  final String? name;
  final int? sizeKg;
  final String? unit;

  /// `null` hợp lệ: sản phẩm chưa có giá.
  final num? price;
}
