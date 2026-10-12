import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/team_schedule_repository_impl.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

void main() {
  group('TeamScheduleRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late TeamScheduleRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = TeamScheduleRepositoryImpl(dio: dio);
    });

    tearDown(() => dio.close());

    dynamic decodedBody(Object? raw) => raw is String ? jsonDecode(raw) : raw;

    group('getTeamWeek', () {
      const path = '/api/schedule/assignments';
      final monday = DateTime(2026, 10, 12);

      test('200 → từng người với ca có id; gửi `week` là ngày theo lịch',
          () async {
        // Khớp api/openapi/fixtures/responses/success/listScheduleAssignments.json,
        // thêm ca để có id và đủ ba trạng thái.
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'id': 'u-staff',
                'name': 'Lê Văn Lên Đơn',
                'role': 'STAFF',
                'shifts': <Object>[],
              },
              {
                'id': 'u-driver',
                'name': 'Phạm Văn Tài',
                'role': 'DRIVER',
                'shifts': [
                  {'id': 's-1', 'shiftDate': '2026-10-13', 'shift': 'SLOT_06_09', 'status': 'PENDING'},
                  {'id': 's-2', 'shiftDate': '2026-10-13', 'shift': 'SLOT_09_12', 'status': 'APPROVED'},
                  {'id': 's-3', 'shiftDate': '2026-10-14', 'shift': 'SLOT_21_24', 'status': 'REJECTED'},
                ],
              },
            ],
          });
        }, queryParameters: {'week': '2026-10-12'});

        final people =
            ((await repo.getTeamWeek(monday)) as Ok<List<SchedulePerson>>).value;

        expect(people, [
          const SchedulePerson(
            id: 'u-staff',
            name: 'Lê Văn Lên Đơn',
            role: UserRole.staff,
            shifts: [],
          ),
          SchedulePerson(
            id: 'u-driver',
            name: 'Phạm Văn Tài',
            role: UserRole.driver,
            shifts: [
              Shift(id: 's-1', date: DateTime(2026, 10, 13), slot: ShiftSlot.slot06To09, status: ShiftStatus.pending),
              Shift(id: 's-2', date: DateTime(2026, 10, 13), slot: ShiftSlot.slot09To12, status: ShiftStatus.approved),
              Shift(id: 's-3', date: DateTime(2026, 10, 14), slot: ShiftSlot.slot21To24, status: ShiftStatus.rejected),
            ],
          ),
        ]);
      });

      test('ca thiếu id → Err: không duyệt được thì không hiển thị', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'id': 'u-driver',
                'name': 'Phạm Văn Tài',
                'role': 'DRIVER',
                'shifts': [
                  {'shiftDate': '2026-10-13', 'shift': 'SLOT_06_09', 'status': 'PENDING'},
                ],
              },
            ],
          });
        }, queryParameters: {'week': '2026-10-12'});

        expect(
          ((await repo.getTeamWeek(monday)) as Err<List<SchedulePerson>>).failure,
          const UnexpectedFailure('Team schedule shift payload missing `id`'),
        );
      });

      test('trạng thái lạ → Err, không suy mặc định', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': [
              {
                'id': 'u-driver',
                'name': 'Phạm Văn Tài',
                'role': 'DRIVER',
                'shifts': [
                  {'id': 's-1', 'shiftDate': '2026-10-13', 'shift': 'SLOT_06_09', 'status': 'DONE'},
                ],
              },
            ],
          });
        }, queryParameters: {'week': '2026-10-12'});

        expect(
          ((await repo.getTeamWeek(monday)) as Err<List<SchedulePerson>>).failure,
          const UnexpectedFailure('Unknown shift status: DONE'),
        );
      });

      test('403 (không phải Quản lý) → giữ câu của server', () async {
        adapter.onGet(path, (server) {
          server.reply(403, {
            'success': false,
            'error': 'Bạn không có quyền thực hiện thao tác này',
          });
        }, queryParameters: {'week': '2026-10-12'});

        expect(
          ((await repo.getTeamWeek(monday)) as Err<List<SchedulePerson>>).failure,
          const ServerFailure('Bạn không có quyền thực hiện thao tác này', statusCode: 403),
        );
      });
    });

    group('reviewShifts', () {
      const path = '/api/schedule/review';

      test('duyệt → gửi APPROVE với đúng các id, trả số ca đã đổi; từ chối → '
          'REJECT', () async {
        final sent = <Object?>[];
        dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
          sent.add(decodedBody(options.data));
          handler.next(options);
        }));
        // Khớp api/openapi/fixtures/responses/success/reviewShifts.json.
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': {'updated': 2}});
        }, data: Matchers.any);

        final approved = await repo.reviewShifts(shiftIds: ['s-1', 's-2'], approve: true);
        await repo.reviewShifts(shiftIds: ['s-3'], approve: false);

        expect(approved, const Ok<int>(2));
        expect(sent, [
          {'ids': ['s-1', 's-2'], 'action': 'APPROVE'},
          {'ids': ['s-3'], 'action': 'REJECT'},
        ]);
      });

      test('tháng đã chốt bảng công (409) → giữ câu của server', () async {
        adapter.onPost(path, (server) {
          server.reply(409, {
            'success': false,
            'error': 'Tháng 10/2026 đã chốt bảng công.',
            'code': 'PAYROLL_LOCKED',
          });
        }, data: Matchers.any);

        expect(
          ((await repo.reviewShifts(shiftIds: ['s-1'], approve: true)) as Err<int>).failure,
          const ServerFailure('Tháng 10/2026 đã chốt bảng công.', statusCode: 409),
        );
      });

      test('response thiếu `updated` → Err(UnexpectedFailure)', () async {
        adapter.onPost(path, (server) {
          server.reply(200, {'success': true, 'data': <String, dynamic>{}});
        }, data: Matchers.any);

        expect(
          ((await repo.reviewShifts(shiftIds: ['s-1'], approve: true)) as Err<int>).failure,
          isA<UnexpectedFailure>(),
        );
      });
    });
  });
}
