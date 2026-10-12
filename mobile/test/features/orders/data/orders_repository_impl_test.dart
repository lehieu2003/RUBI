import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/orders_repository_impl.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';

/// Response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recorded(String operation) {
  final file = File('../api/openapi/fixtures/responses/success/$operation.json');
  return (jsonDecode(file.readAsStringSync()) as Map<String, dynamic>)['body']
      as Map<String, dynamic>;
}

void main() {
  group('OrdersRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late OrdersRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = OrdersRepositoryImpl(dio: dio);
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

    group('getOrders', () {
      test('response thật của server → đọc được hết, đúng từng field', () async {
        final body = recorded('listOrders');
        adapter.onGet('/api/orders', (server) => server.reply(200, body));

        final page = ((await repo.getOrders()) as Ok<Paginated<OfficeOrder>>).value;

        final rows = body['data'] as List;
        expect(page.items, hasLength(rows.length));
        final first = rows.first as Map<String, dynamic>;
        final order = page.items.first;
        expect(order.id, first['id']);
        expect(order.status.wireName, first['status']);
        expect(order.total, (first['total'] as num).toDouble());
        expect(order.notes, first['notes']);
        expect(order.customerName, (first['customer'] as Map)['name']);
        expect(order.customerCode, (first['customer'] as Map)['code']);
        expect(order.driverName, (first['driver'] as Map?)?['name']);
        expect(order.lines, hasLength((first['orderItems'] as List).length));
        final line = (first['orderItems'] as List).first as Map<String, dynamic>;
        expect(order.lines.first.id, line['id']);
        expect(order.lines.first.productName, (line['product'] as Map)['name']);
        expect(order.lines.first.quantity, line['quantity']);
        expect(order.code, 'DH-${(first['id'] as String).substring((first['id'] as String).length - 6).toUpperCase()}');
        expect(page.totalItems, (body['meta'] as Map)['total_item']);
      });

      test('bộ lọc, trạng thái và trang → đúng tham số của server', () async {
        adapter.onGet('/api/orders', (server) => server.reply(200, recorded('listOrders')));

        await repo.getOrders(
          filter: OrderFilter(search: ' minh tâm ', date: DateTime(2026, 10, 9)),
          status: OfficeOrderStatus.pending,
          page: const PageParams(page: 2, limit: 50),
        );
        expect(requests.last.queryParameters, {
          'q': 'minh tâm',
          'date': '2026-10-09',
          'status': 'PENDING',
          'page': 2,
          'limit': 50,
        });

        await repo.getOrders(filter: const OrderFilter(driverId: 'd-1'));
        expect(requests.last.queryParameters['driverId'], 'd-1');

        await repo.getOrders(
          filter: const OrderFilter(driverId: 'd-1', unassignedOnly: true),
        );
        expect(requests.last.queryParameters['driverId'], 'unassigned');
        expect(requests.last.queryParameters.containsKey('q'), isFalse);
        expect(requests.last.queryParameters.containsKey('status'), isFalse);
      });

      Map<String, dynamic> withFirst(Map<String, dynamic> Function(Map<String, dynamic>) change) {
        final body = recorded('listOrders');
        final rows = [...(body['data'] as List)];
        rows[0] = change(Map<String, dynamic>.from(rows[0] as Map));
        return {...body, 'data': rows};
      }

      test('đơn chưa gán tài xế → driver null; đơn chưa đối soát → actualQty null',
          () async {
        adapter.onGet('/api/orders', (server) {
          server.reply(200, withFirst((order) => {...order, 'driver': null, 'driverId': null}));
        });

        final order = ((await repo.getOrders()) as Ok<Paginated<OfficeOrder>>).value.items.first;
        expect(order.driverId, isNull);
        expect(order.driverName, isNull);
      });

      test('trạng thái lạ, thiếu tổng tiền, thiếu số lượng → Err, không suy',
          () async {
        adapter.onGet('/api/orders', (server) {
          server.reply(200, withFirst((order) => {...order, 'status': 'RETURNED'}));
        });
        expect(
          ((await repo.getOrders()) as Err<Paginated<OfficeOrder>>).failure,
          const UnexpectedFailure('Unknown order status: RETURNED'),
        );

        adapter.onGet('/api/orders', (server) {
          server.reply(200, withFirst((order) => order..remove('total')));
        });
        expect(
          ((await repo.getOrders()) as Err<Paginated<OfficeOrder>>).failure,
          const UnexpectedFailure('Order payload missing `total`'),
        );

        adapter.onGet('/api/orders', (server) {
          server.reply(200, withFirst((order) {
            final items = [...(order['orderItems'] as List)];
            items[0] = Map<String, dynamic>.from(items[0] as Map)..remove('quantity');
            return {...order, 'orderItems': items};
          }));
        });
        expect(
          ((await repo.getOrders()) as Err<Paginated<OfficeOrder>>).failure,
          const UnexpectedFailure('Order item payload missing `quantity`'),
        );
      });

      test('403 (tài xế gọi) → giữ câu của server', () async {
        adapter.onGet('/api/orders', (server) {
          server.reply(403, {'success': false, 'error': 'Bạn không có quyền thực hiện thao tác này'});
        });

        expect(
          ((await repo.getOrders()) as Err<Paginated<OfficeOrder>>).failure,
          const ServerFailure('Bạn không có quyền thực hiện thao tác này', statusCode: 403),
        );
      });
    });

    group('getCounts', () {
      test('response thật → đủ năm trạng thái; gửi cùng bộ lọc, không gửi trang',
          () async {
        final body = recorded('getOrderCounts');
        adapter.onGet('/api/orders/counts', (server) => server.reply(200, body));

        final counts = ((await repo.getCounts(
          filter: const OrderFilter(search: 'minh', unassignedOnly: true),
        )) as Ok<OrderCounts>)
            .value;

        final byStatus = (body['data'] as Map)['byStatus'] as Map;
        expect(counts.total, (body['data'] as Map)['total']);
        for (final status in OfficeOrderStatus.values) {
          expect(counts.of(status), byStatus[status.wireName], reason: status.wireName);
        }
        expect(requests.last.queryParameters, {'q': 'minh', 'driverId': 'unassigned'});
      });

      test('thiếu một trạng thái → Err(UnexpectedFailure)', () async {
        adapter.onGet('/api/orders/counts', (server) {
          server.reply(200, {
            'success': true,
            'data': {'total': 1, 'byStatus': {'PENDING': 1}},
          });
        });

        expect(
          ((await repo.getCounts()) as Err<OrderCounts>).failure,
          const UnexpectedFailure('Order counts payload missing `byStatus.SHIPPING`'),
        );
      });
    });

    test('getDrivers: response thật → id, tên, điện thoại', () async {
      final body = recorded('listDrivers');
      adapter.onGet('/api/drivers', (server) => server.reply(200, body));

      final drivers = ((await repo.getDrivers()) as Ok<List<DriverOption>>).value;

      final first = (body['data'] as List).first as Map;
      expect(drivers.first, DriverOption(id: first['id'] as String, name: first['name'] as String, phone: first['phone'] as String?));
    });

    group('assignDriver', () {
      test('response thật → số đơn đã gán; gửi đúng các id và tài xế', () async {
        adapter.onPatch('/api/orders/bulk-assign',
            (server) => server.reply(200, recorded('bulkAssignOrders')),
            data: Matchers.any);

        final res = await repo.assignDriver(orderIds: ['o-1', 'o-2'], driverId: 'd-1');

        expect(res, const Ok<int>(1));
        expect(sentBody(), {'orderIds': ['o-1', 'o-2'], 'driverId': 'd-1'});
      });

      test('tài xế không còn giao được (404) → giữ câu của server', () async {
        adapter.onPatch('/api/orders/bulk-assign', (server) {
          server.reply(404, {'success': false, 'error': 'Không tìm thấy tài xế'});
        }, data: Matchers.any);

        expect(
          ((await repo.assignDriver(orderIds: ['o-1'], driverId: 'd-9')) as Err<int>).failure,
          const ServerFailure('Không tìm thấy tài xế', statusCode: 404),
        );
      });
    });

    group('changeStatus', () {
      test('response thật → trạng thái mới; không gửi lý do khi không huỷ',
          () async {
        adapter.onPatch('/api/orders/o-1/status',
            (server) => server.reply(200, recorded('updateOrderStatus')),
            data: Matchers.any);

        final res = await repo.changeStatus(orderId: 'o-1', status: OfficeOrderStatus.shipping);

        expect(res, const Ok(OfficeOrderStatus.shipping));
        expect(sentBody(), {'status': 'SHIPPING'});
      });

      test('huỷ đơn → gửi lý do đã trim', () async {
        adapter.onPatch('/api/orders/o-1/status', (server) {
          server.reply(200, {'success': true, 'data': {'status': 'CANCELLED'}});
        }, data: Matchers.any);

        final res = await repo.changeStatus(
          orderId: 'o-1',
          status: OfficeOrderStatus.cancelled,
          cancellationReason: ' Khách dời ngày ',
        );

        expect(res, const Ok(OfficeOrderStatus.cancelled));
        expect(sentBody(), {'status': 'CANCELLED', 'cancellationReason': 'Khách dời ngày'});
      });

      test('đơn đã đối soát (409) → giữ câu của server', () async {
        adapter.onPatch('/api/orders/o-1/status', (server) {
          server.reply(409, {
            'success': false,
            'error': 'Đơn đã hoàn thành (đã đối soát), không thể đổi trạng thái',
            'code': 'ORDER_FINAL',
          });
        }, data: Matchers.any);

        expect(
          ((await repo.changeStatus(orderId: 'o-1', status: OfficeOrderStatus.pending)) as Err<OfficeOrderStatus>).failure,
          const ServerFailure('Đơn đã hoàn thành (đã đối soát), không thể đổi trạng thái', statusCode: 409),
        );
      });
    });
  });

  test('OfficeOrder.code và isFinal', () {
    expect(OfficeOrderStatus.completed.isFinal, isTrue);
    expect(OfficeOrderStatus.cancelled.isFinal, isTrue);
    expect(OfficeOrderStatus.delivered.isFinal, isFalse);
    expect(OfficeOrderStatus.fromName('PENDING'), OfficeOrderStatus.pending);
    expect(OfficeOrderStatus.fromName('pending'), isNull);
  });
}
