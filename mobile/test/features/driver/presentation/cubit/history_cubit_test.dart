import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockGetOrdersForDate extends Mock implements GetOrdersForDateUseCase {}

void main() {
  setUpAll(() {
    registerFallbackValue(DateTime(2026, 1, 1));
  });

  DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

  DeliveryOrder order(String id) => DeliveryOrder(
        id: id,
        status: OrderStatus.delivered,
        total: 25000,
        customerName: 'KH $id',
        customerAddress: 'Địa chỉ $id',
        customerPhone: '0900000000',
        items: const [],
        createdAt: DateTime(2026, 10, 6, 8),
        deliveredAt: DateTime(2026, 10, 6, 9),
      );

  // Tính NGAY LÚC ĐẦU để khớp "yesterday" cubit dùng lúc khởi tạo (tránh
  // lệch nửa đêm giữa lúc build và lúc assert).
  final today = dateOnly(DateTime.now());
  final yesterday = today.subtract(const Duration(days: 1));

  late _MockGetOrdersForDate getOrders;

  setUp(() {
    getOrders = _MockGetOrdersForDate();
  });

  HistoryCubit buildCubit() => HistoryCubit(getOrders: getOrders);

  group('HistoryCubit', () {
    test('trạng thái ban đầu: yesterday, loading, rỗng', () {
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(
        cubit.state,
        HistoryState(status: ViewStatus.loading, selectedDate: yesterday),
      );
      expect(cubit.state.orders, isEmpty);
    });

    blocTest<HistoryCubit, HistoryState>(
      'selectDate(hôm qua) hợp lệ → loading (đổi selectedDate) → loaded',
      build: buildCubit,
      setUp: () {
        when(() => getOrders(any())).thenAnswer(
          (_) async => Ok([order('o-1'), order('o-2')]),
        );
      },
      act: (cubit) => cubit.selectDate(yesterday),
      expect: () => [
        HistoryState(status: ViewStatus.loading, selectedDate: yesterday),
        HistoryState(
          status: ViewStatus.loaded,
          selectedDate: yesterday,
          orders: [order('o-1'), order('o-2')],
        ),
      ],
      verify: (_) {
        final captured =
            verify(() => getOrders(captureAny())).captured.single as DateTime;
        expect(captured, yesterday);
      },
    );

    blocTest<HistoryCubit, HistoryState>(
      'selectDate(ngày tương lai) → chặn: giữ selectedDate cũ, errorMessage '
      '"Không thể xem ngày trong tương lai", KHÔNG gọi use case',
      build: buildCubit,
      act: (cubit) => cubit.selectDate(today.add(const Duration(days: 1))),
      expect: () => [
        HistoryState(
          status: ViewStatus.loading,
          selectedDate: yesterday,
          errorMessage: AppStrings.historyFutureDate,
        ),
      ],
      verify: (_) {
        verifyNever(() => getOrders(any()));
      },
    );

    blocTest<HistoryCubit, HistoryState>(
      'selectDate(40 ngày trước) → chặn: giữ selectedDate cũ, errorMessage '
      '"Chỉ xem được trong 30 ngày gần nhất", KHÔNG gọi use case',
      build: buildCubit,
      act: (cubit) =>
          cubit.selectDate(today.subtract(const Duration(days: 40))),
      expect: () => [
        HistoryState(
          status: ViewStatus.loading,
          selectedDate: yesterday,
          errorMessage: AppStrings.historyRangeLimit,
        ),
      ],
      verify: (_) {
        verifyNever(() => getOrders(any()));
      },
    );

    blocTest<HistoryCubit, HistoryState>(
      'biên: selectDate(đúng 30 ngày trước) → HỢP LỆ, được load',
      build: buildCubit,
      setUp: () {
        when(() => getOrders(any())).thenAnswer((_) async => const Ok([]));
      },
      act: (cubit) => cubit.selectDate(today.subtract(const Duration(days: 30))),
      expect: () => [
        HistoryState(
          status: ViewStatus.loading,
          selectedDate: today.subtract(const Duration(days: 30)),
        ),
        HistoryState(
          status: ViewStatus.loaded,
          selectedDate: today.subtract(const Duration(days: 30)),
        ),
      ],
    );

    blocTest<HistoryCubit, HistoryState>(
      'selectDate hợp lệ nhưng load Err → error + message từ failureMessage',
      build: buildCubit,
      setUp: () {
        when(() => getOrders(any()))
            .thenAnswer((_) async => const Err(NetworkFailure()));
      },
      act: (cubit) => cubit.selectDate(yesterday),
      expect: () => [
        HistoryState(status: ViewStatus.loading, selectedDate: yesterday),
        HistoryState(
          status: ViewStatus.error,
          selectedDate: yesterday,
          errorMessage: FailureMessages.network,
        ),
      ],
    );

    blocTest<HistoryCubit, HistoryState>(
      'load() → load lại selectedDate hiện tại (HistoryTab initState gọi)',
      build: buildCubit,
      seed: () => HistoryState(
        status: ViewStatus.loaded,
        selectedDate: yesterday,
        orders: [order('o-old')],
      ),
      setUp: () {
        when(() => getOrders(any())).thenAnswer((_) async => Ok([order('o-new')]));
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        HistoryState(status: ViewStatus.loading, selectedDate: yesterday),
        HistoryState(
          status: ViewStatus.loaded,
          selectedDate: yesterday,
          orders: [order('o-new')],
        ),
      ],
      verify: (_) {
        verify(() => getOrders(yesterday)).called(1);
      },
    );

    group('đóng khi đang tải', () {
      test('rời tab trước khi API trả về → không emit, không lỗi', () async {
        final pending = Completer<Result<List<DeliveryOrder>>>();
        when(() => getOrders(any())).thenAnswer((_) => pending.future);
        final cubit = buildCubit();

        final loading = cubit.load();
        await cubit.close();
        pending.complete(Ok([order('o-1')]));

        await expectLater(loading, completes);
        expect(cubit.state.status, ViewStatus.loading);
      });
    });
  });
}
