import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/orders_repository.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
import 'package:iceflow_mobile/features/orders/presentation/screens/settlement_screen.dart';
import 'package:mocktail/mocktail.dart';

import 'orders_fixtures.dart';

class _MockOrdersRepository extends Mock implements OrdersRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(const PageParams());
    registerFallbackValue(const OrderFilter());
    registerFallbackValue(OfficeOrderStatus.pending);
    registerFallbackValue(buildOrder('fallback'));
  });

  late _MockOrdersRepository repo;

  final delivered = buildOrder(
    'order-aaa111',
    status: OfficeOrderStatus.delivered,
    driverName: 'Nguyễn Văn Tài',
  );

  void stubOrders(List<OfficeOrder> orders) {
    when(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    ).thenAnswer((_) async => Ok(pageOf(orders)));
  }

  void stubSettle(Result<void> result) {
    when(
      () => repo.settle(
        order: any(named: 'order'),
        actualQty: any(named: 'actualQty'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockOrdersRepository();
    sl.registerFactory<OrdersCubit>(() => OrdersCubit(repo: repo));
    stubOrders([delivered]);
    when(() => repo.getCounts(filter: any(named: 'filter')))
        .thenAnswer((_) async => const Ok(counts));
  });

  tearDown(() => sl.unregister<OrdersCubit>());

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: SettlementScreen()));
    await tester.pump();
  }

  Future<void> openOrder(WidgetTester tester) async {
    await tester.tap(find.byKey(const Key('order_order-aaa111')));
    await tester.pumpAndSettle();
  }

  String text(WidgetTester tester, String key) =>
      tester.widget<Text>(find.byKey(Key(key))).data!;
  String qty(WidgetTester tester, String lineId) => tester
      .widget<TextField>(find.byKey(Key('settle_qty_$lineId')))
      .controller!
      .text;

  testWidgets('chỉ hỏi server các đơn đã giao; hiện số đơn đang chờ',
      (tester) async {
    await pumpScreen(tester);

    verify(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: OfficeOrderStatus.delivered,
        page: any(named: 'page'),
      ),
    ).called(1);
    verifyNever(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: null,
        page: any(named: 'page'),
      ),
    );
    expect(text(tester, 'settle_count'), AppStrings.settlePendingCount(1));
    expect(find.text('Quán Cô Ba'), findsOneWidget);
  });

  testWidgets('không có đơn nào → câu báo; tải lỗi → Thử lại', (tester) async {
    stubOrders([]);
    await pumpScreen(tester);
    expect(find.text(AppStrings.settleEmpty), findsOneWidget);

    when(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    ).thenAnswer((_) async => const Err(NetworkFailure()));
    await pumpScreen(tester);
    await tester.pumpWidget(const SizedBox());
    await pumpScreen(tester);
    expect(find.text(FailureMessages.network), findsOneWidget);
    expect(find.text(AppStrings.retryButton), findsOneWidget);
  });

  testWidgets('mở đơn: số thực giao bằng số đặt, ghi nợ bằng tổng đơn',
      (tester) async {
    await pumpScreen(tester);
    await openOrder(tester);

    expect(find.text('Đá viên 5kg'), findsOneWidget);
    expect(find.text(AppStrings.settleOrdered(10, '25.000đ')), findsOneWidget);
    expect(qty(tester, 'line-1'), '10');
    expect(text(tester, 'settle_debt'), '250.000đ');
  });

  testWidgets('giảm / tăng số thực giao → ghi nợ tính lại; không xuống dưới 0',
      (tester) async {
    stubOrders([
      OfficeOrder(
        id: 'order-aaa111',
        status: OfficeOrderStatus.delivered,
        total: 25000,
        createdAt: DateTime(2026, 10, 12, 8),
        customerName: 'Quán Cô Ba',
        customerCode: 'KH001',
        customerAddress: '',
        customerPhone: '',
        lines: const [
          OrderLine(
            id: 'line-1',
            productName: 'Đá viên',
            sizeKg: 5,
            unit: 'bao',
            quantity: 1,
            unitPrice: 25000,
            lineTotal: 25000,
          ),
        ],
      ),
    ]);
    await pumpScreen(tester);
    await openOrder(tester);

    await tester.tap(find.byKey(const Key('settle_plus_line-1')));
    await tester.pump();
    expect(qty(tester, 'line-1'), '2');
    expect(text(tester, 'settle_debt'), '50.000đ');

    await tester.tap(find.byKey(const Key('settle_minus_line-1')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('settle_minus_line-1')));
    await tester.pump();
    expect(qty(tester, 'line-1'), '0');
    expect(text(tester, 'settle_debt'), '0đ');
    expect(
      tester
          .widget<IconButton>(find.byKey(const Key('settle_minus_line-1')))
          .onPressed,
      isNull,
    );
  });

  testWidgets('gõ thẳng số thực giao → ghi nợ tính lại; xoá trắng là 0',
      (tester) async {
    stubSettle(const Ok<void>(null));
    await pumpScreen(tester);
    await openOrder(tester);

    await tester.enterText(find.byKey(const Key('settle_qty_line-1')), '7');
    await tester.pump();
    expect(text(tester, 'settle_debt'), '175.000đ');

    await tester.enterText(find.byKey(const Key('settle_qty_line-1')), '');
    await tester.pump();
    expect(text(tester, 'settle_debt'), '0đ');

    await tester.enterText(find.byKey(const Key('settle_qty_line-1')), '12');
    await tester.pump();
    await tester.tap(find.byKey(const Key('settle_confirm')));
    await tester.pumpAndSettle();

    verify(() => repo.settle(order: delivered, actualQty: {'line-1': 12}))
        .called(1);
  });

  testWidgets('chốt thiếu một bao → gửi đúng số thực giao và báo đã chốt',
      (tester) async {
    stubSettle(const Ok<void>(null));
    await pumpScreen(tester);
    await openOrder(tester);

    await tester.tap(find.byKey(const Key('settle_minus_line-1')));
    await tester.pump();
    expect(text(tester, 'settle_debt'), '225.000đ');
    await tester.tap(find.byKey(const Key('settle_confirm')));
    await tester.pumpAndSettle();

    verify(() => repo.settle(order: delivered, actualQty: {'line-1': 9}))
        .called(1);
    expect(find.text(AppStrings.settleDone('DH-AAA111')), findsOneWidget);
    expect(find.byKey(const Key('settle_confirm')), findsNothing);
  });

  testWidgets('FL-5: server từ chối hoặc lỗi mạng → ở lại sheet, báo lỗi, giữ nguyên số đã nhập', (tester) async {
    stubSettle(const Err<void>(ServerFailure('Chỉ đối soát được đơn đã giao')));
    await pumpScreen(tester);
    await openOrder(tester);

    // Người dùng chỉnh sửa số lượng
    await tester.enterText(find.byKey(const Key('settle_qty_line-1')), '7');
    await tester.pump();
    expect(qty(tester, 'line-1'), '7');

    await tester.tap(find.byKey(const Key('settle_confirm')));
    await tester.pumpAndSettle();

    // Báo lỗi của server
    expect(find.text('Chỉ đối soát được đơn đã giao'), findsOneWidget);
    // Sheet KHÔNG bị đóng, nút confirm và số lượng đã nhập vẫn còn nguyên
    expect(find.byKey(const Key('settle_confirm')), findsOneWidget);
    expect(qty(tester, 'line-1'), '7');
  });

  testWidgets('màn hình 360dp, tên dài → không overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    stubOrders([
      buildOrder(
        'order-aaa111',
        status: OfficeOrderStatus.delivered,
        customerName: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia Phú Mỹ Hưng ' * 2,
        driverName: 'Nguyễn Hoàng Thiên Phúc Bảo Long',
      ),
    ]);
    await pumpScreen(tester);
    await openOrder(tester);

    expect(tester.takeException(), isNull);
  });
}
