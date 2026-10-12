// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inventory_dtos.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StockDto _$StockDtoFromJson(Map<String, dynamic> json) => StockDto(
  items: (json['items'] as List<dynamic>?)
      ?.map((e) => StockItemDto.fromJson(e as Map<String, dynamic>))
      .toList(),
  totalBags: (json['totalBags'] as num?)?.toInt(),
  totalKg: json['totalKg'] as num?,
);

StockItemDto _$StockItemDtoFromJson(Map<String, dynamic> json) => StockItemDto(
  productId: json['productId'] as String?,
  productName: json['productName'] as String?,
  sizeKg: (json['sizeKg'] as num?)?.toInt(),
  unit: json['unit'] as String?,
  quantityOnHand: (json['quantityOnHand'] as num?)?.toInt(),
  totalKg: json['totalKg'] as num?,
  sellable: (json['sellable'] as num?)?.toInt(),
  minStock: (json['minStock'] as num?)?.toInt(),
  lowStock: json['lowStock'] as bool?,
);

InventoryRowDto _$InventoryRowDtoFromJson(Map<String, dynamic> json) =>
    InventoryRowDto(quantityOnHand: (json['quantityOnHand'] as num?)?.toInt());
