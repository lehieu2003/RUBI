import 'package:equatable/equatable.dart';

/// Một sản phẩm của nhà máy với giá mặc định, như Quản lý thấy.
class Product extends Equatable {
  const Product({
    required this.id,
    required this.name,
    required this.sizeKg,
    required this.unit,
    required this.isActive,
    this.price,
    this.minStock,
  });

  final String id;
  final String name;
  final int sizeKg;

  /// Đơn vị bán: Bao, Cây, Túi...
  final String unit;

  /// `false`: đã ngừng bán — không còn trên form lên đơn, đơn cũ vẫn giữ.
  final bool isActive;

  /// Giá mặc định; `null` khi chưa có giá (không lên đơn được).
  final double? price;

  /// Mức cảnh báo tồn kho thấp; `null` là tắt cảnh báo.
  final int? minStock;

  /// Tên kèm kích cỡ như mọi màn hình hiển thị: "Đá Bi 5kg".
  String get label => '$name ${sizeKg}kg';

  Product copyWith({double? price}) => Product(
        id: id,
        name: name,
        sizeKg: sizeKg,
        unit: unit,
        isActive: isActive,
        price: price ?? this.price,
        minStock: minStock,
      );

  @override
  List<Object?> get props => [id, name, sizeKg, unit, isActive, price, minStock];
}
