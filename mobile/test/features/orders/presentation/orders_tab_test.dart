import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/order_entry_repository.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/orders_repository.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/order_entry_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/order_entry_screen.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/orders_tab.dart';
import 'package:mocktail/mocktail.dart';

import 'order_entry_fixtures.dart';
import 'orders_fixtures.dart';

class _MockOrdersRepository extends Mock implements OrdersRepository {}

class _MockEntryRepo extends Mock implements OrderEntryRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(const PageParams());
    registerFallbackValue(const OrderFilter());
    registerFallbackValue(OfficeOrderStatus.pending);
  });

  late _MockOrdersRepository repo;

  void stubOrders(List<OfficeOrder> orders, {int totalPages = 1}) {
    when(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    ).thenAnswer((_) async => Ok(pageOf(orders, totalPages: totalPages)));
  }

  void stubChangeStatus(Result<OfficeOrderStatus> result) {
    when(
      () => repo.changeStatus(
        orderId: any(named: 'orderId'),
        status: any(named: 'status'),
        cancellationReason: any(named: 'cancellationReason'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockOrdersRepository();
    sl.registerFactory<OrdersCubit>(() => OrdersCubit(repo: repo));
    stubOrders([
      buildOrder('order-aaa111'),
      buildOrder(
        'order-bbb222',
        status: OfficeOrderStatus.shipping,
        customerName: 'Bar Minh',
        driverName: 'Nguyễn Văn Tài',
        notes: 'Giao cổng sau',
      ),
    ]);
    when(() => repo.getCounts(filter: any(named: 'filter')))
        .thenAnswer((_) async => const Ok(counts));
    when(() => repo.getDrivers()).thenAnswer((_) async => const Ok([tai]));
  });

  tearDown(() => sl.unregister<OrdersCubit>());

  Future<void> pumpTab(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: OrdersTab()));
    await tester.pump();
  }

  Finder card(String id) => find.byKey(Key('order_$id'));

  Future<void> openOrder(WidgetTester tester, String id) async {
    await tester.tap(card(id));
    await tester.pumpAndSettle();
  }

  group('OrdersTab — danh sách', () {
    testWidgets('mỗi đơn: mã, khách, hàng, tổng tiền, tài xế', (tester) async {
      await pumpTab(tester);

      final first = card('order-aaa111');
      expect(
        find.descendant(of: first, matching: find.textContaining('DH-AAA111')),
        findsOneWidget,
      );
      expect(find.descendant(of: first, matching: find.text('Quán Cô Ba')), findsOneWidget);
      expect(
        find.descendant(of: first, matching: find.text('Đá viên 5kg × 10')),
        findsOneWidget,
      );
      expect(find.descendant(of: first, matching: find.text('250.000đ')), findsOneWidget);
      expect(
        find.descendant(of: first, matching: find.text(AppStrings.orderUnassigned)),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: card('order-bbb222'),
          matching: find.text(AppStrings.orderDriver('Nguyễn Văn Tài')),
        ),
        findsOneWidget,
      );
    });

    testWidgets('tab trạng thái có số đơn; bấm tab → hỏi server trạng thái đó',
        (tester) async {
      await pumpTab(tester);

      expect(find.text('${AppStrings.ordersTabAll} (9)'), findsOneWidget);
      expect(
        find.text('${AppStrings.orderStatusLabel('PENDING')} (3)'),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const Key('orders_tab_SHIPPING')));
      await tester.pump();
      await tester.pump();

      verify(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: OfficeOrderStatus.shipping,
          page: any(named: 'page'),
        ),
      ).called(1);
    });

    testWidgets('gõ tìm kiếm → chờ ngừng gõ rồi mới hỏi server', (tester) async {
      await pumpTab(tester);

      await tester.enterText(find.byKey(const Key('orders_search')), 'cô');
      await tester.enterText(find.byKey(const Key('orders_search')), 'cô ba');
      await tester.pump(const Duration(milliseconds: 100));
      verifyNever(() => repo.getCounts(filter: const OrderFilter(search: 'cô ba')));

      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump();

      verify(() => repo.getCounts(filter: const OrderFilter(search: 'cô ba')))
          .called(1);
      verifyNever(() => repo.getCounts(filter: const OrderFilter(search: 'cô')));
    });

    testWidgets('không có đơn → câu báo', (tester) async {
      stubOrders([]);
      await pumpTab(tester);

      expect(find.text(AppStrings.ordersEmpty), findsOneWidget);
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: any(named: 'page'),
        ),
      ).thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpTab(tester);

      expect(find.text(FailureMessages.network), findsOneWidget);
      stubOrders([buildOrder('order-aaa111')]);
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();
      await tester.pump();

      expect(card('order-aaa111'), findsOneWidget);
    });

    testWidgets('còn trang sau → "Xem thêm" nối đơn vào cuối', (tester) async {
      stubOrders([buildOrder('order-aaa111')], totalPages: 2);
      await pumpTab(tester);
      when(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: const PageParams(page: 2, limit: 20),
        ),
      ).thenAnswer(
        (_) async => Ok(
          pageOf([buildOrder('order-ccc333')], page: 2, totalPages: 2),
        ),
      );

      await tester.tap(find.byKey(const Key('orders_load_more')));
      await tester.pump();
      await tester.pump();

      expect(card('order-aaa111'), findsOneWidget);
      expect(card('order-ccc333'), findsOneWidget);
      expect(find.byKey(const Key('orders_load_more')), findsNothing);
    });
  });

  group('OrdersTab — chi tiết và thao tác', () {
    testWidgets('đơn chờ giao chưa có tài xế: gán, cho đi giao, huỷ',
        (tester) async {
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');

      expect(find.text('Quán Cô Ba (KH001)'), findsOneWidget);
      expect(find.text('12 Nguyễn Trãi, Q.1'), findsOneWidget);
      expect(find.text(AppStrings.orderAssignButton), findsOneWidget);
      expect(find.byKey(const Key('order_send_out')), findsOneWidget);
      expect(find.byKey(const Key('order_cancel')), findsOneWidget);
      expect(find.byKey(const Key('order_mark_delivered')), findsNothing);
    });

    testWidgets('đơn đang giao: đổi tài xế, đã giao, về chờ giao; có ghi chú',
        (tester) async {
      await pumpTab(tester);
      await openOrder(tester, 'order-bbb222');

      expect(find.text(AppStrings.orderReassignButton), findsOneWidget);
      expect(find.byKey(const Key('order_mark_delivered')), findsOneWidget);
      expect(find.byKey(const Key('order_back_to_pending')), findsOneWidget);
      expect(find.byKey(const Key('order_send_out')), findsNothing);
      expect(
        find.text('${AppStrings.orderNotesLabel}: Giao cổng sau'),
        findsOneWidget,
      );
    });

    testWidgets('đơn đã giao: chờ đối soát, chỉ còn huỷ; đơn đã xong: chỉ xem',
        (tester) async {
      stubOrders([
        buildOrder('order-ddd444', status: OfficeOrderStatus.delivered),
        buildOrder('order-eee555', status: OfficeOrderStatus.completed),
      ]);
      await pumpTab(tester);

      await openOrder(tester, 'order-ddd444');
      expect(find.text(AppStrings.orderSettleHint), findsOneWidget);
      expect(find.byKey(const Key('order_assign')), findsNothing);
      expect(find.byKey(const Key('order_cancel')), findsOneWidget);
      Navigator.of(tester.element(find.text(AppStrings.orderSettleHint))).pop();
      await tester.pumpAndSettle();

      await openOrder(tester, 'order-eee555');
      expect(find.byKey(const Key('order_assign')), findsNothing);
      expect(find.byKey(const Key('order_cancel')), findsNothing);
      expect(find.text(AppStrings.orderSettleHint), findsNothing);
    });

    testWidgets('gán tài xế: chọn trong danh sách → gán và báo tên',
        (tester) async {
      when(
        () => repo.assignDriver(
          orderIds: any(named: 'orderIds'),
          driverId: any(named: 'driverId'),
        ),
      ).thenAnswer((_) async => const Ok(1));
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');

      await tester.tap(find.byKey(const Key('order_assign')));
      await tester.pumpAndSettle();
      expect(find.text('0911222333'), findsOneWidget);
      await tester.tap(find.byKey(const Key('driver_drv-1')));
      await tester.pumpAndSettle();

      verify(
        () => repo.assignDriver(orderIds: ['order-aaa111'], driverId: 'drv-1'),
      ).called(1);
      expect(find.text(AppStrings.orderAssigned('Nguyễn Văn Tài')), findsOneWidget);
      expect(find.byKey(const Key('order_assign')), findsNothing);
    });

    testWidgets('không có tài xế nào / không tải được → câu báo trong hộp chọn',
        (tester) async {
      when(() => repo.getDrivers()).thenAnswer((_) async => const Ok([]));
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');
      await tester.tap(find.byKey(const Key('order_assign')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.orderNoDrivers), findsOneWidget);
      await tester.tap(find.text(AppStrings.cancelButton));
      await tester.pumpAndSettle();

      when(() => repo.getDrivers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await tester.tap(find.byKey(const Key('order_assign')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.orderDriversFailed), findsOneWidget);
    });

    testWidgets('cho đi giao → đổi trạng thái và báo kết quả', (tester) async {
      stubChangeStatus(const Ok(OfficeOrderStatus.shipping));
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');

      await tester.tap(find.byKey(const Key('order_send_out')));
      await tester.pumpAndSettle();

      verify(
        () => repo.changeStatus(
          orderId: 'order-aaa111',
          status: OfficeOrderStatus.shipping,
          cancellationReason: null,
        ),
      ).called(1);
      expect(
        find.text(
          AppStrings.orderStatusChanged(
            'DH-AAA111',
            AppStrings.orderStatusLabel('SHIPPING'),
          ),
        ),
        findsOneWidget,
      );
    });

    testWidgets('server từ chối → báo câu của server', (tester) async {
      stubChangeStatus(const Err(ServerFailure('Không đủ tồn kho')));
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');

      await tester.tap(find.byKey(const Key('order_send_out')));
      await tester.pumpAndSettle();

      expect(find.text('Không đủ tồn kho'), findsOneWidget);
    });

    testWidgets('huỷ đơn: bắt buộc có lý do, rồi gửi kèm lý do', (tester) async {
      stubChangeStatus(const Ok(OfficeOrderStatus.cancelled));
      await pumpTab(tester);
      await openOrder(tester, 'order-aaa111');

      await tester.tap(find.byKey(const Key('order_cancel')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('order_cancel_confirm')));
      await tester.pump();
      expect(find.text(AppStrings.orderCancelReasonRequired), findsOneWidget);
      verifyNever(
        () => repo.changeStatus(
          orderId: any(named: 'orderId'),
          status: any(named: 'status'),
          cancellationReason: any(named: 'cancellationReason'),
        ),
      );

      await tester.enterText(
        find.byKey(const Key('order_cancel_reason')),
        ' Khách đổi ý ',
      );
      await tester.tap(find.byKey(const Key('order_cancel_confirm')));
      await tester.pumpAndSettle();

      verify(
        () => repo.changeStatus(
          orderId: 'order-aaa111',
          status: OfficeOrderStatus.cancelled,
          cancellationReason: 'Khách đổi ý',
        ),
      ).called(1);
    });
  });

  testWidgets('"Lên đơn" → mở màn lên đơn; lưu xong thì báo mã đơn và tải lại',
      (tester) async {
    final entryRepo = _MockEntryRepo();
    when(() => entryRepo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    when(() => entryRepo.getPriceList(any())).thenAnswer((_) async => const Ok(priceList));
    when(
      () => entryRepo.createOrder(
        customerId: any(named: 'customerId'),
        quantities: any(named: 'quantities'),
        notes: any(named: 'notes'),
      ),
    ).thenAnswer((_) async => const Ok(created));
    sl.registerFactory<OrderEntryCubit>(() => OrderEntryCubit(repo: entryRepo));
    addTearDown(() => sl.unregister<OrderEntryCubit>());
    await pumpTab(tester);
    clearInteractions(repo);

    await tester.tap(find.byKey(const Key('orders_new')));
    await tester.pumpAndSettle();
    expect(find.byType(OrderEntryScreen), findsOneWidget);
    await tester.tap(find.byKey(const Key('order_entry_customer_c-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('order_entry_plus_p-1')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('order_entry_save')));
    await tester.pumpAndSettle();

    expect(find.byType(OrderEntryScreen), findsNothing);
    expect(
      find.text(AppStrings.orderEntrySaved('DH-ABC123', '36.000đ')),
      findsOneWidget,
    );
    verify(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    ).called(1);
  });

  testWidgets('thoát màn lên đơn giữa chừng → không báo gì, không tải lại',
      (tester) async {
    final entryRepo = _MockEntryRepo();
    when(() => entryRepo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    sl.registerFactory<OrderEntryCubit>(() => OrderEntryCubit(repo: entryRepo));
    addTearDown(() => sl.unregister<OrderEntryCubit>());
    await pumpTab(tester);
    clearInteractions(repo);

    await tester.tap(find.byKey(const Key('orders_new')));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsNothing);
    verifyNever(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    );
  });

  testWidgets('màn hình 360dp, tên dài → không overflow (danh sách và chi tiết)',
      (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    stubOrders([
      buildOrder(
        'order-fff666',
        status: OfficeOrderStatus.shipping,
        customerName: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia Phú Mỹ Hưng ' * 2,
        driverName: 'Nguyễn Hoàng Thiên Phúc Bảo Long',
        notes: 'Giao cổng sau, gọi trước 10 phút, ' * 8,
      ),
    ]);
    await pumpTab(tester);
    expect(tester.takeException(), isNull);

    await openOrder(tester, 'order-fff666');
    expect(tester.takeException(), isNull);
  });
}
