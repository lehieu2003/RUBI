import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/network/idempotency.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/inventory/data/dto/inventory_dtos.dart';
import 'package:iceflow_mobile/features/inventory/data/mappers/stock_mapper.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [InventoryRepository] trên Dio.
@LazySingleton(as: InventoryRepository)
class InventoryRepositoryImpl implements InventoryRepository {
  InventoryRepositoryImpl({required this._dio});

  static const _path = '/api/inventory';
  static const _tag = 'inventory';

  final Dio _dio;

  @override
  Future<Result<Stock>> getStock() {
    return guardApi('getStock', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(_path);
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Inventory response missing `data`'));
      }
      return StockMapper.fromDto(StockDto.fromJson(data));
    });
  }

  @override
  Future<Result<int>> recordProduction({
    required String productId,
    required int quantity,
    String? idempotencyKey,
  }) {
    return guardApi('recordProduction', tag: _tag, run: () {
      return _record(
        {'productId': productId, 'quantity': quantity, 'mode': 'ADD'},
        idempotencyKey: idempotencyKey,
      );
    });
  }

  @override
  Future<Result<int>> recordCount({
    required String productId,
    required int counted,
    String? note,
  }) {
    return guardApi('recordCount', tag: _tag, run: () {
      final trimmed = note?.trim();
      return _record({
        'productId': productId,
        'quantity': counted,
        'mode': 'SET',
        if (trimmed != null && trimmed.isNotEmpty) 'note': trimmed,
      });
    });
  }

  /// `POST /api/inventory` → tồn trên sổ sau thao tác.
  Future<Result<int>> _record(
    Map<String, dynamic> body, {
    String? idempotencyKey,
  }) async {
    final res = await _dio.post<dynamic>(
      _path,
      data: body,
      options: idempotencyOptions(idempotencyKey),
    );
    final data = apiDataObject(res.data);
    final quantityOnHand =
        data == null ? null : InventoryRowDto.fromJson(data).quantityOnHand;
    if (quantityOnHand == null) {
      return const Err(
        UnexpectedFailure('Inventory response missing `data.quantityOnHand`'),
      );
    }
    return Ok(quantityOnHand);
  }
}
