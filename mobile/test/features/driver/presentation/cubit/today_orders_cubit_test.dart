import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/confirm_delivery.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockGetOrdersForDate extends Mock implements GetOrdersForDateUseCase {}

class _MockConfirmDelivery extends Mock implements ConfirmDeliveryUseCase {}

void main() {
  setUpAll(() {
    registerFallbackValue(DateTime(2026, 1, 1));
    registerFallbackValue('');
  });

  DeliveryOrder order(
    String id,
    OrderStatus status,
    DateTime createdAt,
  ) =>
      DeliveryOrder(
        id: id,
        status: status,
        total: 25000,
        customerName: 'KH $id',
        customerAddress: 'Địa chỉ $id',
        customerPhone: '0900000000',
        items: const [],
        createdAt: createdAt,
      );

  final t8h = DateTime(2026, 10, 7, 8);
  final t9h = DateTime(2026, 10, 7, 9);
  final t10h = DateTime(2026, 10, 7, 10);

  // Server trả shipping trước delivered theo createdAt asc; khi test sort
  // defensively ta cố tình trả danh sách TRỘN để chứng minh cubit tự sắp lại.
  final mixedFromServer = [
    order('o-delivered-1', OrderStatus.delivered, t8h),
    order('o-shipping-1', OrderStatus.shipping, t9h),
    order('o-shipping-2', OrderStatus.shipping, t10h),
  ];
  final sortedShippingFirst = [
    order('o-shipping-1', OrderStatus.shipping, t9h),
    order('o-shipping-2', OrderStatus.shipping, t10h),
    order('o-delivered-1', OrderStatus.delivered, t8h),
  ];

  late _MockGetOrdersForDate getOrders;
  late _MockConfirmDelivery confirmDelivery;

  setUp(() {
    getOrders = _MockGetOrdersForDate();
    confirmDelivery = _MockConfirmDelivery();
  });

  TodayOrdersCubit buildCubit() => TodayOrdersCubit(
        getOrders: getOrders,
        confirmDelivery: confirmDelivery,
      );

  void stubGetOrders(Result<List<DeliveryOrder>> result) {
    when(() => getOrders(any())).thenAnswer((_) async => result);
  }

  void stubConfirm(Result<void> result) {
    when(() => confirmDelivery(
          orderId: any(named: 'orderId'),
        )).thenAnswer((_) async => result);
  }

  group('TodayOrdersCubit', () {
    group('load', () {
      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Ok → loading → loaded, SHIPPING đứng trước DELIVERED kể cả khi '
        'server trả trộn lẫn (invariant sắp xếp)',
        build: buildCubit,
        setUp: () => stubGetOrders(Ok(mixedFromServer)),
        act: (cubit) => cubit.load(),
        expect: () => [
          const TodayOrdersState(status: ViewStatus.loading),
          TodayOrdersState(status: ViewStatus.loaded, orders: sortedShippingFirst),
        ],
        verify: (_) {
          final captured =
              verify(() => getOrders(captureAny())).captured.single as DateTime;
          // Ngày hôm nay (khẳng định load mặc định lấy ngày hiện tại —
          // so từng thành phần vì cubit truyền `DateTime.now()` nguyên bản).
          final now = DateTime.now();
          expect(captured.year, now.year);
          expect(captured.month, now.month);
          expect(captured.day, now.day);
        },
      );

      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Err → error với message từ failureMessage',
        build: buildCubit,
        setUp: () => stubGetOrders(const Err(NetworkFailure())),
        act: (cubit) => cubit.load(),
        expect: () => [
          const TodayOrdersState(status: ViewStatus.loading),
          TodayOrdersState(
            status: ViewStatus.error,
            errorMessage: FailureMessages.network,
          ),
        ],
      );
    });

    group('refresh', () {
      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Ok → KHÔNG emit loading (giữ đơn cũ hiển thị), emit loaded mới',
        build: buildCubit,
        seed: () => TodayOrdersState(status: ViewStatus.loaded, orders: [
          order('o-old', OrderStatus.shipping, t8h),
        ]),
        setUp: () => stubGetOrders(Ok(mixedFromServer)),
        act: (cubit) => cubit.refresh(),
        expect: () => [
          TodayOrdersState(status: ViewStatus.loaded, orders: sortedShippingFirst),
        ],
      );

      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Err → error state nhưng VẪN giữ danh sách đang hiển thị',
        build: buildCubit,
        seed: () => TodayOrdersState(status: ViewStatus.loaded, orders: [
          order('o-old', OrderStatus.shipping, t8h),
        ]),
        setUp: () => stubGetOrders(const Err(NetworkFailure())),
        act: (cubit) => cubit.refresh(),
        expect: () => [
          TodayOrdersState(
            status: ViewStatus.error,
            orders: [order('o-old', OrderStatus.shipping, t8h)],
            errorMessage: FailureMessages.network,
          ),
        ],
      );
    });

    group('confirm', () {
      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Ok → order chuyển delivered + xuống CUỐI danh sách + clear '
        'confirmingOrderId (invariant sắp xếp)',
        build: buildCubit,
        seed: () => TodayOrdersState(status: ViewStatus.loaded, orders: [
          order('o-b', OrderStatus.shipping, t9h),
          order('o-c', OrderStatus.shipping, t10h),
          order('o-delivered', OrderStatus.delivered, t8h),
        ]),
        setUp: () {
          stubConfirm(const Ok<void>(null));
        },
        act: (cubit) => cubit.confirm('o-b'),
        expect: () => [
          TodayOrdersState(
            status: ViewStatus.loaded,
            orders: [
              order('o-b', OrderStatus.shipping, t9h),
              order('o-c', OrderStatus.shipping, t10h),
              order('o-delivered', OrderStatus.delivered, t8h),
            ],
            confirmingOrderId: 'o-b',
          ),
          predicate<TodayOrdersState>((s) {
            final ids = s.orders.map((o) => o.id).toList();
            return s.status == ViewStatus.loaded &&
                s.errorMessage == null &&
                s.confirmingOrderId == null &&
                ids[0] == 'o-c' &&
                ids[1] == 'o-delivered' &&
                ids.last == 'o-b' &&
                s.orders.last.status == OrderStatus.delivered &&
                s.orders.last.deliveredAt != null;
          }, 'o-b đánh dấu delivered và xuống cuối danh sách'),
        ],
        verify: (_) {
          verify(() => confirmDelivery(orderId: 'o-b')).called(1);
        },
      );

      blocTest<TodayOrdersCubit, TodayOrdersState>(
        'Err → danh sách GIỮ NGUYÊN từng phần tử, errorMessage từ '
        'failureMessage, clear confirmingOrderId',
        build: buildCubit,
        seed: () => TodayOrdersState(status: ViewStatus.loaded, orders: [
          order('o-a', OrderStatus.shipping, t8h),
          order('o-b', OrderStatus.shipping, t9h),
        ]),
        setUp: () {
          stubConfirm(const Err<void>(ServerFailure('Xác nhận thất bại')));
        },
        act: (cubit) => cubit.confirm('o-a'),
        expect: () => [
          TodayOrdersState(
            status: ViewStatus.loaded,
            orders: [
              order('o-a', OrderStatus.shipping, t8h),
              order('o-b', OrderStatus.shipping, t9h),
            ],
            confirmingOrderId: 'o-a',
          ),
          TodayOrdersState(
            status: ViewStatus.loaded,
            orders: [
              order('o-a', OrderStatus.shipping, t8h),
              order('o-b', OrderStatus.shipping, t9h),
            ],
            errorMessage: 'Xác nhận thất bại',
          ),
        ],
      );

      blocTest<TodayOrdersCubit, TodayOrdersState>(
        're-entrancy guard: đang confirm 1 đơn → lời confirm thứ hai bị bỏ qua',
        build: buildCubit,
        seed: () => TodayOrdersState(status: ViewStatus.loaded, orders: [
          order('o-a', OrderStatus.shipping, t8h),
          order('o-b', OrderStatus.shipping, t9h),
        ]),
        setUp: () {
          final pending = Completer<Result<void>>();
          when(() => confirmDelivery(
                orderId: any(named: 'orderId'),
              )).thenAnswer((_) => pending.future);
          addTearDown(() => pending.complete(const Ok<void>(null)));
        },
        act: (cubit) async {
          unawaited(cubit.confirm('o-a')); // treo ở confirmDelivery
          await Future<void>.delayed(Duration.zero);
          await cubit.confirm('o-b'); // phải bị guard chặn ngay
        },
        expect: () => [
          TodayOrdersState(
            status: ViewStatus.loaded,
            orders: [
              order('o-a', OrderStatus.shipping, t8h),
              order('o-b', OrderStatus.shipping, t9h),
            ],
            confirmingOrderId: 'o-a',
          ),
        ],
        verify: (_) {
          verify(() => confirmDelivery(
                orderId: 'o-a',
              )).called(1);
          verifyNever(() => confirmDelivery(
                orderId: 'o-b',
              ));
        },
      );
    });

    group('đóng khi đang chờ mạng', () {
      test('load / refresh: rời tab trước khi API trả về → không lỗi',
          () async {
        for (final call in [
          (TodayOrdersCubit cubit) => cubit.load(),
          (TodayOrdersCubit cubit) => cubit.refresh(),
        ]) {
          final pending = Completer<Result<List<DeliveryOrder>>>();
          when(() => getOrders(any())).thenAnswer((_) => pending.future);
          final cubit = buildCubit();

          final running = call(cubit);
          await cubit.close();
          pending.complete(Ok(mixedFromServer));

          await expectLater(running, completes);
          expect(cubit.state.orders, isEmpty);
        }
      });

      test('confirm: rời tab trước khi server xác nhận → không lỗi', () async {
        stubGetOrders(Ok(mixedFromServer));
        final pending = Completer<Result<void>>();
        when(() => confirmDelivery(orderId: any(named: 'orderId')))
            .thenAnswer((_) => pending.future);
        final cubit = buildCubit();
        await cubit.load();

        final confirming = cubit.confirm('o-shipping-1');
        await cubit.close();
        pending.complete(const Ok<void>(null));

        await expectLater(confirming, completes);
        expect(cubit.state.confirmingOrderId, 'o-shipping-1');
      });
    });

    test('xác nhận giao xong → đơn vẫn giữ ghi chú', () async {
      final withNotes = DeliveryOrder(
        id: 'o-n',
        status: OrderStatus.shipping,
        total: 25000,
        customerName: 'KH',
        customerAddress: 'Địa chỉ',
        customerPhone: '0900000000',
        items: const [],
        createdAt: t9h,
        notes: 'Gọi trước khi tới',
      );
      stubGetOrders(Ok([withNotes]));
      stubConfirm(const Ok<void>(null));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      await cubit.confirm('o-n');

      expect(cubit.state.orders.single.status, OrderStatus.delivered);
      expect(cubit.state.orders.single.notes, 'Gọi trước khi tới');
    });
  });
}
