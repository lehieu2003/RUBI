// DTOs cho response `GET /api/driver/orders` (envelope `{ success, data|error }`).
//
// Parse dạng nullable, không validate: field SAI KIỂU ném TypeError ngay tại
// đây (cố tình để rẻ), và repository biến mọi exception — kể cả TypeError —
// thành `Err(UnexpectedFailure)` nên callers chỉ bao giờ thấy `Result`,
// không có exception nào xuyên lớp. Field lạ (driverName, note...) bị bỏ qua.

/// `data` của `GET /api/driver/orders` — mapper chỉ đọc `orders`, bỏ qua
/// `driver` (không cần cho luồng giao hàng).
class DriverOrdersDataDto {
  const DriverOrdersDataDto({this.orders});

  factory DriverOrdersDataDto.fromJson(Map<String, dynamic> json) {
    final rawOrders = json['orders'];
    return DriverOrdersDataDto(
      orders: rawOrders is List
          ? rawOrders
              .map((e) => OrderDto.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  /// `null` khi payload không có `orders` list — repository coi là payload hỏng.
  final List<OrderDto>? orders;
}

/// Một phần tử của `data.orders`.
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

  factory OrderDto.fromJson(Map<String, dynamic> json) {
    final customerJson = json['customer'];
    final rawItems = json['orderItems'];
    return OrderDto(
      id: json['id'] as String?,
      total: json['total'] as num?,
      status: json['status'] as String?,
      createdAt: json['createdAt'] as String?,
      deliveredAt: json['deliveredAt'] as String?,
      customer: customerJson is Map<String, dynamic>
          ? CustomerDto.fromJson(customerJson)
          : null,
      orderItems: rawItems is List
          ? rawItems
              .map((e) => OrderItemDto.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

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
class CustomerDto {
  const CustomerDto({this.name, this.address, this.phone});

  factory CustomerDto.fromJson(Map<String, dynamic> json) => CustomerDto(
        name: json['name'] as String?,
        address: json['address'] as String?,
        phone: json['phone'] as String?,
      );

  final String? name;
  final String? address;
  final String? phone;
}

/// Một phần tử của `orderItems` — chỉ đọc `product.name` (hiển thị cho
/// driver), bỏ qua id/sizeKg/unit.
class OrderItemDto {
  const OrderItemDto({this.productName, this.quantity, this.unitPrice, this.lineTotal});

  factory OrderItemDto.fromJson(Map<String, dynamic> json) {
    final productJson = json['product'];
    return OrderItemDto(
      productName: productJson is Map<String, dynamic>
          ? productJson['name'] as String?
          : null,
      quantity: json['quantity'] as num?,
      unitPrice: json['unitPrice'] as num?,
      lineTotal: json['lineTotal'] as num?,
    );
  }

  final String? productName;
  final num? quantity;
  final num? unitPrice;
  final num? lineTotal;
}
