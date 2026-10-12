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

    test('Nhân viên: ca làm, cài đặt — không có màn giao hàng', () {
      expect(labels(UserRole.staff), [
        AppStrings.navSchedule,
        AppStrings.navSettings,
      ]);
    });

    test('Quản lý: không tự đăng ký ca (server từ chối), chỉ cài đặt', () {
      expect(labels(UserRole.admin), [AppStrings.navSettings]);
    });

    test('vai trò nào cũng có Cài đặt ở cuối, để đăng xuất được', () {
      for (final role in UserRole.values) {
        expect(labels(role).last, AppStrings.navSettings, reason: role.name);
      }
    });
  });
}
