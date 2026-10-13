import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/customers/data/dto/customer_dtos.dart';
import 'package:iceflow_mobile/features/customers/data/mappers/customer_mapper.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/domain/repositories/customers_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [CustomersRepository] trên Dio.
@LazySingleton(as: CustomersRepository)
class CustomersRepositoryImpl implements CustomersRepository {
  CustomersRepositoryImpl({required this._dio});

  static const _tag = 'customers';

  final Dio _dio;

  @override
  Future<Result<List<Customer>>> getCustomers() {
    return guardApi('getCustomers', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/customers');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Customers response missing `data`'));
      }
      final customers = <Customer>[];
      for (final row in rows) {
        switch (CustomerMapper.fromDto(CustomerDto.fromJson(row))) {
          case Ok<Customer>(:final value):
            customers.add(value);
          case Err<Customer>(:final failure):
            return Err(failure);
        }
      }
      return Ok(customers);
    });
  }

  @override
  Future<Result<List<CustomerPrice>>> getPrices(String customerId) {
    return guardApi('getPrices', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/customers/$customerId/prices');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(
          UnexpectedFailure('Customer prices response missing `data`'),
        );
      }
      final prices = <CustomerPrice>[];
      for (final row in rows) {
        switch (CustomerMapper.fromPriceDto(CustomerPriceDto.fromJson(row))) {
          case Ok<CustomerPrice>(:final value):
            prices.add(value);
          case Err<CustomerPrice>(:final failure):
            return Err(failure);
        }
      }
      return Ok(prices);
    });
  }

  @override
  Future<Result<void>> setCustomPrice({
    required String customerId,
    required String productId,
    required double price,
  }) {
    return guardApi('setCustomPrice', tag: _tag, run: () async {
      await _dio.post<dynamic>(
        '/api/prices/customer/override',
        data: {'customerId': customerId, 'productId': productId, 'price': price},
      );
      return const Ok(null);
    });
  }

  @override
  Future<Result<void>> removeCustomPrice({
    required String customerId,
    required String productId,
  }) {
    return guardApi('removeCustomPrice', tag: _tag, run: () async {
      await _dio.delete<dynamic>(
        '/api/prices/customer/override',
        queryParameters: {'customerId': customerId, 'productId': productId},
      );
      return const Ok(null);
    });
  }

  @override
  Future<Result<Customer>> createCustomer({
    required String code,
    required String name,
    String? address,
    String? phone,
  }) {
    return guardApi('createCustomer', tag: _tag, run: () async {
      final trimmedAddress = address?.trim() ?? '';
      final trimmedPhone = phone?.trim() ?? '';
      final res = await _dio.post<dynamic>(
        '/api/customers',
        data: {
          'code': code.trim(),
          'name': name.trim(),
          if (trimmedAddress.isNotEmpty) 'address': trimmedAddress,
          if (trimmedPhone.isNotEmpty) 'phone': trimmedPhone,
        },
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(
          UnexpectedFailure('Create customer response missing `data`'),
        );
      }
      return CustomerMapper.fromDto(CustomerDto.fromJson(data));
    });
  }
}
