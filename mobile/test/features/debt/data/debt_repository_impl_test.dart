import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/debt/data/debt_endpoints.dart';
import 'package:iceflow_mobile/features/debt/data/debt_repository_impl.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';

void main() {
  group('DebtRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late DebtRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = DebtRepositoryImpl(dio: dio);
    });

    tearDown(() => dio.close());

    dynamic decodedBody(Object? raw) => raw is String ? jsonDecode(raw) : raw;

    group('getDebts', () {
      const path = DebtEndpoints.debtReport;

      test('200 → danh sách theo thứ tự server; lastPaymentDate null hoặc ISO',
          () async {
        // Khớp api/openapi/fixtures/responses/success/getDebtReport.json.
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'customerId': 'c-1',
                'customerName': 'Đại Lý Nước Ngọt Minh Tâm',
                'outstandingDebt': 3400000,
                'lastPaymentDate': null,
              },
              {
                'customerId': 'c-2',
                'customerName': 'Vựa Hải Sản Năm Căn',
                'outstandingDebt': 2100000.5,
                'lastPaymentDate': '2026-10-10T15:00:03.883Z',
              },
            ],
          });
        });

        final debts = ((await repo.getDebts()) as Ok<List<CustomerDebt>>).value;

        expect(debts, [
          const CustomerDebt(
            customerId: 'c-1',
            customerName: 'Đại Lý Nước Ngọt Minh Tâm',
            outstandingDebt: 3400000,
          ),
          CustomerDebt(
            customerId: 'c-2',
            customerName: 'Vựa Hải Sản Năm Căn',
            outstandingDebt: 2100000.5,
            lastPaymentAt: DateTime.utc(2026, 10, 10, 15, 0, 3, 883),
          ),
        ]);
      });

      test('không ai nợ → danh sách rỗng', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {'success': true, 'data': <Object>[]});
        });

        expect(await repo.getDebts(), const Ok<List<CustomerDebt>>([]));
      });

      test('thiếu số nợ, hoặc ngày trả không đọc được → Err, không suy số',
          () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {'customerId': 'c-1', 'customerName': 'A', 'lastPaymentDate': null},
            ],
          });
        });
        expect(
          ((await repo.getDebts()) as Err<List<CustomerDebt>>).failure,
          const UnexpectedFailure('Debt payload missing `outstandingDebt`'),
        );

        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'customerId': 'c-1',
                'customerName': 'A',
                'outstandingDebt': 1,
                'lastPaymentDate': 'hôm qua',
              },
            ],
          });
        });
        expect(
          ((await repo.getDebts()) as Err<List<CustomerDebt>>).failure,
          isA<UnexpectedFailure>(),
        );
      });

      test('`data` không phải danh sách → Err(UnexpectedFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {'success': true, 'data': {'rows': <Object>[]}});
        });

        expect(
          ((await repo.getDebts()) as Err<List<CustomerDebt>>).failure,
          isA<UnexpectedFailure>(),
        );
      });
    });

    group('getLedger', () {
      final path = DebtEndpoints.customerLedger('c-1');

      // Khớp api/openapi/fixtures/responses/success/listCustomerLedger.json.
      const ledgerBody = {
        'success': true,
        'data': [
          {
            'id': 'l-2',
            'customerId': 'c-1',
            'type': 'PAYMENT',
            'amount': 1000,
            'notes': 'Kiểm tra hợp đồng',
            'createdAt': '2026-10-10T15:00:03.883Z',
          },
          {
            'id': 'l-1',
            'customerId': 'c-1',
            'type': 'DEBT',
            'amount': 260000,
            'notes': null,
            'createdAt': '2026-10-10T15:00:03.820Z',
          },
        ],
        'meta': {'page': 1, 'limit': 5, 'total_item': 3, 'total_page': 1},
      };

      test('200 → một trang, dòng thu và dòng nợ, kèm số trang; gửi page/limit',
          () async {
        Map<String, dynamic>? query;
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          query = options.queryParameters;
          handler.next(options);
        }));
        adapter.onGet(path, (server) => server.reply(200, ledgerBody),
            queryParameters: {'page': 1, 'limit': 5});

        final res = await repo.getLedger('c-1', page: const PageParams(limit: 5));

        final page = (res as Ok<Paginated<LedgerEntry>>).value;
        expect(query, {'page': 1, 'limit': 5});
        expect(page.totalItems, 3);
        expect(page.hasNext, isFalse);
        expect(page.items, [
          LedgerEntry(
            id: 'l-2',
            customerId: 'c-1',
            type: LedgerEntryType.payment,
            amount: 1000,
            createdAt: DateTime.utc(2026, 10, 10, 15, 0, 3, 883),
            notes: 'Kiểm tra hợp đồng',
          ),
          LedgerEntry(
            id: 'l-1',
            customerId: 'c-1',
            type: LedgerEntryType.debt,
            amount: 260000,
            createdAt: DateTime.utc(2026, 10, 10, 15, 0, 3, 820),
          ),
        ]);
      });

      test('loại dòng lạ → Err: không đoán là nợ hay là thu', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'id': 'l-9',
                'customerId': 'c-1',
                'type': 'REFUND',
                'amount': 1,
                'createdAt': '2026-10-10T15:00:03.883Z',
              },
            ],
            'meta': {'page': 1, 'limit': 20, 'total_item': 1, 'total_page': 1},
          });
        }, queryParameters: {'page': 1, 'limit': 20});

        expect(
          ((await repo.getLedger('c-1')) as Err<Paginated<LedgerEntry>>).failure,
          const UnexpectedFailure('Unknown ledger entry type: REFUND'),
        );
      });

      test('thiếu `meta` → Err(UnexpectedFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {'success': true, 'data': <Object>[]});
        }, queryParameters: {'page': 1, 'limit': 20});

        expect(
          ((await repo.getLedger('c-1')) as Err<Paginated<LedgerEntry>>).failure,
          isA<UnexpectedFailure>(),
        );
      });

      test('404 (không có khách này) → giữ câu của server', () async {
        adapter.onGet(path, (server) {
          server.reply(404, {'success': false, 'error': 'Không tìm thấy khách hàng'});
        }, queryParameters: {'page': 1, 'limit': 20});

        expect(
          ((await repo.getLedger('c-1')) as Err<Paginated<LedgerEntry>>).failure,
          const ServerFailure('Không tìm thấy khách hàng', statusCode: 404),
        );
      });
    });

    group('recordPayment', () {
      final path = DebtEndpoints.customerPayments('c-1');

      test('201 → dòng PAYMENT và số còn nợ; gửi amount nguyên + notes đã trim',
          () async {
        Object? sent;
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          sent = decodedBody(options.data);
          handler.next(options);
        }));
        // Khớp api/openapi/fixtures/responses/success/recordCustomerPayment.json.
        adapter.onPost(path, (server) {
          server.reply(201, {
            'success': true,
            'data': {
              'payment': {
                'id': 'l-3',
                'customerId': 'c-1',
                'type': 'PAYMENT',
                'amount': 500000,
                'notes': 'Tiền mặt',
                'createdAt': '2026-10-12T02:00:00.000Z',
              },
              'outstandingDebt': 3159000,
            },
          });
        }, data: Matchers.any);

        final res = await repo.recordPayment(
          customerId: 'c-1',
          amount: 500000,
          notes: ' Tiền mặt ',
        );

        final receipt = (res as Ok<PaymentReceipt>).value;
        expect(sent, {'amount': 500000, 'notes': 'Tiền mặt'});
        expect(receipt.outstandingDebt, 3159000.0);
        expect(receipt.entry.type, LedgerEntryType.payment);
        expect(receipt.entry.amount, 500000.0);
        expect(receipt.entry.notes, 'Tiền mặt');
      });

      test('có mã → header Idempotency-Key; không mã → không có header',
          () async {
        final headers = <Map<String, dynamic>>[];
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          headers.add(options.headers);
          handler.next(options);
        }));
        adapter.onPost(path, (server) {
          server.reply(201, {'success': true, 'data': <String, dynamic>{}});
        }, data: Matchers.any);

        await repo.recordPayment(customerId: 'c-1', amount: 1000, idempotencyKey: 'key-1');
        await repo.recordPayment(customerId: 'c-1', amount: 1000);

        expect(headers[0]['Idempotency-Key'], 'key-1');
        expect(headers[1].containsKey('Idempotency-Key'), isFalse);
      });

      test('không ghi chú → không gửi `notes`', () async {
        Object? sent;
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          sent = decodedBody(options.data);
          handler.next(options);
        }));
        adapter.onPost(path, (server) {
          server.reply(201, {'success': true, 'data': <String, dynamic>{}});
        }, data: Matchers.any);

        await repo.recordPayment(customerId: 'c-1', amount: 1000);

        expect(sent, {'amount': 1000});
      });

      test('thu vượt số nợ (409) → giữ câu của server', () async {
        adapter.onPost(path, (server) {
          server.reply(409, {
            'success': false,
            'error': 'Số tiền thu vượt quá công nợ hiện tại (3.400.000đ)',
            'code': 'PAYMENT_EXCEEDS_DEBT',
          });
        }, data: Matchers.any);

        expect(
          ((await repo.recordPayment(customerId: 'c-1', amount: 9000000)) as Err<PaymentReceipt>).failure,
          const ServerFailure(
            'Số tiền thu vượt quá công nợ hiện tại (3.400.000đ)',
            statusCode: 409,
          ),
        );
      });

      test('response thiếu `payment` → Err(UnexpectedFailure)', () async {
        adapter.onPost(path, (server) {
          server.reply(201, {'success': true, 'data': {'outstandingDebt': 1}});
        }, data: Matchers.any);

        expect(
          ((await repo.recordPayment(customerId: 'c-1', amount: 1000)) as Err<PaymentReceipt>).failure,
          const UnexpectedFailure('Payment payload missing `payment`'),
        );
      });
    });
  });
}
