import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/dto/order_entry_dtos.dart';
import 'package:iceflow_mobile/features/orders/data/mappers/order_entry_mapper.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/order_entry_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [OrderEntryRepository] trên Dio.
@LazySingleton(as: OrderEntryRepository)
class OrderEntryRepositoryImpl implements OrderEntryRepository {
  OrderEntryRepositoryImpl({required this._dio});

  static const _tag = 'order-entry';

  final Dio _dio;

  @override
  Future<Result<List<CustomerOption>>> getCustomers() {
    return guardApi('getCustomers', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/customers');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Customers response missing `data`'));
      }
      final customers = <CustomerOption>[];
      for (final row in rows) {
        switch (OrderEntryMapper.fromCustomerDto(CustomerOptionDto.fromJson(row))) {
          case Ok<CustomerOption>(:final value):
            customers.add(value);
          case Err<CustomerOption>(:final failure):
            return Err(failure);
        }
      }
      return Ok(customers);
    });
  }

  @override
  Future<Result<List<PricedProduct>>> getPriceList(String customerId) {
    return guardApi('getPriceList', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/customers/$customerId/prices');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Price list response missing `data`'));
      }
      final products = <PricedProduct>[];
      for (final row in rows) {
        switch (OrderEntryMapper.fromPricedProductDto(PricedProductDto.fromJson(row))) {
          case Ok<PricedProduct>(:final value):
            products.add(value);
          case Err<PricedProduct>(:final failure):
            return Err(failure);
        }
      }
      return Ok(products);
    });
  }

  @override
  Future<Result<CreatedOrder>> createOrder({
    required String customerId,
    required Map<String, int> quantities,
    String? notes,
  }) {
    final items = [
      for (final entry in quantities.entries)
        if (entry.value > 0) {'productId': entry.key, 'quantity': entry.value},
    ];
    if (items.isEmpty) {
      return Future.value(
        const Err(ValidationFailure(AppStrings.orderEntryNoLines)),
      );
    }
    return guardApi('createOrder', tag: _tag, run: () async {
      final trimmed = notes?.trim();
      final res = await _dio.post<dynamic>(
        '/api/orders',
        data: {
          'customerId': customerId,
          'items': items,
          if (trimmed != null && trimmed.isNotEmpty) 'notes': trimmed,
        },
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Create order response missing `data`'));
      }
      return OrderEntryMapper.fromCreatedDto(CreatedOrderDto.fromJson(data));
    });
  }
}
