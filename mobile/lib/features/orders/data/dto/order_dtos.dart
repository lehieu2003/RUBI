// DTOs cho đơn hàng phía văn phòng: `/api/orders`, `/api/orders/counts`,
// `/api/orders/bulk-assign`, `/api/orders/{id}/status`, `/api/drivers`
// (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`order_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng. Field app
// không dùng (customerId, factoryId...) bị bỏ qua.
import 'package:json_annotation/json_annotation.dart';

part 'order_dtos.g.dart';

/// Một phần tử của `data` trong `GET /api/orders`.
@JsonSerializable(createToJson: false)
class OfficeOrderDto {
  const OfficeOrderDto({
    this.id,
    this.status,
    this.total,
    this.notes,
    this.createdAt,
    this.deliveredAt,
    this.completedAt,
    this.customer,
    this.driver,
    this.orderItems,
  });

  factory OfficeOrderDto.fromJson(Map<String, dynamic> json) =>
      _$OfficeOrderDtoFromJson(json);

  final String? id;
  final String? status;
  final num? total;
  final String? notes;
  final String? createdAt;
  final String? deliveredAt;
  final String? completedAt;
  final OrderCustomerDto? customer;

  /// `null` hợp lệ: đơn chưa gán tài xế.
  final OrderDriverDto? driver;
  final List<OrderLineDto>? orderItems;
}

@JsonSerializable(createToJson: false)
class OrderCustomerDto {
  const OrderCustomerDto({this.code, this.name, this.address, this.phone});

  factory OrderCustomerDto.fromJson(Map<String, dynamic> json) =>
      _$OrderCustomerDtoFromJson(json);

  final String? code;
  final String? name;
  final String? address;
  final String? phone;
}

@JsonSerializable(createToJson: false)
class OrderDriverDto {
  const OrderDriverDto({this.id, this.name});

  factory OrderDriverDto.fromJson(Map<String, dynamic> json) =>
      _$OrderDriverDtoFromJson(json);

  final String? id;
  final String? name;
}

@JsonSerializable(createToJson: false)
class OrderLineDto {
  const OrderLineDto({
    this.id,
    this.quantity,
    this.unitPrice,
    this.lineTotal,
    this.actualQty,
    this.product,
  });

  factory OrderLineDto.fromJson(Map<String, dynamic> json) =>
      _$OrderLineDtoFromJson(json);

  final String? id;
  final int? quantity;
  final num? unitPrice;
  final num? lineTotal;

  /// `null` hợp lệ: đơn chưa đối soát.
  final int? actualQty;
  final OrderProductDto? product;
}

@JsonSerializable(createToJson: false)
class OrderProductDto {
  const OrderProductDto({this.name, this.sizeKg, this.unit});

  factory OrderProductDto.fromJson(Map<String, dynamic> json) =>
      _$OrderProductDtoFromJson(json);

  final String? name;
  final int? sizeKg;
  final String? unit;
}

/// `data` của `GET /api/orders/counts`.
@JsonSerializable(createToJson: false)
class OrderCountsDto {
  const OrderCountsDto({this.total, this.byStatus});

  factory OrderCountsDto.fromJson(Map<String, dynamic> json) =>
      _$OrderCountsDtoFromJson(json);

  final int? total;

  /// Khoá là giá trị trạng thái của server (`PENDING`...).
  final Map<String, int>? byStatus;
}

/// Một phần tử của `data` trong `GET /api/drivers`.
@JsonSerializable(createToJson: false)
class DriverOptionDto {
  const DriverOptionDto({this.id, this.name, this.phone});

  factory DriverOptionDto.fromJson(Map<String, dynamic> json) =>
      _$DriverOptionDtoFromJson(json);

  final String? id;
  final String? name;
  final String? phone;
}
