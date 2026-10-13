import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/customers/data/customers_repository_impl.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';

/// Một response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recordedFile(String kind, String name) =>
    jsonDecode(
      File('../api/openapi/fixtures/responses/$kind/$name.json').readAsStringSync(),
    ) as Map<String, dynamic>;

Map<String, dynamic> recorded(String operation) =>
    recordedFile('success', operation)['body'] as Map<String, dynamic>;

void main() {
  group('CustomersRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late CustomersRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = CustomersRepositoryImpl(dio: dio);
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

    test('getCustomers: response thật của server → đúng từng field', () async {
      final body = recorded('listCustomers');
      adapter.onGet('/api/customers', (server) => server.reply(200, body));

      final customers = ((await repo.getCustomers()) as Ok<List<Customer>>).value;

      final rows = body['data'] as List;
      expect(customers, hasLength(rows.length));
      final first = rows.first as Map<String, dynamic>;
      expect(
        customers.first,
        Customer(
          id: first['id'] as String,
          code: first['code'] as String,
          name: first['name'] as String,
          address: first['address'] as String,
          phone: first['phone'] as String,
        ),
      );
    });

    test('getCustomers: khách thiếu tên → lỗi, không dựng khách vô danh', () async {
      adapter.onGet('/api/customers', (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'id': 'c-1', 'code': 'KH-001'},
          ],
        });
      });

      expect(
        ((await repo.getCustomers()) as Err<List<Customer>>).failure,
        isA<UnexpectedFailure>(),
      );
    });

    test('getPrices: response thật → giá của từng sản phẩm; chưa có giá là null',
        () async {
      final body = recorded('listCustomerPrices');
      adapter.onGet('/api/customers/c-1/prices', (server) => server.reply(200, body));

      final prices = ((await repo.getPrices('c-1')) as Ok<List<CustomerPrice>>).value;

      final first = (body['data'] as List).first as Map<String, dynamic>;
      expect(
        prices.first,
        CustomerPrice(
          productId: first['productId'] as String,
          name: first['name'] as String,
          sizeKg: first['sizeKg'] as int,
          unit: first['unit'] as String,
          price: (first['price'] as num).toDouble(),
        ),
      );

      adapter.onGet('/api/customers/c-2/prices', (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'productId': 'p-1', 'name': 'Đá Bi', 'sizeKg': 5, 'unit': 'Bao', 'price': null, 'sellable': null},
          ],
        });
      });
      expect(
        ((await repo.getPrices('c-2')) as Ok<List<CustomerPrice>>).value.single.price,
        isNull,
      );
    });

    test('getPrices: khách không tồn tại → response thật 404', () async {
      final fixture = recordedFile('error', 'listCustomerPrices.404');
      adapter.onGet('/api/customers/x/prices', (server) => server.reply(404, fixture['body']));

      expect(
        ((await repo.getPrices('x')) as Err<List<CustomerPrice>>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 404,
        ),
      );
    });

    test('createCustomer: response thật → khách mới; gửi đã trim, bỏ ô trống',
        () async {
      final body = recorded('createCustomer');
      adapter.onPost('/api/customers', (server) => server.reply(200, body),
          data: Matchers.any);

      final created = ((await repo.createCustomer(
        code: ' KH-009 ',
        name: ' Quán Cô Ba ',
        address: '  ',
        phone: ' 0903123456 ',
      )) as Ok<Customer>)
          .value;

      final data = body['data'] as Map<String, dynamic>;
      expect(created.id, data['id']);
      expect(created.code, data['code']);
      expect(created.name, data['name']);
      expect(sentBody(), {
        'code': 'KH-009',
        'name': 'Quán Cô Ba',
        'phone': '0903123456',
      });
    });

    test('createCustomer: mã đã có → response thật 409, giữ câu của server',
        () async {
      final fixture = recordedFile('error', 'createCustomer.409');
      adapter.onPost('/api/customers', (server) => server.reply(409, fixture['body']),
          data: Matchers.any);

      final res = await repo.createCustomer(code: 'KH-001', name: 'Trùng mã');

      expect(
        (res as Err<Customer>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 409,
        ),
      );
    });
  });
}
