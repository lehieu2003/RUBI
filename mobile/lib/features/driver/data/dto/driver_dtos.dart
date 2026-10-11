// DTOs cho response `GET /api/driver/orders` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`driver_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate: field SAI KIỂU ném TypeError ngay tại đây (cố tình để rẻ), và
// repository biến mọi exception — kể cả TypeError — thành
// `Err(UnexpectedFailure)` nên callers chỉ bao giờ thấy `Result`, không có
// exception nào xuyên lớp. Field lạ (driverName, note...) bị bỏ qua.
import 'package:json_annotation/json_annotation.dart';

part 'driver_dtos.g.dart';

/// `data` của `GET /api/driver/orders` — mapper chỉ đọc `orders`, bỏ qua
/// `driver` (không cần cho luồng giao hàng).
@JsonSerializable(createToJson: false)
class DriverOrdersDataDto {
  const DriverOrdersDataDto({this.orders});

  factory DriverOrdersDataDto.fromJson(Map<String, dynamic> json) =>
      _$DriverOrdersDataDtoFromJson(json);

  /// `null` khi payload không có `orders` — repository coi là payload hỏng.
  final List<OrderDto>? orders;
}

/// Một phần tử của `data.orders`.
@JsonSerializable(createToJson: false)
class OrderDto {
  const OrderDto({
    this.id,
    this.total,
    this.status,
    this.createdAt,
    this.deliveredAt,
    this.customer,
    this.orderItems,
  });

  factory OrderDto.fromJson(Map<String, dynamic> json) =>
      _$OrderDtoFromJson(json);

  final String? id;

  /// JSON number (Prisma decimal) — `num` nhận cả int lẫn double.
  final num? total;

  /// Giá trị server gửi: `SHIPPING | DELIVERED` (lạ → shipping, xem mapper).
  final String? status;
  final String? createdAt;
  final String? deliveredAt;
  final CustomerDto? customer;
  final List<OrderItemDto>? orderItems;
}

/// Object `customer` của một order — mapper đọc name/address/phone.
@JsonSerializable(createToJson: false)
class CustomerDto {
  const CustomerDto({this.name, this.address, this.phone});

  factory CustomerDto.fromJson(Map<String, dynamic> json) =>
      _$CustomerDtoFromJson(json);

  final String? name;
  final String? address;
  final String? phone;
}

/// Một phần tử của `orderItems`.
@JsonSerializable(createToJson: false)
class OrderItemDto {
  const OrderItemDto({this.product, this.quantity, this.unitPrice, this.lineTotal});

  factory OrderItemDto.fromJson(Map<String, dynamic> json) =>
      _$OrderItemDtoFromJson(json);

  final ProductDto? product;
  final num? quantity;
  final num? unitPrice;
  final num? lineTotal;
}

/// Object `product` của một order item — chỉ đọc `name` (hiển thị cho
/// driver), bỏ qua id/sizeKg/unit.
@JsonSerializable(createToJson: false)
class ProductDto {
  const ProductDto({this.name});

  factory ProductDto.fromJson(Map<String, dynamic> json) =>
      _$ProductDtoFromJson(json);

  final String? name;
}
