import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/inventory/data/dto/inventory_dtos.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';

/// Chuyển DTO của `/api/inventory` → domain. Thiếu field nào (trừ
/// `minStock`, vốn được phép null) là payload hỏng: không suy số tồn.
abstract final class StockMapper {
  static Result<Stock> fromDto(StockDto dto) {
    final rawItems = dto.items;
    if (rawItems == null) {
      return Err(MappingValidator.missing('Inventory', 'items'));
    }
    final totalBags = dto.totalBags;
    if (totalBags == null) {
      return Err(MappingValidator.missing('Inventory', 'totalBags'));
    }
    final totalKg = dto.totalKg;
    if (totalKg == null) {
      return Err(MappingValidator.missing('Inventory', 'totalKg'));
    }

    final items = <StockItem>[];
    for (final itemDto in rawItems) {
      switch (fromItemDto(itemDto)) {
        case Ok<StockItem>(:final value):
          items.add(value);
        case Err<StockItem>(:final failure):
          return Err(failure);
      }
    }
    return Ok(
      Stock(items: items, totalBags: totalBags, totalKg: totalKg.toDouble()),
    );
  }

  static Result<StockItem> fromItemDto(StockItemDto dto) {
    final productId = MappingValidator.nonEmpty(dto.productId);
    if (productId == null) {
      return Err(MappingValidator.missing('Inventory item', 'productId'));
    }
    final productName = MappingValidator.nonEmpty(dto.productName);
    if (productName == null) {
      return Err(MappingValidator.missing('Inventory item', 'productName'));
    }
    final sizeKg = dto.sizeKg;
    if (sizeKg == null) {
      return Err(MappingValidator.missing('Inventory item', 'sizeKg'));
    }
    final unit = MappingValidator.nonEmpty(dto.unit);
    if (unit == null) {
      return Err(MappingValidator.missing('Inventory item', 'unit'));
    }
    final quantityOnHand = dto.quantityOnHand;
    if (quantityOnHand == null) {
      return Err(MappingValidator.missing('Inventory item', 'quantityOnHand'));
    }
    final totalKg = dto.totalKg;
    if (totalKg == null) {
      return Err(MappingValidator.missing('Inventory item', 'totalKg'));
    }
    final sellable = dto.sellable;
    if (sellable == null) {
      return Err(MappingValidator.missing('Inventory item', 'sellable'));
    }
    final lowStock = dto.lowStock;
    if (lowStock == null) {
      return Err(MappingValidator.missing('Inventory item', 'lowStock'));
    }

    return Ok(
      StockItem(
        productId: productId,
        productName: productName,
        sizeKg: sizeKg,
        unit: unit,
        quantityOnHand: quantityOnHand,
        totalKg: totalKg.toDouble(),
        sellable: sellable,
        minStock: dto.minStock,
        lowStock: lowStock,
      ),
    );
  }
}
