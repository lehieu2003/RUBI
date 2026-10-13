import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/order_entry_repository_impl.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';

/// Một response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recordedFile(String kind, String name) =>
    jsonDecode(
      File('../api/openapi/fixtures/responses/$kind/$name.json').readAsStringSync(),
    ) as Map<String, dynamic>;

Map<String, dynamic> recorded(String operation) =>
    recordedFile('success', operation)['body'] as Map<String, dynamic>;

void main() {
  group('OrderEntryRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late OrderEntryRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = OrderEntryRepositoryImpl(dio: dio);
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

    group('getCustomers', () {
      test('response thật của server → đọc được hết, đúng từng field', () async {
        final body = recorded('listCustomers');
        adapter.onGet('/api/customers', (server) => server.reply(200, body));

        final customers =
            ((await repo.getCustomers()) as Ok<List<CustomerOption>>).value;

        final rows = body['data'] as List;
        expect(customers, hasLength(rows.length));
        final first = rows.first as Map<String, dynamic>;
        expect(
          customers.first,
          CustomerOption(
            id: first['id'] as String,
            code: first['code'] as String,
            name: first['name'] as String,
            address: first['address'] as String,
            phone: first['phone'] as String,
          ),
        );
      });

      test('khách thiếu mã → lỗi, không dựng khách không có mã', () async {
        adapter.onGet('/api/customers', (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {'id': 'c-1', 'name': 'Quán Cô Ba'},
            ],
          });
        });

        expect(
          ((await repo.getCustomers()) as Err<List<CustomerOption>>).failure,
          isA<UnexpectedFailure>(),
        );
      });

      test('mất mạng → NetworkFailure', () async {
        adapter.onGet('/api/customers', (server) {
          server.throws(
            0,
            DioException.connectionError(
              requestOptions: RequestOptions(path: '/api/customers'),
              reason: 'no route',
            ),
          );
        });

        expect(
          ((await repo.getCustomers()) as Err<List<CustomerOption>>).failure,
          isA<NetworkFailure>(),
        );
      });
    });

    group('getPriceList', () {
      test('response thật của server → giá và số còn bán được của từng sản phẩm',
          () async {
        final body = recorded('listCustomerPrices');
        adapter.onGet('/api/customers/c-1/prices', (server) => server.reply(200, body));

        final products =
            ((await repo.getPriceList('c-1')) as Ok<List<PricedProduct>>).value;

        final rows = body['data'] as List;
        expect(products, hasLength(rows.length));
        final first = rows.first as Map<String, dynamic>;
        expect(
          products.first,
          PricedProduct(
            productId: first['productId'] as String,
            name: first['name'] as String,
            sizeKg: first['sizeKg'] as int,
            unit: first['unit'] as String,
            price: (first['price'] as num).toDouble(),
            sellable: first['sellable'] as int,
          ),
        );
        expect(products.first.canOrder, isTrue);
      });

      test('chưa có giá / chưa có số tồn → null, không phải 0', () async {
        adapter.onGet('/api/customers/c-1/prices', (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'productId': 'p-1',
                'name': 'Đá Bi',
                'sizeKg': 5,
                'unit': 'Bao',
                'price': null,
                'sellable': null,
              },
            ],
          });
        });

        final product =
            ((await repo.getPriceList('c-1')) as Ok<List<PricedProduct>>).value.single;

        expect(product.price, isNull);
        expect(product.sellable, isNull);
        expect(product.canOrder, isFalse);
      });

      test('khách không tồn tại → response thật 404, giữ câu của server', () async {
        final fixture = recordedFile('error', 'listCustomerPrices.404');
        adapter.onGet(
          '/api/customers/khong-ton-tai/prices',
          (server) => server.reply(404, fixture['body']),
        );

        expect(
          ((await repo.getPriceList('khong-ton-tai')) as Err<List<PricedProduct>>).failure,
          ServerFailure(
            (fixture['body'] as Map<String, dynamic>)['error'] as String,
            statusCode: 404,
          ),
        );
      });
    });

    group('createOrder', () {
      test('response thật → đơn vừa lên; chỉ gửi dòng lớn hơn 0, không gửi giá',
          () async {
        final body = recorded('createOrder');
        adapter.onPost('/api/orders', (server) => server.reply(201, body),
            data: Matchers.any);

        final created = ((await repo.createOrder(
          customerId: 'c-1',
          quantities: {'p-1': 3, 'p-2': 0},
          notes: '  Giao cổng sau ',
        )) as Ok<CreatedOrder>)
            .value;

        final data = body['data'] as Map<String, dynamic>;
        expect(created.id, data['id']);
        expect(created.total, (data['total'] as num).toDouble());
        expect(created.customerName, data['customerName']);
        expect(created.code, startsWith('DH-'));
        expect(sentBody(), {
          'customerId': 'c-1',
          'items': [
            {'productId': 'p-1', 'quantity': 3},
          ],
          'notes': 'Giao cổng sau',
        });
      });

      test('không có ghi chú → không gửi trường notes', () async {
        adapter.onPost('/api/orders', (server) => server.reply(201, recorded('createOrder')),
            data: Matchers.any);

        await repo.createOrder(customerId: 'c-1', quantities: {'p-1': 1}, notes: '   ');

        expect((sentBody() as Map).containsKey('notes'), isFalse);
      });

      test('không dòng nào lớn hơn 0 → lỗi ngay, không gọi server', () async {
        final res = await repo.createOrder(
          customerId: 'c-1',
          quantities: {'p-1': 0},
        );

        expect(
          (res as Err<CreatedOrder>).failure,
          const ValidationFailure(AppStrings.orderEntryNoLines),
        );
        expect(requests, isEmpty);
      });

      test('sản phẩm ngừng bán / chưa có giá (400) → giữ câu của server', () async {
        adapter.onPost('/api/orders', (server) {
          server.reply(400, {
            'success': false,
            'error': 'Có sản phẩm chưa có giá bán. Báo Quản lý cài giá trước khi lên đơn.',
          });
        }, data: Matchers.any);

        final res = await repo.createOrder(customerId: 'c-1', quantities: {'p-1': 1});

        expect(
          (res as Err<CreatedOrder>).failure,
          const ServerFailure(
            'Có sản phẩm chưa có giá bán. Báo Quản lý cài giá trước khi lên đơn.',
            statusCode: 400,
          ),
        );
      });

      test('response thiếu id → lỗi, không báo "đã lên đơn" mù', () async {
        adapter.onPost('/api/orders', (server) {
          server.reply(201, {
            'success': true,
            'data': {'total': 36000, 'customerName': 'Quán Cô Ba'},
          });
        }, data: Matchers.any);

        final res = await repo.createOrder(customerId: 'c-1', quantities: {'p-1': 1});

        expect((res as Err<CreatedOrder>).failure, isA<UnexpectedFailure>());
      });
    });
  });
}
