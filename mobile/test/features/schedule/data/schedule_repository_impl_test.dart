import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/schedule_repository_impl.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

void main() {
  group('ScheduleRepositoryImpl', () {
    const path = '/api/schedule/my';

    late Dio dio;
    late DioAdapter adapter;
    late ScheduleRepositoryImpl repo;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio);
      repo = ScheduleRepositoryImpl(dio: dio);
    });

    tearDown(() {
      dio.close();
    });

    /// The adapter may hand the request body back as a JSON string or a map.
    dynamic decodedBody(Object? raw) => raw is String ? jsonDecode(raw) : raw;

    DioException connectionError() => DioException(
          requestOptions: RequestOptions(path: path),
          type: DioExceptionType.connectionError,
          error: 'connection refused',
        );

    // Fixture khớp contract backend `GET /api/schedule/my`
    // (api/openapi/fixtures/responses/success/getMySchedule.json + 1 ca).
    const scheduleFixture = <String, dynamic>{
      'userId': 'u-driver-1',
      'today': '2026-12-14',
      'currentHour': 9,
      'limits': {'STAFF': null, 'DRIVER': 2},
      'lockedMonths': <String>[],
      'people': [
        {
          'id': 'u-staff-1',
          'name': 'Lê Văn Lên Đơn',
          'role': 'STAFF',
          'shifts': <Map<String, dynamic>>[],
        },
        {
          'id': 'u-driver-1',
          'name': 'Phạm Văn Tài (Xe 1)',
          'role': 'DRIVER',
          'shifts': [
            {'shiftDate': '2026-12-15', 'shift': 'SLOT_09_12', 'status': 'PENDING'},
          ],
        },
      ],
    };

    group('getWeek', () {
      test('200 → Ok(WeekSchedule) đúng dữ liệu + query `week` yyyy-MM-dd',
          () async {
        Object? capturedQuery;
        adapter.onGet(path, (server) {
          server.replyCallback(200, (options) {
            capturedQuery = options.queryParameters;
            return {'success': true, 'data': scheduleFixture};
          });
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect(
          res,
          Ok(
            WeekSchedule(
              userId: 'u-driver-1',
              today: DateTime(2026, 12, 14),
              currentHour: 9,
              staffLimit: null,
              driverLimit: 2,
              lockedMonths: const [],
              people: [
                const SchedulePerson(
                  id: 'u-staff-1',
                  name: 'Lê Văn Lên Đơn',
                  role: UserRole.staff,
                  shifts: [],
                ),
                SchedulePerson(
                  id: 'u-driver-1',
                  name: 'Phạm Văn Tài (Xe 1)',
                  role: UserRole.driver,
                  shifts: [
                    Shift(
                      date: DateTime(2026, 12, 15),
                      slot: ShiftSlot.slot09To12,
                      status: ShiftStatus.pending,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
        expect(capturedQuery, {'week': '2026-12-14'});
      });

      test('query `week` zero-padded, bỏ phần giờ của DateTime', () async {
        Object? capturedQuery;
        adapter.onGet(path, (server) {
          server.replyCallback(200, (options) {
            capturedQuery = options.queryParameters;
            return {'success': true, 'data': scheduleFixture};
          });
        });

        final res = await repo.getWeek(DateTime(2026, 1, 5, 23, 59));

        expect(res.isOk, isTrue);
        expect(capturedQuery, {'week': '2026-01-05'});
      });

      test('403 (VD chưa đổi mật khẩu) → Err(ServerFailure) message từ server',
          () async {
        adapter.onGet(path, (server) {
          server.reply(403, {
            'success': false,
            'error': 'Bạn cần đổi mật khẩu trước khi tiếp tục',
            'code': 'PASSWORD_CHANGE_REQUIRED',
          });
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect(
          res,
          const Err<WeekSchedule>(
            ServerFailure(
              'Bạn cần đổi mật khẩu trước khi tiếp tục',
              statusCode: 403,
            ),
          ),
        );
      });

      test('401 → Err(AuthFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(401, {'success': false, 'error': 'Token expired'});
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect((res as Err<WeekSchedule>).failure, isA<AuthFailure>());
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onGet(path, (server) {
          server.throws(0, connectionError());
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect(res, const Err<WeekSchedule>(NetworkFailure()));
      });

      test('200 thiếu data → Err(UnexpectedFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {'success': true});
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect((res as Err<WeekSchedule>).failure, isA<UnexpectedFailure>());
      });

      test('200 thiếu data.people → Err(UnexpectedFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {...scheduleFixture}..remove('people'),
          });
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect((res as Err<WeekSchedule>).failure, isA<UnexpectedFailure>());
      });

      test('200 field sai kiểu (currentHour là chuỗi) → Err(UnexpectedFailure), không ném',
          () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {...scheduleFixture, 'currentHour': '9'},
          });
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        // TypeError từ cast `as int?` phải bị repo giữ lại trong Result.
        expect((res as Err<WeekSchedule>).failure, isA<UnexpectedFailure>());
      });

      test('200 có ca với khung giờ lạ → Err(UnexpectedFailure)', () async {
        adapter.onGet(path, (server) {
          server.reply(200, {
            'success': true,
            'data': {
              ...scheduleFixture,
              'people': [
                {
                  'id': 'u-driver-1',
                  'name': 'Tài',
                  'role': 'DRIVER',
                  'shifts': [
                    {'shiftDate': '2026-12-15', 'shift': 'SLOT_08_12', 'status': 'PENDING'},
                  ],
                },
              ],
            },
          });
        });

        final res = await repo.getWeek(DateTime(2026, 12, 14));

        expect((res as Err<WeekSchedule>).failure, isA<UnexpectedFailure>());
      });
    });

    group('requestShift', () {
      const body = {'shiftDate': '2026-12-15', 'shift': 'SLOT_09_12'};

      test('200 → Ok(Shift pending), gửi đúng body', () async {
        Object? capturedBody;
        // data: bắt buộc khi route có body — matcher so sánh cả request body.
        adapter.onPost(
          path,
          (server) {
            server.replyCallback(200, (options) {
              capturedBody = decodedBody(options.data);
              return {
                'success': true,
                'data': {
                  'shift': {...body, 'status': 'PENDING'},
                },
              };
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15, 8, 30),
          slot: ShiftSlot.slot09To12,
        );

        expect(
          res,
          Ok(
            Shift(
              date: DateTime(2026, 12, 15),
              slot: ShiftSlot.slot09To12,
              status: ShiftStatus.pending,
            ),
          ),
        );
        expect(capturedBody, body);
      });

      test('200 ca đã được duyệt từ trước → Ok(Shift approved) nguyên trạng',
          () async {
        adapter.onPost(
          path,
          (server) {
            server.reply(200, {
              'success': true,
              'data': {
                'shift': {...body, 'status': 'APPROVED'},
              },
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect((res as Ok<Shift>).value.status, ShiftStatus.approved);
      });

      test('409 SHIFT_FULL → Err(ServerFailure) message từ server', () async {
        adapter.onPost(
          path,
          (server) {
            server.reply(409, {
              'success': false,
              'error': 'Ca này đã đủ 2 người. Chọn ca khác hoặc báo Quản lý.',
              'code': 'SHIFT_FULL',
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect(
          res,
          const Err<Shift>(
            ServerFailure(
              'Ca này đã đủ 2 người. Chọn ca khác hoặc báo Quản lý.',
              statusCode: 409,
            ),
          ),
        );
      });

      test('409 PAYROLL_LOCKED → Err(ServerFailure) message từ server', () async {
        // api/openapi/fixtures/responses/error/requestMyShift.409.json
        const message =
            'Bảng công tháng 12/2026 đã chốt, không thể thay đổi ca. Quản lý cần mở lại bảng công trước.';
        adapter.onPost(
          path,
          (server) {
            server.reply(409, {
              'success': false,
              'error': message,
              'code': 'PAYROLL_LOCKED',
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect(res, const Err<Shift>(ServerFailure(message, statusCode: 409)));
      });

      test('400 ngày đã qua → Err(ServerFailure) message từ server', () async {
        adapter.onPost(
          path,
          (server) {
            server.reply(400, {
              'success': false,
              'error': 'Không thể thay đổi ca của ngày đã qua',
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect(
          res,
          const Err<Shift>(
            ServerFailure('Không thể thay đổi ca của ngày đã qua', statusCode: 400),
          ),
        );
      });

      test('200 thiếu data.shift → Err(UnexpectedFailure)', () async {
        adapter.onPost(
          path,
          (server) {
            server.reply(200, {'success': true, 'data': <String, dynamic>{}});
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect((res as Err<Shift>).failure, isA<UnexpectedFailure>());
      });

      test('200 trạng thái lạ → Err(UnexpectedFailure)', () async {
        adapter.onPost(
          path,
          (server) {
            server.reply(200, {
              'success': true,
              'data': {
                'shift': {...body, 'status': 'WAITING'},
              },
            });
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect((res as Err<Shift>).failure, isA<UnexpectedFailure>());
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onPost(
          path,
          (server) {
            server.throws(0, connectionError());
          },
          data: body,
        );

        final res = await repo.requestShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot09To12,
        );

        expect(res, const Err<Shift>(NetworkFailure()));
      });
    });

    group('withdrawShift', () {
      const body = {'shiftDate': '2026-12-15', 'shift': 'SLOT_21_24'};

      test('DELETE kèm body ca cần rút → Ok(null)', () async {
        Object? capturedBody;
        adapter.onDelete(
          path,
          (server) {
            server.replyCallback(200, (options) {
              capturedBody = decodedBody(options.data);
              return {
                'success': true,
                'data': {'success': true},
              };
            });
          },
          data: body,
        );

        final res = await repo.withdrawShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot21To24,
        );

        expect(res, const Ok<void>(null));
        expect(capturedBody, body);
      });

      test('409 ca đã duyệt → Err(ServerFailure) message từ server', () async {
        adapter.onDelete(
          path,
          (server) {
            server.reply(409, {
              'success': false,
              'error': 'Ca đã được duyệt. Liên hệ Quản lý để thay đổi.',
            });
          },
          data: body,
        );

        final res = await repo.withdrawShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot21To24,
        );

        expect(
          res,
          const Err<void>(
            ServerFailure(
              'Ca đã được duyệt. Liên hệ Quản lý để thay đổi.',
              statusCode: 409,
            ),
          ),
        );
      });

      test('401 → Err(AuthFailure)', () async {
        adapter.onDelete(
          path,
          (server) {
            server.reply(401, {'success': false, 'error': 'Token expired'});
          },
          data: body,
        );

        final res = await repo.withdrawShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot21To24,
        );

        expect((res as Err<void>).failure, isA<AuthFailure>());
      });

      test('lỗi kết nối → Err(NetworkFailure)', () async {
        adapter.onDelete(
          path,
          (server) {
            server.throws(0, connectionError());
          },
          data: body,
        );

        final res = await repo.withdrawShift(
          date: DateTime(2026, 12, 15),
          slot: ShiftSlot.slot21To24,
        );

        expect(res, const Err<void>(NetworkFailure()));
      });
    });
  });
}
