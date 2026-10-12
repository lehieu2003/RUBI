import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/today_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:mocktail/mocktail.dart';

class _MockTodayOrdersCubit extends Mock implements TodayOrdersCubit {}

TodayOrdersState stateWith(
  List<DeliveryOrder> orders, {
  ViewStatus status = ViewStatus.loaded,
  String? errorMessage,
  String? confirmingOrderId,
}) {
  return TodayOrdersState(
    status: status,
    orders: orders,
    errorMessage: errorMessage,
    confirmingOrderId: confirmingOrderId,
  );
}

DeliveryOrder shippingOrder(String id) => DeliveryOrder(
  id: id,
  status: OrderStatus.shipping,
  total: 120000,
  customerName: 'Khách $id',
  customerAddress: 'Địa chỉ $id',
  customerPhone: '0900000000',
  items: const [
    OrderItem(
      productName: 'đá 10kg',
      quantity: 2,
      unitPrice: 50000,
      lineTotal: 100000,
    ),
  ],
  createdAt: DateTime(2026, 10, 7, 8),
);

void main() {
  late _MockTodayOrdersCubit cubit;

  setUp(() {
    cubit = _MockTodayOrdersCubit();
    // TodayTab tự lấy cubit từ DI (factory) → test đăng ký mock thay thế.
    sl.registerFactory<TodayOrdersCubit>(() => cubit);
    when(() => cubit.load()).thenAnswer((_) async {});
    when(() => cubit.refresh()).thenAnswer((_) async {});
    // BlocProvider(create:) đóng cubit khi unmount → mock phải stub close.
    when(() => cubit.close()).thenAnswer((_) async {});
  });

  tearDown(() {
    sl.unregister<TodayOrdersCubit>();
  });

  Future<void> pumpTodayTab(WidgetTester tester) {
    return tester.pumpWidget(const MaterialApp(home: TodayTab()));
  }

  group('TodayTab', () {
    testWidgets('state loading → spinner', (tester) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: const TodayOrdersState(status: ViewStatus.loading),
      );
      await pumpTodayTab(tester);

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(DeliveryCard), findsNothing);
    });

    testWidgets('loaded rỗng → "Hôm nay chưa có đơn giao 🎉"', (tester) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpTodayTab(tester);

      expect(find.text(AppStrings.todayEmpty), findsOneWidget);
    });

    testWidgets('error (chưa có đơn) → message + bấm "Thử lại" gọi load()', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: const TodayOrdersState(
          status: ViewStatus.error,
          errorMessage: 'Không có kết nối. Vui lòng thử lại.',
        ),
      );
      await pumpTodayTab(tester);

      expect(find.text('Không có kết nối. Vui lòng thử lại.'), findsOneWidget);

      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();

      // 1 lần khi mount (create) + 1 lần bấm Thử lại.
      verify(() => cubit.load()).called(2);
    });

    testWidgets('loaded có đơn → render DeliveryCard', (tester) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith([shippingOrder('o-1')]),
      );
      await pumpTodayTab(tester);

      expect(find.text('Khách o-1'), findsOneWidget);
      expect(find.byType(DeliveryCard), findsOneWidget);
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('pull-to-refresh → gọi refresh()', (tester) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith([shippingOrder('o-1')]),
      );
      await pumpTodayTab(tester);

      final indicator = tester.widget<RefreshIndicator>(
        find.byType(RefreshIndicator),
      );
      await indicator.onRefresh();
      await tester.pump();

      verify(() => cubit.refresh()).called(1);
    });

    testWidgets('mở lại app từ nền → tải lại danh sách; chuyển xuống nền thì '
        'không', (tester) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith([shippingOrder('o-1')]),
      );
      await pumpTodayTab(tester);

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      verifyNever(() => cubit.refresh());

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      verify(() => cubit.refresh()).called(1);
    });

    testWidgets('refresh lỗi còn giữ đơn → banner lỗi + danh sách vẫn hiện', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith(
          [shippingOrder('o-1')],
          status: ViewStatus.error,
          errorMessage: 'Không có kết nối. Vui lòng thử lại.',
        ),
      );
      await pumpTodayTab(tester);

      expect(find.text('Không có kết nối. Vui lòng thử lại.'), findsOneWidget);
      expect(find.text('Khách o-1'), findsOneWidget);
    });

    testWidgets('bấm "ĐÃ GIAO" → mở sheet → Xác nhận gọi cubit.confirm', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<TodayOrdersState>.empty(),
        initialState: stateWith([shippingOrder('o-1')]),
      );
      when(() => cubit.confirm(any())).thenAnswer((_) async {});
      await pumpTodayTab(tester);

      // Mở sheet qua nút chính trên card.
      await tester.tap(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
      );
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.confirmSheetTitle), findsOneWidget);

      await tester.tap(find.text(AppStrings.confirmAction));
      await tester.pump();

      verify(() => cubit.confirm('o-1')).called(1);
    });
  });
}
