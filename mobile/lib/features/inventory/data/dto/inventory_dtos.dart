// DTOs cho các response của `/api/inventory` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`inventory_dtos.g.dart`; sửa file này
// xong chạy `dart run build_runner build`). Mọi field nullable, không
// validate — mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'inventory_dtos.g.dart';

/// `data` của `GET /api/inventory`.
@JsonSerializable(createToJson: false)
class StockDto {
  const StockDto({this.items, this.totalBags, this.totalKg});

  factory StockDto.fromJson(Map<String, dynamic> json) =>
      _$StockDtoFromJson(json);

  final List<StockItemDto>? items;
  final int? totalBags;
  final num? totalKg;
}

/// Một phần tử của `data.items`.
@JsonSerializable(createToJson: false)
class StockItemDto {
  const StockItemDto({
    this.productId,
    this.productName,
    this.sizeKg,
    this.unit,
    this.quantityOnHand,
    this.totalKg,
    this.sellable,
    this.minStock,
    this.lowStock,
  });

  factory StockItemDto.fromJson(Map<String, dynamic> json) =>
      _$StockItemDtoFromJson(json);

  final String? productId;
  final String? productName;
  final int? sizeKg;
  final String? unit;
  final int? quantityOnHand;
  final num? totalKg;
  final int? sellable;

  /// `null` hợp lệ: sản phẩm không đặt mức cảnh báo.
  final int? minStock;
  final bool? lowStock;
}

/// `data` của `POST /api/inventory`: số dư cuối ngày hôm nay của sản phẩm.
@JsonSerializable(createToJson: false)
class InventoryRowDto {
  const InventoryRowDto({this.quantityOnHand});

  factory InventoryRowDto.fromJson(Map<String, dynamic> json) =>
      _$InventoryRowDtoFromJson(json);

  final int? quantityOnHand;
}
