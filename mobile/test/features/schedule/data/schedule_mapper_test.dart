import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/schedule_dtos.dart';
import 'package:iceflow_mobile/features/schedule/data/mappers/schedule_mapper.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

void main() {
  group('ShiftSlot', () {
    test('map đủ 8 khung giờ từ server, giờ bắt đầu/kết thúc đúng', () {
      const wireNames = [
        'SLOT_00_03',
        'SLOT_03_06',
        'SLOT_06_09',
        'SLOT_09_12',
        'SLOT_12_15',
        'SLOT_15_18',
        'SLOT_18_21',
        'SLOT_21_24',
      ];

      expect(ShiftSlot.values.map((s) => s.wireName), wireNames);
      for (final name in wireNames) {
        final slot = ShiftSlot.fromName(name)!;
        expect(slot.wireName, name);
        // Khớp `shiftEndHour` phía server: hai chữ số cuối của tên.
        expect(slot.startHour, int.parse(name.substring(5, 7)));
        expect(slot.endHour, int.parse(name.substring(8, 10)));
        expect(slot.endHour - slot.startHour, 3);
      }
    });

    test('null / không rõ → null, không tự suy khung giờ', () {
      expect(ShiftSlot.fromName(null), isNull);
      expect(ShiftSlot.fromName('slot_06_09'), isNull); // sai hoa-thường → lạ
      expect(ShiftSlot.fromName('MORNING'), isNull);
    });
  });

  group('ShiftStatus.fromName', () {
    test('map 3 trạng thái chính thức từ server (case-sensitive)', () {
      expect(ShiftStatus.fromName('PENDING'), ShiftStatus.pending);
      expect(ShiftStatus.fromName('APPROVED'), ShiftStatus.approved);
      expect(ShiftStatus.fromName('REJECTED'), ShiftStatus.rejected);
    });

    test('null / không rõ → null, không tự suy thành pending', () {
      expect(ShiftStatus.fromName(null), isNull);
      expect(ShiftStatus.fromName('approved'), isNull);
      expect(ShiftStatus.fromName('CANCELLED'), isNull);
    });
  });

  group('ScheduleMapper.parseDateOnly', () {
    test('yyyy-MM-dd → 00:00 local của đúng ngày đó', () {
      expect(ScheduleMapper.parseDateOnly('2026-12-15'), DateTime(2026, 12, 15));
      expect(ScheduleMapper.parseDateOnly('2026-01-05'), DateTime(2026, 1, 5));
    });

    test('thiếu / sai định dạng / ngày không có thật → null', () {
      expect(ScheduleMapper.parseDateOnly(null), isNull);
      expect(ScheduleMapper.parseDateOnly(''), isNull);
      expect(ScheduleMapper.parseDateOnly('2026-12-15T00:00:00.000Z'), isNull);
      expect(ScheduleMapper.parseDateOnly('15/12/2026'), isNull);
      expect(ScheduleMapper.parseDateOnly('2026-02-31'), isNull);
      expect(ScheduleMapper.parseDateOnly('2026-13-01'), isNull);
    });
  });

  group('ScheduleMapper.fromShiftDto', () {
    const shiftFixture = {
      'shiftDate': '2026-12-15',
      'shift': 'SLOT_09_12',
      'status': 'PENDING',
    };

    Failure failureOf(Map<String, dynamic> json) =>
        (ScheduleMapper.fromShiftDto(ShiftDto.fromJson(json)) as Err<Shift>)
            .failure;

    test('fixture → Ok(Shift)', () {
      final res = ScheduleMapper.fromShiftDto(ShiftDto.fromJson(shiftFixture));

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
    });

    test('thiếu / hỏng shiftDate → Err(UnexpectedFailure)', () {
      expect(
        failureOf({...shiftFixture}..remove('shiftDate')),
        isA<UnexpectedFailure>(),
      );
      expect(
        failureOf({...shiftFixture, 'shiftDate': '2026-12-32'}),
        isA<UnexpectedFailure>(),
      );
    });

    test('khung giờ lạ → Err(UnexpectedFailure), không suy mặc định', () {
      expect(
        failureOf({...shiftFixture, 'shift': 'SLOT_08_12'}),
        const UnexpectedFailure('Unknown shift slot: SLOT_08_12'),
      );
    });

    test('trạng thái lạ → Err(UnexpectedFailure), không suy mặc định', () {
      expect(
        failureOf({...shiftFixture, 'status': 'CANCELLED'}),
        const UnexpectedFailure('Unknown shift status: CANCELLED'),
      );
    });
  });

  group('ScheduleMapper.fromDto', () {
    // Fixture khớp contract backend `GET /api/schedule/my`.
    const scheduleFixture = <String, dynamic>{
      'userId': 'u-driver-1',
      'today': '2026-12-14',
      'currentHour': 22,
      'limits': {'STAFF': null, 'DRIVER': 2},
      'lockedMonths': ['2026-11'],
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
            {'shiftDate': '2026-12-15', 'shift': 'SLOT_06_09', 'status': 'APPROVED'},
            {'shiftDate': '2026-12-16', 'shift': 'SLOT_21_24', 'status': 'REJECTED'},
          ],
        },
      ],
    };

    Map<String, dynamic> withPerson(Map<String, dynamic> person) => {
          ...scheduleFixture,
          'people': [person],
        };

    Failure failureOf(Map<String, dynamic> json) =>
        (ScheduleMapper.fromDto(WeekScheduleDto.fromJson(json))
                as Err<WeekSchedule>)
            .failure;

    test('fixture → Ok(WeekSchedule) đúng dữ liệu', () {
      final res = ScheduleMapper.fromDto(WeekScheduleDto.fromJson(scheduleFixture));

      expect(
        res,
        Ok(
          WeekSchedule(
            userId: 'u-driver-1',
            today: DateTime(2026, 12, 14),
            currentHour: 22,
            staffLimit: null,
            driverLimit: 2,
            lockedMonths: const ['2026-11'],
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
                    slot: ShiftSlot.slot06To09,
                    status: ShiftStatus.approved,
                  ),
                  Shift(
                    date: DateTime(2026, 12, 16),
                    slot: ShiftSlot.slot21To24,
                    status: ShiftStatus.rejected,
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    });

    test('people rỗng, không tháng nào chốt → Ok', () {
      final res = ScheduleMapper.fromDto(
        WeekScheduleDto.fromJson({
          ...scheduleFixture,
          'lockedMonths': <String>[],
          'people': <Map<String, dynamic>>[],
        }),
      );

      final schedule = (res as Ok<WeekSchedule>).value;
      expect(schedule.lockedMonths, isEmpty);
      expect(schedule.people, isEmpty);
    });

    for (final field in ['userId', 'today', 'currentHour', 'limits', 'lockedMonths', 'people']) {
      test('thiếu `$field` → Err(UnexpectedFailure)', () {
        expect(
          failureOf({...scheduleFixture}..remove(field)),
          isA<UnexpectedFailure>(),
        );
      });
    }

    test('currentHour ngoài 0–23 → Err(UnexpectedFailure)', () {
      expect(failureOf({...scheduleFixture, 'currentHour': 24}), isA<UnexpectedFailure>());
      expect(failureOf({...scheduleFixture, 'currentHour': -1}), isA<UnexpectedFailure>());
    });

    test('lockedMonths sai định dạng → Err(UnexpectedFailure)', () {
      expect(
        failureOf({
          ...scheduleFixture,
          'lockedMonths': ['2026-13'],
        }),
        isA<UnexpectedFailure>(),
      );
    });

    test('người có vai trò ADMIN / lạ → Err(UnexpectedFailure)', () {
      const person = {
        'id': 'u-1',
        'name': 'Ai Đó',
        'shifts': <Map<String, dynamic>>[],
      };

      expect(
        failureOf(withPerson({...person, 'role': 'ADMIN'})),
        const UnexpectedFailure('Unknown schedule role: ADMIN'),
      );
      expect(
        failureOf(withPerson({...person, 'role': 'OWNER'})),
        const UnexpectedFailure('Unknown schedule role: OWNER'),
      );
    });

    test('người thiếu id / name / shifts → Err(UnexpectedFailure)', () {
      const person = {
        'id': 'u-1',
        'name': 'Ai Đó',
        'role': 'DRIVER',
        'shifts': <Map<String, dynamic>>[],
      };

      for (final field in ['id', 'name', 'shifts']) {
        expect(
          failureOf(withPerson({...person}..remove(field))),
          isA<UnexpectedFailure>(),
          reason: field,
        );
      }
    });

    test('một ca hỏng làm hỏng cả lịch (không âm thầm bỏ ca)', () {
      expect(
        failureOf(
          withPerson({
            'id': 'u-1',
            'name': 'Ai Đó',
            'role': 'DRIVER',
            'shifts': [
              {'shiftDate': '2026-12-15', 'shift': 'SLOT_06_09', 'status': 'APPROVED'},
              {'shiftDate': '2026-12-15', 'shift': 'SLOT_09_12', 'status': 'DONE'},
            ],
          }),
        ),
        const UnexpectedFailure('Unknown shift status: DONE'),
      );
    });
  });
}
