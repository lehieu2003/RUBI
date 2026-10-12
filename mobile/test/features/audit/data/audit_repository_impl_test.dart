import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/audit/data/audit_repository_impl.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';

void main() {
  group('AuditRepositoryImpl', () {
    const path = '/api/audit-logs';

    late Dio dio;
    late DioAdapter adapter;
    late AuditRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = AuditRepositoryImpl(dio: dio);
    });

    tearDown(() => dio.close());

    // Khớp api/openapi/fixtures/responses/success/listAuditLogs.json, thêm một
    // dòng thu tiền (không gắn với đơn).
    const body = {
      'success': true,
      'data': [
        {
          'id': 'a-2',
          'action': 'DEBT_PAYMENT',
          'summary': 'Thu tiền 500.000đ (Tiền mặt). Còn nợ 2.900.000đ',
          'userName': 'Nguyễn Văn Chủ Xưởng',
          'orderId': null,
          'orderCode': null,
          'customerId': 'c-1',
          'customerName': 'Đại Lý Nước Ngọt Minh Tâm',
          'createdAt': '2026-10-11T02:40:00.000Z',
        },
        {
          'id': 'a-1',
          'action': 'ORDER_SETTLED',
          'summary': 'Chốt đơn: giao đủ. Ghi nợ 260.000đ',
          'userName': 'Nguyễn Văn Chủ Xưởng',
          'orderId': 'cmv37qect002ci96g6f9lw7yq',
          'orderCode': 'DH-9LW7YQ',
          'customerId': 'c-1',
          'customerName': 'Đại Lý Nước Ngọt Minh Tâm',
          'createdAt': '2026-10-11T02:37:32.721Z',
        },
      ],
      'meta': {'page': 1, 'limit': 20, 'total_item': 45, 'total_page': 3},
    };

    test('200 → một trang; dòng thu tiền không có mã đơn', () async {
      adapter.onGet(path, (server) => server.reply(200, body),
          queryParameters: {'page': 1, 'limit': 20});

      final page = ((await repo.getEntries()) as Ok<Paginated<AuditEntry>>).value;

      expect(page.totalItems, 45);
      expect(page.hasNext, isTrue);
      expect(page.items, [
        AuditEntry(
          id: 'a-2',
          action: 'DEBT_PAYMENT',
          summary: 'Thu tiền 500.000đ (Tiền mặt). Còn nợ 2.900.000đ',
          userName: 'Nguyễn Văn Chủ Xưởng',
          createdAt: DateTime.utc(2026, 10, 11, 2, 40),
          customerName: 'Đại Lý Nước Ngọt Minh Tâm',
        ),
        AuditEntry(
          id: 'a-1',
          action: 'ORDER_SETTLED',
          summary: 'Chốt đơn: giao đủ. Ghi nợ 260.000đ',
          userName: 'Nguyễn Văn Chủ Xưởng',
          createdAt: DateTime.utc(2026, 10, 11, 2, 37, 32, 721),
          orderCode: 'DH-9LW7YQ',
          customerName: 'Đại Lý Nước Ngọt Minh Tâm',
        ),
      ]);
    });

    test('lọc công nợ / đơn hàng → gửi `type`; trang 2 → gửi `page`', () async {
      final queries = <Map<String, dynamic>>[];
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        queries.add(Map.of(options.queryParameters));
        handler.next(options);
      }));
      adapter
        ..onGet(path, (server) => server.reply(200, body),
            queryParameters: {'page': 1, 'limit': 20, 'type': 'DEBT'})
        ..onGet(path, (server) => server.reply(200, body),
            queryParameters: {'page': 2, 'limit': 20, 'type': 'ORDER'});

      await repo.getEntries(filter: AuditFilter.debt);
      await repo.getEntries(filter: AuditFilter.order, page: const PageParams(page: 2));

      expect(queries, [
        {'page': 1, 'limit': 20, 'type': 'DEBT'},
        {'page': 2, 'limit': 20, 'type': 'ORDER'},
      ]);
    });

    test('loại thao tác app chưa biết vẫn đọc được (giữ nguyên mã)', () async {
      adapter.onGet(path, (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {
              'id': 'a-9',
              'action': 'PRICE_CHANGED',
              'summary': 'Đổi giá Đá Bi 5kg',
              'userName': 'Chủ',
              'createdAt': '2026-10-11T02:40:00.000Z',
            },
          ],
          'meta': {'page': 1, 'limit': 20, 'total_item': 1, 'total_page': 1},
        });
      }, queryParameters: {'page': 1, 'limit': 20});

      final page = ((await repo.getEntries()) as Ok<Paginated<AuditEntry>>).value;
      expect(page.items.single.action, 'PRICE_CHANGED');
    });

    test('thiếu người thực hiện hoặc thời điểm → Err(UnexpectedFailure)',
        () async {
      adapter.onGet(path, (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'id': 'a-9', 'action': 'ORDER_CREATED', 'summary': 'x', 'createdAt': '2026-10-11T02:40:00.000Z'},
          ],
          'meta': {'page': 1, 'limit': 20, 'total_item': 1, 'total_page': 1},
        });
      }, queryParameters: {'page': 1, 'limit': 20});

      expect(
        ((await repo.getEntries()) as Err<Paginated<AuditEntry>>).failure,
        const UnexpectedFailure('Audit entry payload missing `userName`'),
      );
    });

    test('403 (không phải Quản lý) → giữ câu của server', () async {
      adapter.onGet(path, (server) {
        server.reply(403, {'success': false, 'error': 'Bạn không có quyền thực hiện thao tác này'});
      }, queryParameters: {'page': 1, 'limit': 20});

      expect(
        ((await repo.getEntries()) as Err<Paginated<AuditEntry>>).failure,
        const ServerFailure('Bạn không có quyền thực hiện thao tác này', statusCode: 403),
      );
    });
  });
}
