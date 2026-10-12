import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/home/presentation/shell_tabs.dart';

void main() {
  List<String> labels(UserRole role) =>
      [for (final tab in shellTabsFor(role)) tab.label];

  group('shellTabsFor', () {
    test('Tài xế: giao hàng, lịch sử, ca làm, cài đặt', () {
      expect(labels(UserRole.driver), [
        AppStrings.navToday,
        AppStrings.navHistory,
        AppStrings.navSchedule,
        AppStrings.navSettings,
      ]);
    });

    test('Nhân viên: đơn hàng, ca làm, cài đặt — không có màn giao hàng', () {
      expect(labels(UserRole.staff), [
        AppStrings.navOrders,
        AppStrings.navSchedule,
        AppStrings.navSettings,
      ]);
    });

    test('Quản lý: duyệt ca, kho lạnh, công nợ, thêm — không tự đăng ký ca '
        '(server từ chối)', () {
      expect(labels(UserRole.admin), [
        AppStrings.navShiftReview,
        AppStrings.navInventory,
        AppStrings.navDebt,
        AppStrings.navMore,
      ]);
    });

    test('tab cuối của mọi vai trò là nơi có cài đặt và đăng xuất: "Cài đặt", '
        'hoặc "Thêm" với Quản lý', () {
      expect(labels(UserRole.driver).last, AppStrings.navSettings);
      expect(labels(UserRole.staff).last, AppStrings.navSettings);
      expect(labels(UserRole.admin).last, AppStrings.navMore);
    });

    test('thanh dưới không quá 4 tab cho vai trò nào', () {
      for (final role in UserRole.values) {
        expect(labels(role).length, lessThanOrEqualTo(4), reason: role.name);
      }
    });
  });
}
