import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/screens/history_tab.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:mocktail/mocktail.dart';

class _MockHistoryCubit extends Mock implements HistoryCubit {}

// Tính NGAY LÚC ĐẦU để khớp "yesterday" mà cubit/widget tính trong lúc chạy
// test (tránh lệch nửa đêm giữa lúc build và lúc assert — same pattern
// history_cubit_test).
final DateTime _today = DateTime(
  DateTime.now().year,
  DateTime.now().month,
  DateTime.now().day,
);
final DateTime _yesterday = _today.subtract(const Duration(days: 1));

HistoryState stateWith(
  List<DeliveryOrder> orders, {
  ViewStatus status = ViewStatus.loaded,
  String? errorMessage,
  DateTime? selectedDate,
}) {
  return HistoryState(
    status: status,
    selectedDate: selectedDate ?? _yesterday,
    orders: orders,
    errorMessage: errorMessage,
  );
}

DeliveryOrder deliveredOrder(String id) => DeliveryOrder(
      id: id,
      status: OrderStatus.delivered,
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
      createdAt: DateTime(2026, 10, 6, 8),
      deliveredAt: DateTime(2026, 10, 6, 9),
    );

void main() {
  setUpAll(() {
    // DateFormat('vi') cho label ngày + test pure function.
    initializeDateFormatting();
    // selectDate(DateTime) cần fallback cho mocktail.
    registerFallbackValue(DateTime(2026, 1, 1));
  });

  late _MockHistoryCubit cubit;

  setUp(() {
    cubit = _MockHistoryCubit();
    // HistoryTab tự lấy cubit từ DI (factory) → test đăng ký mock thay thế.
    sl.registerFactory<HistoryCubit>(() => cubit);
    when(() => cubit.load()).thenAnswer((_) async {});
    when(() => cubit.selectDate(any())).thenAnswer((_) async {});
    // BlocProvider(create:) đóng cubit khi unmount → mock phải stub close.
    when(() => cubit.close()).thenAnswer((_) async {});
  });

  tearDown(() {
    sl.unregister<HistoryCubit>();
  });

  Future<void> pumpHistoryTab(WidgetTester tester) {
    return tester.pumpWidget(const MaterialApp(home: HistoryTab()));
  }

  group('HistoryTab — pure helpers', () {
    test('historyDateLabel → "Thứ Ba, 06/10/2026" (06/10/2026 là thứ Ba)', () {
      expect(historyDateLabel(DateTime(2026, 10, 6)), 'Thứ Ba, 06/10/2026');
    });

    test('historyPickerRange → firstDate = hôm nay - 30, lastDate = hôm qua '
        '(bỏ phần giờ của now)', () {
      final range = historyPickerRange(DateTime(2026, 10, 7, 15, 30));
      expect(range.firstDate, DateTime(2026, 9, 7));
      expect(range.lastDate, DateTime(2026, 10, 6));
    });
  });

  group('HistoryTab', () {
    testWidgets('mount → gọi load() 1 lần và label hiện ngày hôm qua', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpHistoryTab(tester);

      verify(() => cubit.load()).called(1);
      expect(find.text(historyDateLabel(_yesterday)), findsOneWidget);
    });

    testWidgets('state loading → spinner', (tester) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const [], status: ViewStatus.loading),
      );
      await pumpHistoryTab(tester);

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byType(DeliveryCard), findsNothing);
    });

    testWidgets('bấm "◀" → selectDate(hôm qua - 1 ngày)', (tester) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpHistoryTab(tester);

      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pump();

      final captured =
          verify(() => cubit.selectDate(captureAny())).captured.single
              as DateTime;
      expect(captured, _yesterday.subtract(const Duration(days: 1)));
    });

    testWidgets('bấm "▶" → selectDate(hôm qua + 1 ngày, cubit tự chặn)', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpHistoryTab(tester);

      await tester.tap(find.byIcon(Icons.chevron_right));
      await tester.pump();

      final captured =
          verify(() => cubit.selectDate(captureAny())).captured.single
              as DateTime;
      expect(captured, _yesterday.add(const Duration(days: 1)));
    });

    testWidgets('bấm label ngày → mở date picker với range đúng', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpHistoryTab(tester);

      await tester.tap(find.text(historyDateLabel(_yesterday)));
      await tester.pumpAndSettle();

      expect(find.byType(DatePickerDialog), findsOneWidget);
      final dialog =
          tester.widget<DatePickerDialog>(find.byType(DatePickerDialog));
      expect(dialog.initialDate, _yesterday);
      expect(dialog.firstDate, _today.subtract(const Duration(days: 30)));
      expect(dialog.lastDate, _yesterday);
    });

    testWidgets('error (chưa có đơn) → message + bấm "Thử lại" gọi load()', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(
          const [],
          status: ViewStatus.error,
          errorMessage: 'Không có kết nối. Vui lòng thử lại.',
        ),
      );
      await pumpHistoryTab(tester);

      expect(find.text('Không có kết nối. Vui lòng thử lại.'), findsOneWidget);

      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();

      // 1 lần khi mount (create) + 1 lần bấm Thử lại.
      verify(() => cubit.load()).called(2);
    });

    testWidgets(
      'chặn ngày ngoài phạm vi LẦN ĐẦU (status loading + errorMessage) → '
      'hiện message + Thử lại, KHÔNG spinner (Task 13 handoff: errorMessage '
      'render bất kể status)',
      (tester) async {
        whenListen(
          cubit,
          const Stream<HistoryState>.empty(),
          initialState: stateWith(
            const [],
            status: ViewStatus.loading,
            errorMessage: AppStrings.historyFutureDate,
          ),
        );
        await pumpHistoryTab(tester);

        expect(find.text(AppStrings.historyFutureDate), findsOneWidget);
        expect(find.text(AppStrings.retryButton), findsOneWidget);
        expect(find.byType(CircularProgressIndicator), findsNothing);
      },
    );

    testWidgets('loaded có đơn → DeliveryCard read-only (không nút thao tác)', (
      tester,
    ) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith([deliveredOrder('o-1'), deliveredOrder('o-2')]),
      );
      await pumpHistoryTab(tester);

      expect(find.byType(DeliveryCard), findsNWidgets(2));
      expect(find.text('Khách o-1'), findsOneWidget);
      // Read-only: ẨN toàn bộ nút thao tác của card.
      expect(
        find.widgetWithText(FilledButton, AppStrings.confirmDeliveredButton),
        findsNothing,
      );
      expect(find.text(AppStrings.callButton), findsNothing);
      expect(find.text(AppStrings.directionsButton), findsNothing);
    });

    testWidgets('loaded rỗng → "Không có đơn trong ngày này"', (tester) async {
      whenListen(
        cubit,
        const Stream<HistoryState>.empty(),
        initialState: stateWith(const []),
      );
      await pumpHistoryTab(tester);

      expect(find.text(AppStrings.historyNoOrders), findsOneWidget);
    });

    testWidgets(
      'errorMessage kèm đơn còn (chặn range khi đang xem ngày khác) → '
      'banner lỗi + danh sách vẫn hiện (Task 13 handoff)',
      (tester) async {
        whenListen(
          cubit,
          const Stream<HistoryState>.empty(),
          initialState: stateWith(
            [deliveredOrder('o-1')],
            errorMessage: AppStrings.historyRangeLimit,
          ),
        );
        await pumpHistoryTab(tester);

        expect(find.text(AppStrings.historyRangeLimit), findsOneWidget);
        expect(find.text('Khách o-1'), findsOneWidget);
      },
    );
  });
}
