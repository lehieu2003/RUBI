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

/// That order's id.
const _orderId = String.fromEnvironment('E2E_ORDER_ID');

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
      try {
        if (finder.evaluate().isNotEmpty) return;
      } on StateError {
        // `.first` / `.last` of a finder with no match yet: keep waiting.
      }
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
      'delivery, a shift, sign out and back in; then staff take, assign and cancel an order and the '
      'manager approves the shift, records a production batch and a payment, '
      'reads the audit log and settles the delivery',
      (tester) async {
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
    // Staff land on "Đơn hàng", loaded from the server for their own role.
    final orderCards = find.byWidgetPredicate((widget) {
      final key = widget.key;
      return widget is Card &&
          key is ValueKey<String> &&
          key.value.startsWith('order_');
    });
    await waitFor(tester, orderCards);
    expect(find.byType(NavigationDestination), findsNWidgets(4));
    expect(find.text(AppStrings.navToday), findsNothing);
    // They take an order on the phone: pick the customer by typing without
    // accents, two bags of the first product on sale, a note for the driver.
    await tester.tap(find.byKey(const Key('orders_new')));
    await waitFor(tester, find.byKey(const Key('order_entry_customer_search')));
    await tester.enterText(
      find.byKey(const Key('order_entry_customer_search')),
      'gio bien',
    );
    await waitFor(tester, find.text('Quán Nhậu Gió Biển'));
    await tester.tap(find.text('Quán Nhậu Gió Biển'));
    await waitFor(tester, find.byKey(const Key('order_entry_save')));
    await waitFor(tester, find.byTooltip(AppStrings.settleIncreaseTooltip));
    await tester.tap(find.byTooltip(AppStrings.settleIncreaseTooltip).first);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(find.byTooltip(AppStrings.settleIncreaseTooltip).first);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.enterText(
      find.byKey(const Key('order_entry_notes')),
      'Lên thử từ app',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.byKey(const Key('order_entry_save')));
    await waitFor(tester, find.textContaining('Đã lên đơn'));
    await tester.pump(const Duration(milliseconds: 600));
    // The new order is the newest one waiting: they hand it to a driver,
    // then cancel it with a reason.
    await tester.tap(find.byKey(const Key('orders_tab_PENDING')));
    await tester.pump(const Duration(milliseconds: 300));
    await waitFor(tester, orderCards);
    await tester.tap(orderCards.first);
    await waitFor(tester, find.byKey(const Key('order_assign')));
    await tester.tap(find.byKey(const Key('order_assign')));
    final drivers = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(ListTile),
    );
    await waitFor(tester, drivers);
    await tester.tap(drivers.first);
    await waitFor(tester, find.textContaining('Đã giao đơn cho'));
    // Let the sheet finish closing before tapping the list again.
    await tester.pump(const Duration(milliseconds: 600));
    await waitFor(tester, orderCards);
    await tester.tap(orderCards.first);
    await waitFor(tester, find.byKey(const Key('order_cancel')));
    await tester.ensureVisible(find.byKey(const Key('order_cancel')));
    await tester.tap(find.byKey(const Key('order_cancel')));
    await waitFor(tester, find.byKey(const Key('order_cancel_reason')));
    await tester.enterText(
      find.byKey(const Key('order_cancel_reason')),
      'Hủy thử từ app',
    );
    await tester.tap(find.byKey(const Key('order_cancel_confirm')));
    await waitFor(
      tester,
      find.textContaining(': ${AppStrings.orderStatusLabel('CANCELLED')}'),
    );
    // "Khách hàng": find a customer without typing accents, see their
    // contact and the prices that apply to them. Staff cannot add customers.
    await tester.tap(find.text(AppStrings.navCustomers));
    await waitFor(tester, find.byKey(const Key('customers_search')));
    expect(find.byKey(const Key('customers_new')), findsNothing);
    await tester.enterText(find.byKey(const Key('customers_search')), 'minh tam');
    await waitFor(tester, find.text('Đại Lý Nước Ngọt Minh Tâm'));
    await tester.tap(find.text('Đại Lý Nước Ngọt Minh Tâm'));
    await waitFor(tester, find.text(AppStrings.customerPricesTitle));
    await waitFor(tester, find.textContaining('đ/'));
    expect(find.byKey(const Key('customer_ledger')), findsNothing);
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.byKey(const Key('customers_search')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text(AppStrings.navSchedule));
    await waitFor(tester, find.text(AppStrings.scheduleHint));
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


    // "Công nợ": the report from the server, a customer's ledger, a payment.
    await tester.tap(find.text(AppStrings.navDebt));
    await waitFor(tester, find.byKey(const Key('debt_total')));
    await tester.tap(find.byIcon(Icons.chevron_right).first);
    await waitFor(tester, find.byKey(const Key('ledger_pay')));
    await tester.tap(find.byKey(const Key('ledger_pay')));
    await waitFor(tester, find.byKey(const Key('payment_amount')));
    await tester.enterText(find.byKey(const Key('payment_amount')), '1000');
    await tester.enterText(find.byKey(const Key('payment_notes')), 'Thu thử từ app');
    await tester.tap(find.byKey(const Key('payment_submit')));
    await waitFor(tester, find.textContaining('Đã thu 1.000đ'));
    await waitFor(tester, find.text('−1.000đ'));
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.byKey(const Key('debt_total')));

    // "Thêm": the account, and the audit log with the payment just recorded.
    await tester.tap(find.text(AppStrings.navMore));
    await waitFor(tester, find.text(_managerEmail));
    await tester.tap(find.byKey(const Key('more_audit_log')));
    await waitFor(tester, find.textContaining('Thu thử từ app'));
    // ".last": the "Đơn hàng" entry of "Thêm" is still in the tree below.
    await tester.tap(find.text(AppStrings.auditFilterOrder).last);
    await waitFor(tester, find.textContaining('Tài xế xác nhận đã giao xong'));
    expect(find.textContaining('Thu thử từ app'), findsNothing);
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text(_managerEmail));
    // "Thêm" → "Đơn hàng": the same screen the staff use.
    // Let the audit log finish closing: "Thêm" was in the tree all along.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.tap(find.byKey(const Key('more_orders')));
    await waitFor(tester, orderCards);
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text(_managerEmail));
    // "Thêm" → "Khách hàng": the manager adds a customer and opens the
    // ledger of the one who paid above.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.tap(find.byKey(const Key('more_customers')));
    await waitFor(tester, find.byKey(const Key('customers_new')));
    await tester.tap(find.byKey(const Key('customers_new')));
    await waitFor(tester, find.byKey(const Key('customer_new_code')));
    await tester.enterText(find.byKey(const Key('customer_new_code')), 'KH-APP');
    await tester.enterText(
      find.byKey(const Key('customer_new_name')),
      'Khách Thêm Từ App',
    );
    await tester.enterText(
      find.byKey(const Key('customer_new_phone')),
      '0900111222',
    );
    await tester.tap(find.byKey(const Key('customer_new_save')));
    await waitFor(tester, find.textContaining('Đã thêm khách'));
    await waitFor(tester, find.text('Khách Thêm Từ App'));
    await tester.enterText(find.byKey(const Key('customers_search')), 'minh tam');
    await waitFor(tester, find.text('Đại Lý Nước Ngọt Minh Tâm'));
    await tester.tap(find.text('Đại Lý Nước Ngọt Minh Tâm'));
    await waitFor(tester, find.byKey(const Key('customer_ledger')));
    // This customer gets their own price for the first product.
    final priceRows = find.byWidgetPredicate((widget) {
      final key = widget.key;
      return widget is ListTile &&
          key is ValueKey<String> &&
          key.value.startsWith('customer_price_');
    });
    await waitFor(tester, priceRows);
    await tester.tap(priceRows.first);
    await waitFor(tester, find.byKey(const Key('customer_price_input')));
    await tester.enterText(find.byKey(const Key('customer_price_input')), '11111');
    await tester.tap(find.byKey(const Key('customer_price_save')));
    await waitFor(tester, find.textContaining('giá riêng 11.111đ'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byKey(const Key('customer_ledger')));
    await waitFor(tester, find.textContaining('Thu thử từ app'));
    await tester.tap(find.byType(BackButton).last);
    await waitFor(tester, find.byKey(const Key('customer_ledger')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(BackButton).last);
    await waitFor(tester, find.byKey(const Key('customers_search')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(BackButton).last);
    // The menu is scrolled by now: the account card is off screen.
    await tester.pump(const Duration(milliseconds: 600));
    // "Thêm" → "Sản phẩm & giá": the manager changes the default price of
    // the first product.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.ensureVisible(find.byKey(const Key('more_products')));
    await tester.tap(find.byKey(const Key('more_products')));
    await waitFor(tester, find.byKey(const Key('products_new')));
    final productTiles = find.byWidgetPredicate((widget) {
      final key = widget.key;
      return widget is ListTile &&
          key is ValueKey<String> &&
          key.value.startsWith('product_');
    });
    await waitFor(tester, productTiles);
    await tester.tap(productTiles.first);
    await waitFor(tester, find.byKey(const Key('product_price')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byKey(const Key('product_price')));
    await waitFor(tester, find.byKey(const Key('product_price_input')));
    await tester.enterText(find.byKey(const Key('product_price_input')), '12345');
    await tester.tap(find.byKey(const Key('product_price_save')));
    await waitFor(tester, find.textContaining('giờ giá 12.345đ'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(BackButton).last);
    // The menu is scrolled by now: the account card is off screen.
    await tester.pump(const Duration(milliseconds: 600));
    // "Thêm" → "Vỏ bao": three more shells go out to the customer holding
    // the most.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.ensureVisible(find.byKey(const Key('more_shells')));
    await tester.tap(find.byKey(const Key('more_shells')));
    await waitFor(tester, find.byKey(const Key('shells_total_held')));
    await tester.tap(find.text('Vựa Hải Sản Năm Căn'));
    await waitFor(tester, find.byKey(const Key('shells_out')));
    await tester.enterText(find.byKey(const Key('shells_out')), '3');
    await tester.tap(find.byKey(const Key('shells_save')));
    await waitFor(tester, find.textContaining('giao thêm 3 vỏ'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(BackButton).last);
    // "Thêm" → "Bảng công": this month's report loads from the server, and
    // so does the previous month.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.ensureVisible(find.byKey(const Key('more_shift_report')));
    await tester.tap(find.byKey(const Key('more_shift_report')));
    await waitFor(tester, find.byKey(const Key('shift_report_totals')));
    await tester.tap(find.byKey(const Key('shift_report_previous')));
    await tester.pump(const Duration(milliseconds: 300));
    await waitFor(tester, find.byKey(const Key('shift_report_totals')));
    await tester.tap(find.byType(BackButton).last);
    // The menu is scrolled by now: the account card is off screen.
    await tester.pump(const Duration(milliseconds: 600));
    // "Thêm" → "Nhân sự": the manager creates a staff account, then locks it.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.ensureVisible(find.byKey(const Key('more_staff')));
    await tester.tap(find.byKey(const Key('more_staff')));
    await waitFor(tester, find.byKey(const Key('staff_new')));
    await tester.tap(find.byKey(const Key('staff_new')));
    await waitFor(tester, find.byKey(const Key('staff_new_name')));
    await tester.enterText(
      find.byKey(const Key('staff_new_name')),
      'Nhân Viên Từ App',
    );
    await tester.enterText(
      find.byKey(const Key('staff_new_email')),
      'nv-app@rubi.local',
    );
    await tester.enterText(
      find.byKey(const Key('staff_new_password')),
      'Tam12345x',
    );
    await tester.tap(find.byKey(const Key('staff_new_save')));
    await waitFor(tester, find.textContaining('Đã tạo tài khoản'));
    await waitFor(tester, find.text('Nhân Viên Từ App'));
    await tester.tap(find.text('Nhân Viên Từ App'));
    await waitFor(tester, find.byKey(const Key('staff_lock')));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byKey(const Key('staff_lock')));
    await waitFor(tester, find.byKey(const Key('staff_confirm')));
    await tester.tap(find.byKey(const Key('staff_confirm')));
    await waitFor(tester, find.textContaining('Đã khóa Nhân Viên Từ App'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.byType(BackButton).last);
    // The menu is scrolled by now: the account card is off screen.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.ensureVisible(find.byKey(const Key('more_settle')));
    // "Thêm" → "Đối soát": the driver's delivery is settled one short.
    await tester.pump(const Duration(milliseconds: 600));
    await tester.tap(find.byKey(const Key('more_settle')));
    final delivery = find.byKey(const Key('order_$_orderId'));
    await waitFor(tester, delivery);
    await tester.tap(delivery);
    await waitFor(tester, find.byKey(const Key('settle_confirm')));
    await tester.tap(find.byTooltip(AppStrings.settleDecreaseTooltip).first);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.ensureVisible(find.byKey(const Key('settle_confirm')));
    await tester.tap(find.byKey(const Key('settle_confirm')));
    await waitFor(tester, find.textContaining('Đã chốt đơn'));
  });
}
