import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/shift_report_repository_impl.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recorded(String operation) =>
    (jsonDecode(
      File('../api/openapi/fixtures/responses/success/$operation.json').readAsStringSync(),
    ) as Map<String, dynamic>)['body'] as Map<String, dynamic>;

void main() {
  group('ShiftReportRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late ShiftReportRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = ShiftReportRepositoryImpl(dio: dio);
      requests = [];
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.next(options);
      }));
    });

    tearDown(() => dio.close());

    Map<String, dynamic> person({Object? role = 'DRIVER', Object? hours = 6, Object? shift = 'SLOT_09_12'}) => {
          'id': 'u-1',
          'name': 'Phạm Văn Tài',
          'role': role,
          'isActive': true,
          'approvedShifts': 2,
          'hours': hours,
          'daysWorked': 1,
          'pendingShifts': 1,
          'rejectedShifts': 0,
          'days': [
            {'date': '2026-10-12', 'shifts': [shift, 'SLOT_12_15']},
          ],
        };

    Map<String, dynamic> report(Map<String, dynamic> person, {Object? lockedAt}) => {
          'success': true,
          'data': {'month': '2026-10', 'shiftHours': 3, 'lockedAt': lockedAt, 'people': [person]},
        };

    test('getReport: response thật của server → đúng từng field; hỏi đúng tháng',
        () async {
      final body = recorded('getShiftReport');
      adapter.onGet('/api/reports/shifts', (server) => server.reply(200, body));

      final result = ((await repo.getReport(DateTime(2026, 12, 15))) as Ok<ShiftReport>).value;

      expect(requests.last.queryParameters, {'month': '2026-12'});
      final data = body['data'] as Map<String, dynamic>;
      final first = (data['people'] as List).first as Map<String, dynamic>;
      expect(result.month, DateTime(2026, 12));
      expect(result.isLocked, data['lockedAt'] != null);
      final personResult = result.people.first;
      expect(personResult.id, first['id']);
      expect(personResult.name, first['name']);
      expect(personResult.role, UserRole.fromName(first['role'] as String));
      expect(personResult.approvedShifts, first['approvedShifts']);
      expect(personResult.hours, first['hours']);
      expect(personResult.daysWorked, first['daysWorked']);
      final day = (first['days'] as List).first as Map<String, dynamic>;
      expect(personResult.days.first.date, DateTime.parse(day['date'] as String));
      expect(
        personResult.days.first.slots.map((slot) => slot.wireName),
        day['shifts'],
      );
    });

    test('getReport: tổng ca, tổng giờ, ca chờ duyệt; tháng đã chốt', () async {
      adapter.onGet('/api/reports/shifts',
          (server) => server.reply(200, report(person(), lockedAt: '2026-11-01T02:00:00.000Z')));

      final result = ((await repo.getReport(DateTime(2026, 10))) as Ok<ShiftReport>).value;

      expect(result.totalShifts, 2);
      expect(result.totalHours, 6);
      expect(result.pendingShifts, 1);
      expect(result.isLocked, isTrue);
      expect(result.people.single.days.single.slots, [ShiftSlot.slot09To12, ShiftSlot.slot12To15]);
    });

    test('getReport: vai trò lạ, thiếu số giờ, hoặc khung giờ lạ → lỗi, không '
        'đoán số liệu tính lương', () async {
      for (final broken in [
        person(role: 'OWNER'),
        person(hours: null),
        person(shift: 'SLOT_25_28'),
      ]) {
        adapter.onGet('/api/reports/shifts', (server) => server.reply(200, report(broken)));
        expect(
          ((await repo.getReport(DateTime(2026, 10))) as Err<ShiftReport>).failure,
          isA<UnexpectedFailure>(),
        );
      }
    });

    test('setLock: response thật (mở lại) → null; chốt → thời điểm chốt', () async {
      adapter.onPost('/api/reports/shifts/lock',
          (server) => server.reply(200, recorded('setPayrollLock')),
          data: Matchers.any);
      final reopened = await repo.setLock(DateTime(2026, 12, 3), locked: false);
      expect((reopened as Ok<DateTime?>).value, isNull);
      final raw = requests.last.data;
      expect(raw is String ? jsonDecode(raw) : raw, {'month': '2026-12', 'locked': false});

      adapter.onPost('/api/reports/shifts/lock', (server) {
        server.reply(200, {
          'success': true,
          'data': {'month': '2026-10', 'lockedAt': '2026-11-01T02:00:00.000Z'},
        });
      }, data: Matchers.any);
      final locked = await repo.setLock(DateTime(2026, 10), locked: true);
      expect((locked as Ok<DateTime?>).value, DateTime.utc(2026, 11, 1, 2));
    });

    test('setLock: còn ca chờ duyệt (409) → giữ câu của server', () async {
      adapter.onPost('/api/reports/shifts/lock', (server) {
        server.reply(409, {
          'success': false,
          'error': 'Còn 2 ca chờ duyệt trong tháng này',
          'code': 'PENDING_SHIFTS',
        });
      }, data: Matchers.any);

      expect(
        ((await repo.setLock(DateTime(2026, 10), locked: true)) as Err<DateTime?>).failure,
        const ServerFailure('Còn 2 ca chờ duyệt trong tháng này', statusCode: 409),
      );
    });
  });
}
