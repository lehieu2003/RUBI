import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/order_entry_repository.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/order_entry_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/order_entry_screen.dart';
import 'package:mocktail/mocktail.dart';

import 'order_entry_fixtures.dart';

class _MockRepo extends Mock implements OrderEntryRepository {}

void main() {
  late _MockRepo repo;
  CreatedOrder? popped;

  void stubCreate(Result<CreatedOrder> result) {
    when(
      () => repo.createOrder(
        customerId: any(named: 'customerId'),
        quantities: any(named: 'quantities'),
        notes: any(named: 'notes'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockRepo();
    popped = null;
    sl.registerFactory<OrderEntryCubit>(() => OrderEntryCubit(repo: repo));
    when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    when(() => repo.getPriceList(any())).thenAnswer((_) async => const Ok(priceList));
  });

  tearDown(() => sl.unregister<OrderEntryCubit>());

  /// Mở màn lên đơn từ một màn khác, để bắt được kết quả khi nó đóng lại.
  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async {
                popped = await Navigator.of(context).push<CreatedOrder>(
                  MaterialPageRoute(builder: (_) => const OrderEntryScreen()),
                );
              },
              child: const Text('mở'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('mở'));
    await tester.pumpAndSettle();
  }

  Future<void> pickGioBien(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('order_entry_customer_c-1')));
    await tester.pumpAndSettle();
  }

  Finder product(String id) => find.byKey(Key('order_entry_product_$id'));
  String total(WidgetTester tester) =>
      tester.widget<Text>(find.byKey(const Key('order_entry_total'))).data!;
  bool saveEnabled(WidgetTester tester) =>
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed != null;

  group('chọn khách', () {
    testWidgets('liệt kê khách với mã và số điện thoại; ô tìm sẵn con trỏ',
        (tester) async {
      await pumpScreen(tester);

      expect(find.text(AppStrings.orderEntryPickCustomer), findsOneWidget);
      expect(find.text('Quán Nhậu Gió Biển'), findsOneWidget);
      expect(
        find.text('KH-001 · 0908123456 · 45 Đường Số 7, Thủ Đức'),
        findsOneWidget,
      );
      expect(find.text('KH-002 · 0911222333'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('order_entry_customer_search')))
            .autofocus,
        isTrue,
      );
    });

    testWidgets('gõ không dấu → lọc ngay, không gọi server thêm', (tester) async {
      await pumpScreen(tester);

      await tester.enterText(
        find.byKey(const Key('order_entry_customer_search')),
        'minh tam',
      );
      await tester.pump();

      expect(find.text('Đại Lý Nước Ngọt Minh Tâm'), findsOneWidget);
      expect(find.text('Quán Nhậu Gió Biển'), findsNothing);
      verify(() => repo.getCustomers()).called(1);

      await tester.enterText(
        find.byKey(const Key('order_entry_customer_search')),
        'zzz',
      );
      await tester.pump();
      expect(find.text(AppStrings.orderEntryNoCustomers), findsOneWidget);
    });

    testWidgets('tải khách lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getCustomers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(find.text('Quán Nhậu Gió Biển'), findsOneWidget);
    });
  });

  group('nhập đơn', () {
    testWidgets('chọn khách → sản phẩm với giá của khách và số còn bán được',
        (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);

      expect(find.text('Quán Nhậu Gió Biển (KH-001)'), findsOneWidget);
      expect(
        find.descendant(of: product('p-1'), matching: find.text('Đá Bi 5kg')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: product('p-1'),
          matching: find.textContaining('12.000đ/Bao · Còn 145', findRichText: true),
        ),
        findsOneWidget,
      );
      expect(total(tester), '0đ');
      expect(saveEnabled(tester), isFalse);
    });

    testWidgets('sản phẩm chưa có giá → báo rõ và khoá ô số lượng',
        (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);

      expect(
        find.descendant(
          of: product('p-3'),
          matching: find.text(AppStrings.orderEntryNoPrice),
        ),
        findsOneWidget,
      );
      expect(
        tester.widget<TextField>(find.byKey(const Key('order_entry_qty_p-3'))).enabled,
        isFalse,
      );
      expect(
        tester
            .widget<IconButton>(find.byKey(const Key('order_entry_plus_p-3')))
            .onPressed,
        isNull,
      );
    });

    testWidgets('gõ số lượng và bấm tăng / giảm → tạm tính đổi theo',
        (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);

      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '20');
      await tester.pump();
      expect(total(tester), '240.000đ');
      expect(find.text(AppStrings.orderEntryTotal(1)), findsOneWidget);

      await tester.tap(find.byKey(const Key('order_entry_plus_p-2')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('order_entry_plus_p-2')));
      await tester.pump();
      expect(total(tester), '284.000đ');
      expect(
        tester
            .widget<TextField>(find.byKey(const Key('order_entry_qty_p-2')))
            .controller!
            .text,
        '2',
      );

      await tester.tap(find.byKey(const Key('order_entry_minus_p-2')));
      await tester.pump();
      expect(total(tester), '262.000đ');
      expect(saveEnabled(tester), isTrue);
    });

    testWidgets('xoá trắng ô số lượng → bỏ dòng', (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);

      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '5');
      await tester.pump();
      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '');
      await tester.pump();

      expect(total(tester), '0đ');
      expect(saveEnabled(tester), isFalse);
    });

    testWidgets('đổi khách → về bước chọn khách', (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.tap(find.byKey(const Key('order_entry_change_customer')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('order_entry_customer_search')), findsOneWidget);
      expect(find.byKey(const Key('order_entry_save')), findsNothing);
    });

    testWidgets('bảng giá lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getPriceList(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpScreen(tester);
      await pickGioBien(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getPriceList(any())).thenAnswer((_) async => const Ok(priceList));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(product('p-1'), findsOneWidget);
    });
  });

  group('lưu đơn', () {
    testWidgets('lưu → gửi số lượng và ghi chú, đóng màn với đơn vừa lên',
        (tester) async {
      stubCreate(const Ok(created));
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '3');
      await tester.enterText(
        find.byKey(const Key('order_entry_notes')),
        'Giao cổng sau',
      );
      await tester.pump();

      await tester.tap(find.byKey(const Key('order_entry_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.createOrder(
          customerId: 'c-1',
          quantities: {'p-1': 3},
          notes: 'Giao cổng sau',
        ),
      ).called(1);
      expect(popped, created);
      expect(find.byType(OrderEntryScreen), findsNothing);
    });

    testWidgets('server từ chối → ở lại màn, hiện câu của server, giữ số đã nhập',
        (tester) async {
      stubCreate(const Err(ServerFailure('Có sản phẩm đã ngừng bán')));
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '3');
      await tester.pump();

      await tester.tap(find.byKey(const Key('order_entry_save')));
      await tester.pumpAndSettle();

      expect(find.text('Có sản phẩm đã ngừng bán'), findsOneWidget);
      expect(find.byType(OrderEntryScreen), findsOneWidget);
      expect(total(tester), '36.000đ');
      expect(popped, isNull);
    });

    testWidgets('rớt mạng → nhắc xem lại danh sách đơn kẻo trùng', (tester) async {
      stubCreate(const Err(NetworkFailure()));
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.tap(find.byKey(const Key('order_entry_plus_p-1')));
      await tester.pump();

      await tester.tap(find.byKey(const Key('order_entry_save')));
      await tester.pumpAndSettle();

      expect(find.text(AppStrings.orderEntryUnsure), findsOneWidget);
    });
  });

  group('thoát giữa chừng', () {
    testWidgets('chưa nhập gì → thoát luôn, không hỏi', (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();

      expect(find.byType(OrderEntryScreen), findsNothing);
      expect(find.text(AppStrings.orderEntryLeaveTitle), findsNothing);
    });

    testWidgets('đã nhập số lượng → hỏi lại; "Ở lại" giữ nguyên đơn đang nhập',
        (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '3');
      await tester.pump();

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.orderEntryLeaveTitle), findsOneWidget);

      await tester.tap(find.byKey(const Key('order_entry_stay')));
      await tester.pumpAndSettle();
      expect(find.byType(OrderEntryScreen), findsOneWidget);
      expect(total(tester), '36.000đ');
    });

    testWidgets('"Bỏ đơn" → đóng màn, không lên đơn nào', (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.tap(find.byKey(const Key('order_entry_plus_p-1')));
      await tester.pump();

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('order_entry_leave')));
      await tester.pumpAndSettle();

      expect(find.byType(OrderEntryScreen), findsNothing);
      expect(popped, isNull);
      verifyNever(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
        ),
      );
    });

    testWidgets('nút quay lại của máy cũng bị hỏi', (tester) async {
      await pumpScreen(tester);
      await pickGioBien(tester);
      await tester.tap(find.byKey(const Key('order_entry_plus_p-1')));
      await tester.pump();

      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();

      expect(find.text(AppStrings.orderEntryLeaveTitle), findsOneWidget);
      expect(find.byType(OrderEntryScreen), findsOneWidget);
    });
  });

  testWidgets('màn hình 360dp, tên dài, đặt quá số còn bán được → không overflow',
      (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    const long = CustomerOption(
      id: 'c-1',
      code: 'KH-001',
      name: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia Phú Mỹ Hưng Quận Bảy',
      address: 'Số 1 đại lộ Nguyễn Văn Linh, phường Tân Phong, Quận 7, TP.HCM',
      phone: '0908123456',
    );
    when(() => repo.getCustomers()).thenAnswer((_) async => const Ok([long]));
    when(() => repo.getPriceList(any())).thenAnswer(
      (_) async => const Ok([
        PricedProduct(
          productId: 'p-1',
          name: 'Đá viên tinh khiết loại đặc biệt cho nhà hàng',
          sizeKg: 10,
          unit: 'Bao',
          price: 1250000,
          sellable: 2,
        ),
      ]),
    );
    stubCreate(const Err(NetworkFailure()));
    await pumpScreen(tester);
    expect(tester.takeException(), isNull);

    await pickGioBien(tester);
    await tester.enterText(find.byKey(const Key('order_entry_qty_p-1')), '9999');
    await tester.pump();
    await tester.tap(find.byKey(const Key('order_entry_save')));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.orderEntryUnsure), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
