import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/confirm_sheet.dart';
import 'package:mocktail/mocktail.dart';

class _MockTodayOrdersCubit extends Mock implements TodayOrdersCubit {}

DeliveryOrder order({OrderStatus status = OrderStatus.shipping}) =>
    DeliveryOrder(
      id: 'o-1',
      status: status,
      total: 120000,
      customerName: 'Nguyễn Văn A',
      customerAddress: '123 Lê Lợi',
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
  var confirmedCount = 0;

  setUp(() {
    cubit = _MockTodayOrdersCubit();
    confirmedCount = 0;
  });

  Future<void> pumpHost(
    WidgetTester tester, {
    required TodayOrdersState initialState,
  }) {
    whenListen(cubit, const Stream<TodayOrdersState>.empty(),
        initialState: initialState);
    return tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<TodayOrdersCubit>.value(
          value: cubit,
          child: Scaffold(
            body: Builder(
              builder: (context) => Center(
                child: FilledButton(
                  onPressed: () => showConfirmSheet(
                    context,
                    order: order(),
                    onConfirmed: () => confirmedCount++,
                  ),
                  child: const Text('open'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> openSheet(WidgetTester tester) async {
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.confirmSheetTitle), findsOneWidget);
    expect(
      find.text(AppStrings.confirmSheetBody('Nguyễn Văn A')),
      findsOneWidget,
    );
  }

  testWidgets('bấm Xác nhận → gọi cubit.confirm(order.id)', (tester) async {
    when(() => cubit.confirm(any())).thenAnswer((_) async {});
    await pumpHost(tester, initialState: TodayOrdersState(
      status: ViewStatus.loaded,
      orders: [order()],
    ));
    await openSheet(tester);

    await tester.tap(find.text(AppStrings.confirmAction));
    await tester.pump();

    verify(() => cubit.confirm('o-1')).called(1);
  });

  testWidgets('thành công → pop sheet + SnackBar + gọi onConfirmed', (
    tester,
  ) async {
    when(() => cubit.confirm(any())).thenAnswer((_) async {});
    // Đơn trong state MỚI đã delivered → sheet coi là thành công.
    await pumpHost(
      tester,
      initialState: TodayOrdersState(
        status: ViewStatus.loaded,
        orders: [order(status: OrderStatus.delivered)],
      ),
    );
    await openSheet(tester);

    await tester.tap(find.text(AppStrings.confirmAction));
    await tester.pumpAndSettle();

    // Sheet đã đóng.
    expect(find.text(AppStrings.confirmSheetTitle), findsNothing);
    // SnackBar thành công.
    expect(find.text(AppStrings.confirmedSnack), findsOneWidget);
    expect(confirmedCount, 1);

    // Dọn SnackBar (timer 4s) trước khi kết thúc test.
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
  });

  testWidgets('thất bại → sheet MỞ, hiện errorMessage của cubit', (
    tester,
  ) async {
    when(() => cubit.confirm(any())).thenAnswer((_) async {});
    await pumpHost(
      tester,
      initialState: const TodayOrdersState(
        status: ViewStatus.loaded,
        errorMessage: 'Không có kết nối. Vui lòng thử lại.',
      ),
    );
    await openSheet(tester);

    await tester.tap(find.text(AppStrings.confirmAction));
    await tester.pump();

    // Sheet vẫn mở.
    expect(find.text(AppStrings.confirmSheetTitle), findsOneWidget);
    // Lỗi của cubit hiển thị trong sheet.
    expect(
      find.text('Không có kết nối. Vui lòng thử lại.'),
      findsOneWidget,
    );
    // Nút bật lại cho phép thử lần nữa.
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, AppStrings.confirmAction),
    );
    expect(button.onPressed, isNotNull);
  });

  testWidgets('đang chờ kết quả → nút Xác nhận disabled + spinner', (
    tester,
  ) async {
    final pending = Completer<void>();
    when(() => cubit.confirm(any())).thenAnswer((_) => pending.future);
    await pumpHost(
      tester,
      initialState: TodayOrdersState(
        status: ViewStatus.loaded,
        orders: [order(status: OrderStatus.delivered)],
      ),
    );
    await openSheet(tester);

    await tester.tap(find.text(AppStrings.confirmAction));
    await tester.pump();

    // Đang chờ → label đổi thành spinner. Sheet có một FilledButton riêng
    // (trang chủ có nút "open") nên phải scope finder vào trong sheet.
    final button = tester.widget<FilledButton>(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.byType(FilledButton),
      ),
    );
    expect(button.onPressed, isNull);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Hoàn tất để sheet đóng gọn gàng trước khi kết thúc test.
    pending.complete();
    await tester.pumpAndSettle();
  });
}
