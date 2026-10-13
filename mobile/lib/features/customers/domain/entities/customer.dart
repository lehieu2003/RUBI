import 'package:equatable/equatable.dart';

/// Một khách hàng của nhà máy.
class Customer extends Equatable {
  const Customer({
    required this.id,
    required this.code,
    required this.name,
    this.address = '',
    this.phone = '',
  });

  final String id;

  /// Mã khách do Quản lý đặt (KH-001); không trùng nhau.
  final String code;
  final String name;
  final String address;
  final String phone;

  @override
  List<Object?> get props => [id, code, name, address, phone];
}

/// Giá một sản phẩm đang bán, áp cho một khách.
class CustomerPrice extends Equatable {
  const CustomerPrice({
    required this.productId,
    required this.name,
    required this.sizeKg,
    required this.unit,
    this.price,
    this.basePrice,
    this.customPrice,
  });

  final String productId;
  final String name;
  final int sizeKg;
  final String unit;

  /// Giá tính cho đơn: giá riêng của khách, không có thì giá mặc định;
  /// `null` khi chưa có giá nào.
  final double? price;

  /// Giá mặc định của sản phẩm; `null` khi chưa có.
  final double? basePrice;

  /// Giá riêng Quản lý đặt cho khách này; `null` khi khách dùng giá mặc định.
  final double? customPrice;

  bool get hasCustomPrice => customPrice != null;

  @override
  List<Object?> get props =>
      [productId, name, sizeKg, unit, price, basePrice, customPrice];
}
