import 'package:equatable/equatable.dart';

/// Trạng thái giao hàng của một đơn — khớp giá trị server gửi
/// (`SHIPPING` | `DELIVERED`).
enum OrderStatus {
  shipping,
  delivered;

  /// Maps the server status string (case-sensitive uppercase) to [OrderStatus].
  ///
  /// Giá trị lạ/thiếu → [shipping] — safe-default CÓ CHỦ Ý (khác [UserRole]
  /// trả null): đơn lạ vẫn hiển thị và thao tác được như đơn đang giao thay
  /// vì cả danh sách rơi vào lỗi. API contract chỉ trả hai giá trị trên.
  static OrderStatus fromName(String? name) {
    return switch (name) {
      'DELIVERED' => delivered,
      _ => shipping,
    };
  }
}

/// Một dòng hàng trong đơn giao — hiển thị `productName` + `quantity` +
/// `lineTotal` (tiền format ở presentation).
class OrderItem extends Equatable {
  const OrderItem({
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  final String productName;
  final double quantity;
  final double unitPrice;
  final double lineTotal;

  @override
  List<Object?> get props => [productName, quantity, unitPrice, lineTotal];
}

/// Đơn hàng cần giao / đã giao trong ngày của driver.
class DeliveryOrder extends Equatable {
  const DeliveryOrder({
    required this.id,
    required this.status,
    required this.total,
    required this.customerName,
    required this.customerAddress,
    required this.customerPhone,
    required this.items,
    required this.createdAt,
    this.deliveredAt,
    this.notes,
  });

  final String id;
  final OrderStatus status;
  final double total;
  final String customerName;
  final String customerAddress;
  final String customerPhone;
  final List<OrderItem> items;
  final DateTime createdAt;
  final DateTime? deliveredAt;

  /// Dặn dò khi giao ("giao cổng sau, gọi trước 10 phút"); `null` khi không có.
  final String? notes;

  @override
  List<Object?> get props => [
        id,
        status,
        total,
        customerName,
        customerAddress,
        customerPhone,
        items,
        createdAt,
        deliveredAt,
        notes,
      ];
}
