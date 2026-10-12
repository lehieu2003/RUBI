import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/shift_rules.dart';

void main() {
  // Thứ Hai 12/10/2026 → Chủ nhật 18/10/2026; hôm nay là thứ Tư 14/10, 10 giờ.
  final monday = DateTime(2026, 10, 12);
  final today = DateTime(2026, 10, 14);
  final tomorrow = DateTime(2026, 10, 15);

  Shift shift(DateTime date, ShiftSlot slot, ShiftStatus status) =>
      Shift(date: date, slot: slot, status: status);

  WeekSchedule week({
    List<Shift> mine = const [],
    List<SchedulePerson> others = const [],
    int? driverLimit,
    int? staffLimit,
    List<String> lockedMonths = const [],
    UserRole myRole = UserRole.driver,
  }) =>
      WeekSchedule(
        userId: 'me',
        today: today,
        currentHour: 10,
        staffLimit: staffLimit,
        driverLimit: driverLimit,
        lockedMonths: lockedMonths,
        people: [
          SchedulePerson(id: 'me', name: 'Tôi', role: myRole, shifts: mine),
          ...others,
        ],
      );

  SchedulePerson person(String name, UserRole role, List<Shift> shifts) =>
      SchedulePerson(id: name, name: name, role: role, shifts: shifts);

  SlotInfo slotOf(WeekSchedule week, DateTime date, ShiftSlot slot) =>
      ShiftRules.slotsOf(week, date).firstWhere((info) => info.slot == slot);

  group('ShiftRules.mondayOf', () {
    test('mọi ngày trong tuần đều về thứ Hai của tuần đó', () {
      expect(ShiftRules.mondayOf(DateTime(2026, 10, 12, 23, 59)), monday);
      expect(ShiftRules.mondayOf(DateTime(2026, 10, 14)), monday);
      expect(ShiftRules.mondayOf(DateTime(2026, 10, 18)), monday);
      // Qua ranh giới tháng: thứ Năm 1/10 thuộc tuần bắt đầu 28/9.
      expect(ShiftRules.mondayOf(DateTime(2026, 10, 1)), DateTime(2026, 9, 28));
    });
  });

  group('ShiftRules.slotsOf', () {
    test('luôn đủ 8 khung giờ theo thứ tự trong ngày', () {
      expect(
        ShiftRules.slotsOf(week(), tomorrow).map((info) => info.slot),
        ShiftSlot.values,
      );
    });

    test('ngày mai, chưa ai đăng ký → mở', () {
      final info = slotOf(week(), tomorrow, ShiftSlot.slot06To09);
      expect(info.mine, isNull);
      expect(info.others, isEmpty);
      expect(info.block, isNull);
    });

    test('ngày đã qua → khoá, kể cả ca của mình', () {
      final yesterday = DateTime(2026, 10, 13);
      final w = week(
        mine: [shift(yesterday, ShiftSlot.slot06To09, ShiftStatus.pending)],
      );
      final info = slotOf(w, yesterday, ShiftSlot.slot06To09);
      expect(info.mine, ShiftStatus.pending);
      expect(info.block, SlotBlock.past);
    });

    test('hôm nay lúc 10 giờ: ca kết thúc từ 9 giờ trở về trước đã qua giờ, '
        'ca 09–12 đang diễn ra vẫn mở', () {
      final w = week();
      expect(slotOf(w, today, ShiftSlot.slot06To09).block, SlotBlock.ended);
      expect(slotOf(w, today, ShiftSlot.slot09To12).block, isNull);
      expect(slotOf(w, today, ShiftSlot.slot12To15).block, isNull);
    });

    test('tháng đã chốt bảng công → khoá', () {
      final w = week(lockedMonths: ['2026-10']);
      expect(slotOf(w, tomorrow, ShiftSlot.slot06To09).block, SlotBlock.locked);
    });

    test('đủ số tài xế → khoá với tài xế chưa có ca; nhân viên không tính vào',
        () {
      final others = [
        person('An', UserRole.driver, [
          shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.approved),
        ]),
        person('Bình', UserRole.driver, [
          shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.pending),
        ]),
        person('Vân', UserRole.staff, [
          shift(tomorrow, ShiftSlot.slot09To12, ShiftStatus.approved),
        ]),
      ];
      final w = week(others: others, driverLimit: 2);

      final full = slotOf(w, tomorrow, ShiftSlot.slot06To09);
      expect(full.block, SlotBlock.full);
      expect(full.others, ['An', 'Bình']);
      // Chỉ có nhân viên ở ca này: tài xế vẫn đăng ký được.
      final staffOnly = slotOf(w, tomorrow, ShiftSlot.slot09To12);
      expect(staffOnly.block, isNull);
      expect(staffOnly.others, ['Vân']);
    });

    test('ca đã đủ người nhưng mình đang có trong đó → không khoá', () {
      final w = week(
        mine: [shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.pending)],
        others: [
          person('An', UserRole.driver, [
            shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.approved),
          ]),
        ],
        driverLimit: 2,
      );
      final info = slotOf(w, tomorrow, ShiftSlot.slot06To09);
      expect(info.mine, ShiftStatus.pending);
      expect(info.block, isNull);
    });

    test('không giới hạn (null) → không bao giờ đủ người', () {
      final w = week(
        others: [
          for (final name in ['An', 'Bình', 'Cường'])
            person(name, UserRole.driver, [
              shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.approved),
            ]),
        ],
      );
      expect(slotOf(w, tomorrow, ShiftSlot.slot06To09).block, isNull);
    });

    test('nhân viên dùng giới hạn của nhân viên', () {
      final w = week(
        myRole: UserRole.staff,
        staffLimit: 1,
        driverLimit: 5,
        others: [
          person('Vân', UserRole.staff, [
            shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.approved),
          ]),
        ],
      );
      expect(slotOf(w, tomorrow, ShiftSlot.slot06To09).block, SlotBlock.full);
    });
  });

  test('countMine đếm ca của mình trong tuần theo trạng thái', () {
    final w = week(
      mine: [
        shift(today, ShiftSlot.slot12To15, ShiftStatus.approved),
        shift(tomorrow, ShiftSlot.slot06To09, ShiftStatus.pending),
        shift(tomorrow, ShiftSlot.slot09To12, ShiftStatus.pending),
      ],
    );
    expect(ShiftRules.countMine(w, ShiftStatus.approved), 1);
    expect(ShiftRules.countMine(w, ShiftStatus.pending), 2);
    expect(ShiftRules.countMine(w, ShiftStatus.rejected), 0);
  });
}
