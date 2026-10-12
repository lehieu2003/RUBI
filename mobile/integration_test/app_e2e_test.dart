// The app on a device, against a real server. Not part of `flutter test`:
// run it with scripts/mobile-e2e-local.sh, which starts the server on a
// throwaway database, prepares the account and the order below, and passes
// them in with --dart-define.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/bootstrap/app_startup.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';
import 'package:integration_test/integration_test.dart';

/// A driver account the manager has just created: it must change its password.
const _email = String.fromEnvironment('E2E_EMAIL');
const _initialPassword = String.fromEnvironment('E2E_PASSWORD');
const _newPassword = String.fromEnvironment('E2E_NEW_PASSWORD');

/// The customer of the one order out for delivery with that driver.
const _customer = String.fromEnvironment('E2E_CUSTOMER');

/// Seeded accounts of the other two roles (src/db/seed.ts).
const _staffEmail = 'nhanvien@miendong.vn';
const _managerEmail = 'quanly@rubi.local';
const _seedPassword = '12345678';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  /// Waits for the server: pumps until [finder] shows up.
  Future<void> waitFor(
    WidgetTester tester,
    Finder finder, {
    Duration timeout = const Duration(seconds: 30),
  }) async {
    final end = DateTime.now().add(timeout);
    while (DateTime.now().isBefore(end)) {
      await tester.pump(const Duration(milliseconds: 200));
      if (finder.evaluate().isNotEmpty) return;
    }
    fail('Timed out waiting for $finder');
  }

  Future<void> signIn(WidgetTester tester, String email, String password) async {
    await waitFor(tester, find.byKey(const Key('login_submit')));
    await tester.enterText(find.byKey(const Key('login_email')), email);
    await tester.enterText(find.byKey(const Key('login_password')), password);
    await tester.tap(find.byKey(const Key('login_submit')));
  }

  testWidgets('a new driver: wrong password, forced password change, a '
      'delivery, a shift, sign out and back in; then staff sign in and the '
      'manager approves the shift and records a production batch', (tester) async {
    expect(_email, isNotEmpty, reason: 'run through scripts/mobile-e2e-local.sh');

    // Start as main() does, but without a session left by an earlier run.
    appStartup();
    await sl<AuthStorage>().clear();
    runApp(IceFlowApp(authCubit: sl<AuthCubit>(), themeCubit: sl<ThemeCubit>()));

    // --- A wrong password says so (not "session expired").
    await signIn(tester, _email, 'sai-mat-khau-1');
    await waitFor(tester, find.text('Email hoặc mật khẩu không đúng'));

    // --- The right one: the account is held on the change-password screen.
    await signIn(tester, _email, _initialPassword);
    await waitFor(tester, find.text(AppStrings.changePasswordForcedNotice));
    expect(find.text(AppStrings.navToday), findsNothing);

    // The server's own refusal comes through: wrong current password.
    await tester.enterText(find.byKey(const Key('change_password_current')), 'Khongdung123');
    await tester.enterText(find.byKey(const Key('change_password_new')), _newPassword);
    await tester.enterText(find.byKey(const Key('change_password_confirm')), _newPassword);
    await tester.tap(find.byKey(const Key('change_password_submit')));
    await waitFor(tester, find.text('Mật khẩu hiện tại không đúng'));

    await tester.enterText(find.byKey(const Key('change_password_current')), _initialPassword);
    await tester.tap(find.byKey(const Key('change_password_submit')));

    // --- Inside the app: today's deliveries.
    await waitFor(tester, find.text(AppStrings.navToday));
    await waitFor(tester, find.text(_customer));
    final card = find.ancestor(of: find.text(_customer), matching: find.byType(DeliveryCard));
    expect(
      find.descendant(of: card, matching: find.text(AppStrings.badgeShipping)),
      findsOneWidget,
    );

    await tester.tap(
      find.descendant(of: card, matching: find.text(AppStrings.confirmDeliveredButton)),
    );
    await waitFor(tester, find.text(AppStrings.confirmSheetBody(_customer)));
    await tester.tap(find.text(AppStrings.confirmAction));
    await waitFor(
      tester,
      find.descendant(
        of: find.ancestor(of: find.text(_customer), matching: find.byType(DeliveryCard)),
        matching: find.text(AppStrings.badgeDelivered),
      ),
    );

    // --- "Ca làm": request the last slot of tomorrow, then withdraw it.
    await tester.tap(find.text(AppStrings.navSchedule));
    await waitFor(tester, find.text(AppStrings.scheduleHint));
    final weekday = DateTime.now().weekday; // Monday = 1
    if (weekday == DateTime.sunday) {
      await tester.tap(find.byTooltip(AppStrings.nextWeekTooltip));
      await waitFor(tester, find.text(AppStrings.scheduleHint));
    } else {
      await tester.tap(find.byKey(Key('schedule_day_$weekday')));
    }
    await tester.pump(const Duration(milliseconds: 300));

    final slot = find.byKey(const Key('schedule_slot_SLOT_21_24'));
    await tester.scrollUntilVisible(slot, 200);
    Finder inSlot(String text) => find.descendant(of: slot, matching: find.text(text));

    await tester.tap(inSlot(AppStrings.shiftRegisterButton));
    await waitFor(tester, inSlot(AppStrings.shiftPending));
    await waitFor(tester, find.text(AppStrings.shiftRequested));

    await tester.tap(inSlot(AppStrings.shiftWithdrawButton));
    await waitFor(tester, inSlot(AppStrings.shiftRegisterButton));
    expect(inSlot(AppStrings.shiftPending), findsNothing);

    // Leave one request behind for the script to find on the server.
    await tester.tap(inSlot(AppStrings.shiftRegisterButton));
    await waitFor(tester, inSlot(AppStrings.shiftPending));

    // --- Sign out; the new password works and nothing is forced any more.
    await tester.tap(find.text(AppStrings.navSettings));
    await waitFor(tester, find.text(_email));
    await tester.tap(find.text(AppStrings.logoutButton));
    await waitFor(tester, find.text(AppStrings.logoutDialogTitle));
    await tester.tap(find.text(AppStrings.logoutButton).last);

    await signIn(tester, _email, _newPassword);
    await waitFor(tester, find.text(AppStrings.navToday));
    expect(find.text(AppStrings.changePasswordForcedNotice), findsNothing);
    // The delivery confirmed above is still there, as delivered.
    await waitFor(tester, find.text(_customer));
    expect(find.text(AppStrings.badgeDelivered), findsWidgets);

    // --- The app is for every role: staff and the manager get in too, each
    // with their own tabs (accounts of the seed).
    Future<void> signOut() async {
      if (find.text(AppStrings.navSettings).evaluate().isNotEmpty) {
        await tester.tap(find.text(AppStrings.navSettings).last);
      }
      await waitFor(tester, find.text(AppStrings.logoutButton));
      await tester.tap(find.text(AppStrings.logoutButton));
      await waitFor(tester, find.text(AppStrings.logoutDialogTitle));
      await tester.tap(find.text(AppStrings.logoutButton).last);
    }

    await signOut();
    await signIn(tester, _staffEmail, _seedPassword);
    // Staff land on "Ca làm", loaded from the server for their own role.
    await waitFor(tester, find.text(AppStrings.scheduleHint));
    expect(find.byType(NavigationDestination), findsNWidgets(2));
    expect(find.text(AppStrings.navToday), findsNothing);
    await tester.tap(find.text(AppStrings.navSettings));
    await waitFor(tester, find.text(_staffEmail));

    await signOut();
    await signIn(tester, _managerEmail, _seedPassword);
    // The manager lands on "Duyệt ca" and approves the request the driver
    // left for tomorrow.
    await waitFor(tester, find.text(AppStrings.navShiftReview).first);
    await waitFor(tester, find.byKey(const Key('shift_review_approve_all')));
    if (weekday == DateTime.sunday) {
      await tester.tap(find.byTooltip(AppStrings.nextWeekTooltip));
      await waitFor(tester, find.byKey(const Key('shift_review_approve_all')));
    } else {
      await tester.tap(find.byKey(Key('schedule_day_$weekday')));
    }
    await tester.pump(const Duration(milliseconds: 300));
    final requested = find.byKey(const Key('shift_review_slot_SLOT_21_24'));
    await waitFor(tester, requested);
    await tester.tap(
      find.descendant(of: requested, matching: find.text(AppStrings.approveButton)),
    );
    await waitFor(tester, find.text(AppStrings.shiftsApproved(1)));
    expect(
      find.descendant(of: requested, matching: find.text(AppStrings.approveButton)),
      findsNothing,
    );

    // "Kho lạnh": stock from the server, then a production batch of 5.
    await tester.tap(find.text(AppStrings.navInventory));
    await waitFor(tester, find.text(AppStrings.stockTotalBags));
    await tester.tap(find.text(AppStrings.stockProductionButton).first);
    await waitFor(tester, find.byKey(const Key('stock_sheet_quantity')));
    await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '5');
    await tester.tap(find.byKey(const Key('stock_sheet_submit')));
    await waitFor(tester, find.textContaining('Đã nhập 5'));

    await tester.tap(find.text(AppStrings.navSettings));
    await waitFor(tester, find.text(_managerEmail));
  });
}
