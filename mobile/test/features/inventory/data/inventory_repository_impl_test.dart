import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/inventory/data/inventory_repository_impl.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';

void main() {
  group('InventoryRepositoryImpl', () {
    const path = '/api/inventory';

    late Dio dio;
    late DioAdapter adapter;
    late InventoryRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = InventoryRepositoryImpl(dio: dio);
    });

    tearDown(() => dio.close());

    dynamic decodedBody(Object? raw) => raw is String ? jsonDecode(raw) : raw;

    // Khớp api/openapi/fixtures/responses/success/getInventory.json, thêm một
    // sản phẩm đang ở mức cảnh báo.
    const stockFixture = <String, dynamic>{
      'items': [
        {
          'productId': 'prod-bi-5',
          'productName': 'Đá Bi',
          'sizeKg': 5,
          'unit': 'Bao',
          'quantityOnHand': 200,
          'totalKg': 1000,
          'sellable': 200,
          'minStock': null,
          'lowStock': false,
        },
        {
          'productId': 'prod-vien-5',
          'productName': 'Đá Viên',
          'sizeKg': 5,
          'unit': 'Bao',
          'quantityOnHand': 30,
          'totalKg': 150,
          'sellable': 18,
          'minStock': 20,
          'lowStock': true,
        },
      ],
      'totalBags': 230,
      'totalKg': 1150,
    };

    group('getStock', () {
      test('200 → Stock đủ field; sản phẩm sắp hết nằm trong lowStockItems',
          () async {
        adapter.onGet(path, (server) {
          server.reply(200, {'success': true, 'data': stockFixture});
        });

        final res = await repo.getStock();

        final stock = (res as Ok<Stock>).value;
        expect(stock.totalBags, 230);
        expect(stock.totalKg, 1150.0);
        expect(stock.items, const [
          StockItem(
            productId: 'prod-bi-5',
            productName: 'Đá Bi',
            sizeKg: 5,
            unit: 'Bao',
            quantityOnHand: 200,
            totalKg: 1000,
            sellable: 200,
            minStock: null,
            lowStock: false,
          ),
          StockItem(
            productId: 'prod-vien-5',
            productName: 'Đá Viên',
            sizeKg: 5,
            unit: 'Bao',
            quantityOnHand: 30,
            totalKg: 150,
            sellable: 18,
            minStock: 20,
            lowStock: true,
          ),
        ]);
        expect(stock.lowStockItems.map((item) => item.productId), ['prod-vien-5']);
      });

      test('tồn âm (xuất nhiều hơn nhập) vẫn đọc được', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'items': [
                {...(stockFixture['items'] as List).first as Map, 'quantityOnHand': -4, 'sellable': -9},
              ],
              'totalBags': -4,
              'totalKg': -20,
            },
          });
        });

        final stock = ((await repo.getStock()) as Ok<Stock>).value;
        expect(stock.items.single.quantityOnHand, -4);
        expect(stock.items.single.sellable, -9);
      });

      test('thiếu `sellable` ở một sản phẩm → Err(UnexpectedFailure), không '
          'suy số', () async {
        final broken = Map<String, dynamic>.from(
          (stockFixture['items'] as List).first as Map,
        )..remove('sellable');
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {'items': [broken], 'totalBags': 1, 'totalKg': 5},
          });
        });

        final failure = ((await repo.getStock()) as Err<Stock>).failure;
        expect(
          failure,
          const UnexpectedFailure('Inventory item payload missing `sellable`'),
        );
      });

      test('field sai kiểu → Err(UnexpectedFailure), không ném exception',
          () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {'items': 'không phải danh sách', 'totalBags': 1, 'totalKg': 5},
          });
        });

        expect(((await repo.getStock()) as Err<Stock>).failure, isA<UnexpectedFailure>());
      });

      test('403 (không phải Quản lý) → ServerFailure giữ câu của server',
          () async {
        adapter.onGet(path, (server) {
          server.reply(403, {
            'success': false,
            'error': 'Bạn không có quyền thực hiện thao tác này',
          });
        });

        expect(
          ((await repo.getStock()) as Err<Stock>).failure,
          const ServerFailure('Bạn không có quyền thực hiện thao tác này', statusCode: 403),
        );
      });

      test('mất mạng → NetworkFailure', () async {
        adapter.onGet(path, (server) {
          server.throws(
            0,
            DioException(
              requestOptions: RequestOptions(path: path),
              type: DioExceptionType.connectionError,
            ),
          );
        });

        expect(((await repo.getStock()) as Err<Stock>).failure, const NetworkFailure());
      });
    });

    group('recordProduction / recordCount', () {
      // Khớp api/openapi/fixtures/responses/success/recordInventory.json.
      const rowFixture = {
        'id': 'inv-1',
        'productId': 'prod-bi-5',
        'date': '2026-10-09T17:00:00.000Z',
        'quantityOnHand': 201,
      };

      test('nhập mẻ → gửi mode ADD, trả tồn mới', () async {
        Object? sent;
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          sent = decodedBody(options.data);
          handler.next(options);
        }));
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': rowFixture});
        }, data: Matchers.any);

        final res = await repo.recordProduction(productId: 'prod-bi-5', quantity: 1);

        expect(res, const Ok<int>(201));
        expect(sent, {'productId': 'prod-bi-5', 'quantity': 1, 'mode': 'ADD'});
      });

      test('nhập mẻ: có mã → header Idempotency-Key; không mã → không có header',
          () async {
        final headers = <Map<String, dynamic>>[];
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          headers.add(options.headers);
          handler.next(options);
        }));
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': rowFixture});
        }, data: Matchers.any);

        await repo.recordProduction(productId: 'prod-bi-5', quantity: 1, idempotencyKey: 'key-1');
        await repo.recordProduction(productId: 'prod-bi-5', quantity: 1);

        expect(headers[0]['Idempotency-Key'], 'key-1');
        expect(headers[1].containsKey('Idempotency-Key'), isFalse);
      });

      test('kiểm kho → gửi mode SET kèm ghi chú đã trim; ghi chú rỗng thì bỏ',
          () async {
        final sent = <Object?>[];
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          sent.add(decodedBody(options.data));
          handler.next(options);
        }));
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': {...rowFixture, 'quantityOnHand': 188}});
        }, data: Matchers.any);

        final res = await repo.recordCount(
          productId: 'prod-bi-5',
          counted: 188,
          note: '  Kiểm kho cuối tuần ',
        );
        await repo.recordCount(productId: 'prod-bi-5', counted: 188, note: '   ');

        expect(res, const Ok<int>(188));
        expect(sent, [
          {'productId': 'prod-bi-5', 'quantity': 188, 'mode': 'SET', 'note': 'Kiểm kho cuối tuần'},
          {'productId': 'prod-bi-5', 'quantity': 188, 'mode': 'SET'},
        ]);
      });

      test('server từ chối (400) → giữ câu của server', () async {
        adapter.onPost(path, (server) {
          server.reply(400, {'success': false, 'error': 'Số lượng không hợp lệ'});
        }, data: Matchers.any);

        expect(
          ((await repo.recordProduction(productId: 'p', quantity: 1)) as Err<int>).failure,
          const ServerFailure('Số lượng không hợp lệ', statusCode: 400),
        );
      });

      test('response thiếu quantityOnHand → Err(UnexpectedFailure)', () async {
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': {'id': 'inv-1'}});
        }, data: Matchers.any);

        expect(
          ((await repo.recordProduction(productId: 'p', quantity: 1)) as Err<int>).failure,
          isA<UnexpectedFailure>(),
        );
      });
    });
  });
}
