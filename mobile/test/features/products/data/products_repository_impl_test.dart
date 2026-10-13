import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/products/data/products_repository_impl.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';

/// Một response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recordedFile(String kind, String name) =>
    jsonDecode(
      File('../api/openapi/fixtures/responses/$kind/$name.json').readAsStringSync(),
    ) as Map<String, dynamic>;

Map<String, dynamic> recorded(String operation) =>
    recordedFile('success', operation)['body'] as Map<String, dynamic>;

void main() {
  group('ProductsRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late ProductsRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = ProductsRepositoryImpl(dio: dio);
      requests = [];
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.next(options);
      }));
    });

    tearDown(() => dio.close());

    dynamic sentBody() {
      final raw = requests.last.data;
      return raw is String ? jsonDecode(raw) : raw;
    }

    test('getProducts: response thật của server → đúng từng field', () async {
      final body = recorded('listGlobalPrices');
      adapter.onGet('/api/prices/global', (server) => server.reply(200, body));

      final products = ((await repo.getProducts()) as Ok<List<Product>>).value;

      final rows = body['data'] as List;
      expect(products, hasLength(rows.length));
      final first = rows.first as Map<String, dynamic>;
      expect(
        products.first,
        Product(
          id: first['id'] as String,
          name: first['name'] as String,
          sizeKg: first['sizeKg'] as int,
          unit: first['unit'] as String,
          isActive: first['isActive'] as bool,
          price: (first['price'] as num?)?.toDouble(),
          minStock: first['minStock'] as int?,
        ),
      );
      expect(products.first.label, '${first['name']} ${first['sizeKg']}kg');
    });

    test('getProducts: chưa có giá → null; thiếu trạng thái bán → lỗi', () async {
      adapter.onGet('/api/prices/global', (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'id': 'p-1', 'name': 'Đá Tuyết', 'sizeKg': 20, 'unit': 'Bao', 'minStock': 30, 'isActive': false, 'price': null},
          ],
        });
      });
      final product = ((await repo.getProducts()) as Ok<List<Product>>).value.single;
      expect(product.price, isNull);
      expect(product.isActive, isFalse);
      expect(product.minStock, 30);

      adapter.onGet('/api/prices/global', (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'id': 'p-1', 'name': 'Đá Tuyết', 'sizeKg': 20, 'unit': 'Bao'},
          ],
        });
      });
      expect(
        ((await repo.getProducts()) as Err<List<Product>>).failure,
        isA<UnexpectedFailure>(),
      );
    });

    test('createProduct: response thật → sản phẩm mới với giá vừa gửi', () async {
      final body = recorded('createProduct');
      adapter.onPost('/api/products', (server) => server.reply(201, body), data: Matchers.any);

      final created = ((await repo.createProduct(
        name: ' Đá Thử ',
        sizeKg: 7,
        price: 9000,
        unit: ' ',
      )) as Ok<Product>)
          .value;

      final data = body['data'] as Map<String, dynamic>;
      expect(created.id, data['id']);
      expect(created.unit, data['unit']);
      expect(created.price, 9000);
      expect(sentBody(), {'name': 'Đá Thử', 'sizeKg': 7, 'price': 9000.0});
    });

    test('createProduct: trùng tên và kích cỡ → response thật 409', () async {
      final fixture = recordedFile('error', 'createProduct.409');
      adapter.onPost('/api/products', (server) => server.reply(409, fixture['body']),
          data: Matchers.any);

      final res = await repo.createProduct(name: 'Đá Thử', sizeKg: 7, price: 9000);

      expect(
        (res as Err<Product>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 409,
        ),
      );
    });

    test('updateProduct: response thật → sản phẩm sau khi sửa, giữ giá đang biết',
        () async {
      final body = recorded('updateProduct');
      adapter.onPatch('/api/products/p-1', (server) => server.reply(200, body),
          data: Matchers.any);

      final updated = ((await repo.updateProduct(
        'p-1',
        unit: ' Túi ',
        isActive: false,
        currentPrice: 9000,
      )) as Ok<Product>)
          .value;

      final data = body['data'] as Map<String, dynamic>;
      expect(updated.unit, data['unit']);
      expect(updated.isActive, data['isActive']);
      expect(updated.price, 9000);
      expect(sentBody(), {'unit': 'Túi', 'isActive': false});
    });

    test('updateProduct: đặt mức cảnh báo, và tắt cảnh báo bằng null', () async {
      adapter.onPatch('/api/products/p-1', (server) => server.reply(200, recorded('updateProduct')),
          data: Matchers.any);

      await repo.updateProduct('p-1', minStock: 25);
      expect(sentBody(), {'minStock': 25});

      await repo.updateProduct('p-1', minStock: 25, clearMinStock: true);
      expect(sentBody(), {'minStock': null});
    });

    test('setPrice: response thật → Ok; gửi đúng sản phẩm và giá', () async {
      adapter.onPost('/api/prices/global',
          (server) => server.reply(200, recorded('setGlobalPrice')),
          data: Matchers.any);

      final res = await repo.setPrice('p-1', 12500);

      expect(res, isA<Ok<void>>());
      expect(sentBody(), {'productId': 'p-1', 'price': 12500.0});
    });
  });
}
