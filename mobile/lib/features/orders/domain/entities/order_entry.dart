import 'package:equatable/equatable.dart';

/// Một khách hàng để chọn khi lên đơn.
class CustomerOption extends Equatable {
  const CustomerOption({
    required this.id,
    required this.code,
    required this.name,
    this.address = '',
    this.phone = '',
  });

  final String id;
  final String code;
  final String name;
  final String address;
  final String phone;

  @override
  List<Object?> get props => [id, code, name, address, phone];
}

/// Một sản phẩm đang bán, với giá của khách đang lên đơn.
class PricedProduct extends Equatable {
  const PricedProduct({
    required this.productId,
    required this.name,
    required this.sizeKg,
    required this.unit,
    this.price,
    this.sellable,
  });

  final String productId;
  final String name;
  final int sizeKg;
  final String unit;

  /// Giá riêng của khách, không có thì giá chung. `null`: chưa có giá —
  /// không đặt được, phải báo Quản lý cài giá.
  final double? price;

  /// Số còn bán được: tồn sổ sách trừ các đơn chưa đối soát (có thể âm).
  /// `null`: sản phẩm chưa từng có số tồn, không biết gì để hiện.
  final int? sellable;

  bool get canOrder => price != null;

  @override
  List<Object?> get props => [productId, name, sizeKg, unit, price, sellable];
}

/// Đơn vừa lên xong, như server xác nhận.
class CreatedOrder extends Equatable {
  const CreatedOrder({
    required this.id,
    required this.total,
    required this.customerName,
  });

  final String id;

  /// Tổng tiền server tính từ bảng giá của khách.
  final double total;
  final String customerName;

  /// Mã đơn như mọi màn hình hiển thị: "DH-" + 6 ký tự cuối của id.
  String get code {
    final tail = id.length <= 6 ? id : id.substring(id.length - 6);
    return 'DH-${tail.toUpperCase()}';
  }

  @override
  List<Object?> get props => [id, total, customerName];
}
