import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/data/driver_repository_impl.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';

void main() {
  group('DriverRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late DriverRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = DriverRepositoryImpl(dio: dio);
    });

    tearDown(() {
      dio.close();
    });

    /// The adapter may hand the request body back as a JSON string or a map.
    dynamic decodedBody(Object? raw) => raw is String ? jsonDecode(raw) : raw;

    // Fixture khớp contract backend `GET /api/driver/orders`.
    const ordersFixture = [
      {
        'id': 'order-1',
        'total': 250000,
        'status': 'SHIPPING',
        'createdAt': '2026-10-07T02:00:00.000Z',
        'deliveredAt': null,
        'driverName': 'Nguyễn Văn Tài',
        'customer': {
          'id': 'cust-1',
          'name': 'Quán Cô Ba',
          'address': '12 Nguyễn Trãi, Q.1',
          'phone': '0903123456',
        },
        'orderItems': [
          {
            'id': 'item-1',
            'quantity': 10,
            'unitPrice': 20000,
            'lineTotal': 200000,
            'product': {'id': 'prod-1', 'name': 'Đá viên 5kg', 'sizeKg': 5, 'unit': 'bao'},
          },
          {
            'id': 'item-2',
            'quantity': 2.5,
            'unitPrice': 20000,
            'lineTotal': 50000,
            'product': {'id': 'prod-2', 'name': 'Đá khô', 'sizeKg': null, 'unit': 'kg'},
          },
        ],
      },
      {
        'id': 'order-2',
        'total': 180000.5,
        'status': 'DELIVERED',
        'createdAt': '2026-10-07T01:00:00.000Z',
        'deliveredAt': '2026-10-07T04:30:00.000Z',
        'driverName': 'Nguyễn Văn Tài',
        'customer': {
          'id': 'cust-2',
          'name': 'Bar Minh',
          'address': '34 Lê Lợi, Q.1',
          'phone': '0912345678',
        },
        'orderItems': [
          {
            'id': 'item-3',
            'quantity': 6,
            'unitPrice': 25000,
            'lineTotal': 150000,
            'product': {'id': 'prod-1', 'name': 'Đá viên 5kg', 'sizeKg': 5, 'unit': 'bao'},
          },
          {
            'id': 'item-4',
            'quantity': 1,
            'unitPrice': 30000.5,
            'lineTotal': 30000.5,
            'product': {'id': 'prod-3', 'name': 'Đá tuyết', 'sizeKg': null, 'unit': 'túi'},
          },
        ],
      },
    ];

    List<DeliveryOrder> expectedOrders() => [
          DeliveryOrder(
            id: 'order-1',
            status: OrderStatus.shipping,
            total: 250000,
            customerName: 'Quán Cô Ba',
            customerAddress: '12 Nguyễn Trãi, Q.1',
            customerPhone: '0903123456',
            items: const [
              OrderItem(
                productName: 'Đá viên 5kg',
                quantity: 10,
                unitPrice: 20000,
                lineTotal: 200000,
              ),
              OrderItem(
                productName: 'Đá khô',
                quantity: 2.5,
                unitPrice: 20000,
                lineTotal: 50000,
              ),
            ],
            createdAt: DateTime.utc(2026, 10, 7, 2),
          ),
          DeliveryOrder(
            id: 'order-2',
            status: OrderStatus.delivered,
            total: 180000.5,
            customerName: 'Bar Minh',
            customerAddress: '34 Lê Lợi, Q.1',
            customerPhone: '0912345678',
            items: const [
              OrderItem(
                productName: 'Đá viên 5kg',
                quantity: 6,
                unitPrice: 25000,
                lineTotal: 150000,
              ),
              OrderItem(
                productName: 'Đá tuyết',
                quantity: 1,
                unitPrice: 30000.5,
                lineTotal: 30000.5,
              ),
            ],
            createdAt: DateTime.utc(2026, 10, 7, 1),
            deliveredAt: DateTime.utc(2026, 10, 7, 4, 30),
          ),
        ];

    group('getOrders', () {
      test('200 → Ok(list) đúng dữ liệu + query `date` đúng định dạng yyyy-MM-dd',
          () async {
        Object? capturedQuery;
        adapter.onGet('/api/driver/orders', (server) {
          server.replyCallback(200, (options) {
            capturedQuery = options.queryParameters;
            return {
              'success': true,
              'data': {
                'driver': {'id': 'u-driver-1', 'name': 'Nguyễn Văn Tài'},
                'orders': ordersFixture,
              },
            };
          });
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        expect(res.isOk, isTrue);
        final orders = (res as Ok<List<DeliveryOrder>>).value;
        expect(orders, expectedOrders());
        expect(capturedQuery, {'date': '2026-10-07'});
      });

      test('query `date` zero-padded (MM-dd)', () async {
        Object? capturedQuery;
        adapter.onGet('/api/driver/orders', (server) {
          server.replyCallback(200, (options) {
            capturedQuery = options.queryParameters;
            return {
              'success': true,
              'data': {'driver': {'id': 'd1'}, 'orders': []},
            };
          });
        });

        final res = await repo.getOrders(DateTime(2026, 1, 5));

        expect(res.isOk, isTrue);
        expect(capturedQuery, {'date': '2026-01-05'});
      });

      test('200 với orders rỗng → Ok([])', () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'driver': {'id': 'd1', 'name': 'Tài'},
              'orders': [],
            },
          });
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        expect(res, const Ok<List<DeliveryOrder>>([]));
      });

      test('401 → Err(AuthFailure)', () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.reply(401, {'success': false, 'error': 'Token expired'});
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        expect(res.isOk, isFalse);
        expect((res as Err<List<DeliveryOrder>>).failure, isA<AuthFailure>());
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.throws(
            0,
            DioException(
              requestOptions: RequestOptions(path: '/api/driver/orders'),
              type: DioExceptionType.connectionError,
              error: 'connection refused',
            ),
          );
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        expect((res as Err<List<DeliveryOrder>>).failure, isA<NetworkFailure>());
      });

      test('200 thiếu data.orders → Err(UnexpectedFailure)', () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'driver': {'id': 'd1', 'name': 'Tài'},
            },
          });
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        expect(res.isOk, isFalse);
        expect(
          (res as Err<List<DeliveryOrder>>).failure,
          isA<UnexpectedFailure>(),
        );
      });

      test('200 field sai kiểu (total là chuỗi) → Err(UnexpectedFailure), không ném',
          () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'driver': {'id': 'd1'},
              'orders': [
                {
                  ...ordersFixture.first,
                  'total': '250000',
                },
              ],
            },
          });
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        // TypeError từ cast `as num?` phải bị repo giữ lại trong Result.
        expect(
          (res as Err<List<DeliveryOrder>>).failure,
          isA<UnexpectedFailure>(),
        );
      });

      test('200 đơn có status lạ → Ok với status shipping (safe-default)', () async {
        adapter.onGet('/api/driver/orders', (server) {
          server.reply(200, {
            'success': true,
            'data': {
              'driver': {'id': 'd1'},
              'orders': [
                {...ordersFixture.first, 'status': 'PENDING'},
              ],
            },
          });
        });

        final res = await repo.getOrders(DateTime(2026, 10, 7));

        final orders = (res as Ok<List<DeliveryOrder>>).value;
        expect(orders.single.status, OrderStatus.shipping);
      });
    });

    group('confirmDelivery', () {
      test('PATCH body rỗng {} → Ok(null)', () async {
        Object? capturedBody;
        // data: bắt buộc khi route có body — matcher so sánh cả request body.
        adapter.onPatch(
          '/api/orders/order-1/confirm',
          (server) {
            server.replyCallback(200, (options) {
              capturedBody = decodedBody(options.data);
              return {
                'success': true,
                'data': {
                  'success': true,
                  'orderId': 'order-1',
                  'status': 'DELIVERED',
                },
              };
            });
          },
          data: <String, dynamic>{},
        );

        final res = await repo.confirmDelivery(orderId: 'order-1');

        expect(res, const Ok<void>(null));
        expect(capturedBody, <String, dynamic>{});
      });

      test('404 không tìm thấy đơn → Err(ServerFailure) message từ server', () async {
        adapter.onPatch(
          '/api/orders/order-404/confirm',
          (server) {
            server.reply(404, {'success': false, 'error': 'Order not found'});
          },
          data: <String, dynamic>{},
        );

        final res = await repo.confirmDelivery(orderId: 'order-404');

        expect(res.isOk, isFalse);
        final failure = (res as Err<void>).failure;
        expect(failure, isA<ServerFailure>());
        expect((failure as ServerFailure).message, 'Order not found');
        expect(failure.statusCode, 404);
      });

      test('403 không phải đơn của mình → Err(ServerFailure)', () async {
        adapter.onPatch(
          '/api/orders/order-1/confirm',
          (server) {
            server.reply(403, {'success': false, 'error': 'Forbidden'});
          },
          data: <String, dynamic>{},
        );

        final res = await repo.confirmDelivery(orderId: 'order-1');

        expect((res as Err<void>).failure, isA<ServerFailure>());
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onPatch(
          '/api/orders/order-1/confirm',
          (server) {
            server.throws(
              0,
              DioException(
                requestOptions: RequestOptions(path: '/api/orders/order-1/confirm'),
                type: DioExceptionType.connectionError,
                error: 'connection refused',
              ),
            );
          },
          data: <String, dynamic>{},
        );

        final res = await repo.confirmDelivery(orderId: 'order-1');

        expect((res as Err<void>).failure, isA<NetworkFailure>());
      });
    });
  });
}
