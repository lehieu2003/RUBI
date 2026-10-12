import 'package:equatable/equatable.dart';

/// Tồn kho của một sản phẩm trong kho lạnh.
class StockItem extends Equatable {
  const StockItem({
    required this.productId,
    required this.productName,
    required this.sizeKg,
    required this.unit,
    required this.quantityOnHand,
    required this.totalKg,
    required this.sellable,
    required this.minStock,
    required this.lowStock,
  });

  final String productId;
  final String productName;
  final int sizeKg;

  /// Đơn vị bán ("Bao", "Cây"...).
  final String unit;

  /// Tồn trên sổ. Âm nghĩa là đã xuất nhiều hơn số từng nhập.
  final int quantityOnHand;
  final double totalKg;

  /// Còn bán được: tồn trên sổ trừ các đơn chưa đối soát.
  final int sellable;

  /// Mức cảnh báo; `null` khi sản phẩm không đặt cảnh báo.
  final int? minStock;

  /// Server đã tính: có mức cảnh báo và [sellable] không vượt mức đó.
  final bool lowStock;

  @override
  List<Object?> get props => [
        productId,
        productName,
        sizeKg,
        unit,
        quantityOnHand,
        totalKg,
        sellable,
        minStock,
        lowStock,
      ];
}

/// Toàn bộ kho lạnh: từng sản phẩm đang bán và tổng.
class Stock extends Equatable {
  const Stock({
    required this.items,
    required this.totalBags,
    required this.totalKg,
  });

  final List<StockItem> items;
  final int totalBags;
  final double totalKg;

  /// Các sản phẩm đang ở mức cảnh báo.
  List<StockItem> get lowStockItems =>
      items.where((item) => item.lowStock).toList();

  @override
  List<Object?> get props => [items, totalBags, totalKg];
}
