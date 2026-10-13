import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/products/data/dto/product_dtos.dart';
import 'package:iceflow_mobile/features/products/data/mappers/product_mapper.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';
import 'package:iceflow_mobile/features/products/domain/repositories/products_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [ProductsRepository] trên Dio.
@LazySingleton(as: ProductsRepository)
class ProductsRepositoryImpl implements ProductsRepository {
  ProductsRepositoryImpl({required this._dio});

  static const _tag = 'products';

  final Dio _dio;

  @override
  Future<Result<List<Product>>> getProducts() {
    return guardApi('getProducts', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/prices/global');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Prices response missing `data`'));
      }
      final products = <Product>[];
      for (final row in rows) {
        switch (ProductMapper.fromDto(ProductDto.fromJson(row))) {
          case Ok<Product>(:final value):
            products.add(value);
          case Err<Product>(:final failure):
            return Err(failure);
        }
      }
      return Ok(products);
    });
  }

  @override
  Future<Result<Product>> createProduct({
    required String name,
    required int sizeKg,
    required double price,
    String? unit,
    int? minStock,
  }) {
    return guardApi('createProduct', tag: _tag, run: () async {
      final trimmedUnit = unit?.trim() ?? '';
      final res = await _dio.post<dynamic>(
        '/api/products',
        data: {
          'name': name.trim(),
          'sizeKg': sizeKg,
          'price': price,
          if (trimmedUnit.isNotEmpty) 'unit': trimmedUnit,
          'minStock': ?minStock,
        },
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(
          UnexpectedFailure('Create product response missing `data`'),
        );
      }
      // Response không kèm giá: giá vừa gửi là giá server đã lưu.
      return ProductMapper.fromDto(ProductDto.fromJson(data), price: price);
    });
  }

  @override
  Future<Result<Product>> updateProduct(
    String id, {
    String? name,
    String? unit,
    int? minStock,
    bool clearMinStock = false,
    bool? isActive,
    double? currentPrice,
  }) {
    return guardApi('updateProduct', tag: _tag, run: () async {
      final res = await _dio.patch<dynamic>(
        '/api/products/$id',
        data: {
          if (name != null) 'name': name.trim(),
          if (unit != null) 'unit': unit.trim(),
          // null gửi đi là tắt cảnh báo; không gửi là giữ nguyên.
          if (clearMinStock) 'minStock': null else 'minStock': ?minStock,
          'isActive': ?isActive,
        },
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(
          UnexpectedFailure('Update product response missing `data`'),
        );
      }
      return ProductMapper.fromDto(ProductDto.fromJson(data), price: currentPrice);
    });
  }

  @override
  Future<Result<void>> setPrice(String productId, double price) {
    return guardApi('setPrice', tag: _tag, run: () async {
      await _dio.post<dynamic>(
        '/api/prices/global',
        data: {'productId': productId, 'price': price},
      );
      return const Ok(null);
    });
  }
}
