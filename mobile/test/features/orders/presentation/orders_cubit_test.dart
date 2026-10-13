import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/orders_repository.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/orders_cubit.dart';
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
  late OrdersCubit cubit;

  void stubOrders(Result<Paginated<OfficeOrder>> result) {
    when(
      () => repo.getOrders(
        filter: any(named: 'filter'),
        status: any(named: 'status'),
        page: any(named: 'page'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockOrdersRepository();
    cubit = OrdersCubit(repo: repo);
    stubOrders(Ok(pageOf([buildOrder('o-1'), buildOrder('o-2')])));
    when(() => repo.getCounts(filter: any(named: 'filter')))
        .thenAnswer((_) async => const Ok(counts));
  });

  tearDown(() => cubit.close());

  group('OrdersCubit — tải', () {
    test('load → danh sách và số đếm của mọi trạng thái', () async {
      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.orders.map((o) => o.id), ['o-1', 'o-2']);
      expect(cubit.state.counts, counts);
      expect(cubit.state.hasMore, isFalse);
      verify(
        () => repo.getOrders(
          filter: const OrderFilter(search: ''),
          status: null,
          page: any(named: 'page'),
        ),
      ).called(1);
    });

    test('lỗi → câu báo lỗi, giữ danh sách đang xem', () async {
      await cubit.load();
      stubOrders(const Err(NetworkFailure()));

      await cubit.load();

      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);
      expect(cubit.state.orders, hasLength(2));
      expect(cubit.state.counts, counts);
    });

    test('không đếm được → vẫn có danh sách, giữ số đếm cũ', () async {
      await cubit.load();
      when(() => repo.getCounts(filter: any(named: 'filter')))
          .thenAnswer((_) async => const Err(NetworkFailure()));

      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.counts, counts);
    });

    test('selectTab → hỏi server đúng trạng thái; chọn lại tab cũ thì thôi',
        () async {
      await cubit.load();
      await cubit.selectTab(OfficeOrderStatus.shipping);
      await cubit.selectTab(OfficeOrderStatus.shipping);

      expect(cubit.state.tab, OfficeOrderStatus.shipping);
      verify(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: OfficeOrderStatus.shipping,
          page: any(named: 'page'),
        ),
      ).called(1);
    });

    test('setSearch → bỏ khoảng trắng, áp cho cả danh sách lẫn số đếm',
        () async {
      await cubit.setSearch('  cô ba ');

      expect(cubit.state.search, 'cô ba');
      const filter = OrderFilter(search: 'cô ba');
      verify(
        () => repo.getOrders(
          filter: filter,
          status: null,
          page: any(named: 'page'),
        ),
      ).called(1);
      verify(() => repo.getCounts(filter: filter)).called(1);
    });

    test('kết quả về muộn của tab cũ không đè lên tab mới', () async {
      final slow = Completer<Result<Paginated<OfficeOrder>>>();
      when(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: OfficeOrderStatus.pending,
          page: any(named: 'page'),
        ),
      ).thenAnswer((_) => slow.future);
      when(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: OfficeOrderStatus.shipping,
          page: any(named: 'page'),
        ),
      ).thenAnswer(
        (_) async => Ok(
          pageOf([buildOrder('o-ship', status: OfficeOrderStatus.shipping)]),
        ),
      );

      final first = cubit.selectTab(OfficeOrderStatus.pending);
      await cubit.selectTab(OfficeOrderStatus.shipping);
      slow.complete(Ok(pageOf([buildOrder('o-late')])));
      await first;

      expect(cubit.state.tab, OfficeOrderStatus.shipping);
      expect(cubit.state.orders.single.id, 'o-ship');
    });

    test('loadMore → nối trang sau vào cuối; hết trang thì không hỏi nữa',
        () async {
      stubOrders(Ok(pageOf([buildOrder('o-1')], totalPages: 2)));
      await cubit.load();
      expect(cubit.state.hasMore, isTrue);
      stubOrders(Ok(pageOf([buildOrder('o-2')], page: 2, totalPages: 2)));

      await cubit.loadMore();
      await cubit.loadMore();

      expect(cubit.state.orders.map((o) => o.id), ['o-1', 'o-2']);
      expect(cubit.state.hasMore, isFalse);
      verify(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: const PageParams(page: 2, limit: 20),
        ),
      ).called(1);
    });

    test('loadMore lỗi → giữ danh sách, vẫn còn "Xem thêm"', () async {
      stubOrders(Ok(pageOf([buildOrder('o-1')], totalPages: 2)));
      await cubit.load();
      stubOrders(const Err(NetworkFailure()));

      await cubit.loadMore();

      expect(cubit.state.orders, hasLength(1));
      expect(cubit.state.hasMore, isTrue);
      expect(cubit.state.loadingMore, isFalse);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    test('đóng khi đang chờ mạng → không lỗi', () async {
      final pending = Completer<Result<Paginated<OfficeOrder>>>();
      when(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: any(named: 'page'),
        ),
      ).thenAnswer((_) => pending.future);

      final running = cubit.load();
      await cubit.close();
      pending.complete(Ok(pageOf([buildOrder('o-1')])));

      await expectLater(running, completes);
    });
  });

  group('OrdersCubit — thao tác', () {
    test('assign → gán đúng đơn, tải lại, báo tên tài xế', () async {
      when(
        () => repo.assignDriver(
          orderIds: any(named: 'orderIds'),
          driverId: any(named: 'driverId'),
        ),
      ).thenAnswer((_) async => const Ok(1));

      final result = await cubit.assign(buildOrder('o-1'), tai);

      expect(result, (ok: true, message: AppStrings.orderAssigned(tai.name)));
      verify(() => repo.assignDriver(orderIds: ['o-1'], driverId: 'drv-1'))
          .called(1);
      expect(cubit.state.status, ViewStatus.loaded);
    });

    test('assign nhưng server không gán đơn nào → báo đơn đã đổi', () async {
      when(
        () => repo.assignDriver(
          orderIds: any(named: 'orderIds'),
          driverId: any(named: 'driverId'),
        ),
      ).thenAnswer((_) async => const Ok(0));

      final result = await cubit.assign(buildOrder('o-1'), tai);

      expect(result, (ok: false, message: AppStrings.orderAssignSkipped));
    });

    test('assign lỗi → câu báo của server', () async {
      when(
        () => repo.assignDriver(
          orderIds: any(named: 'orderIds'),
          driverId: any(named: 'driverId'),
        ),
      ).thenAnswer((_) async => const Err(ServerFailure('Tài xế đã nghỉ')));

      final result = await cubit.assign(buildOrder('o-1'), tai);

      expect(result, (ok: false, message: 'Tài xế đã nghỉ'));
    });

    test('changeStatus → báo mã đơn và trạng thái mới, tải lại', () async {
      when(
        () => repo.changeStatus(
          orderId: any(named: 'orderId'),
          status: any(named: 'status'),
          cancellationReason: any(named: 'cancellationReason'),
        ),
      ).thenAnswer((_) async => const Ok(OfficeOrderStatus.shipping));
      final order = buildOrder('order-abc123');

      final result = await cubit.changeStatus(order, OfficeOrderStatus.shipping);

      expect(result.ok, isTrue);
      expect(
        result.message,
        AppStrings.orderStatusChanged(
          'DH-ABC123',
          AppStrings.orderStatusLabel('SHIPPING'),
        ),
      );
      expect(cubit.state.status, ViewStatus.loaded);
    });

    test('huỷ đơn gửi kèm lý do', () async {
      when(
        () => repo.changeStatus(
          orderId: any(named: 'orderId'),
          status: any(named: 'status'),
          cancellationReason: any(named: 'cancellationReason'),
        ),
      ).thenAnswer((_) async => const Ok(OfficeOrderStatus.cancelled));

      await cubit.changeStatus(
        buildOrder('o-1'),
        OfficeOrderStatus.cancelled,
        cancellationReason: 'Khách đổi ý',
      );

      verify(
        () => repo.changeStatus(
          orderId: 'o-1',
          status: OfficeOrderStatus.cancelled,
          cancellationReason: 'Khách đổi ý',
        ),
      ).called(1);
    });

    test('changeStatus bị từ chối → câu báo của server, vẫn tải lại', () async {
      when(
        () => repo.changeStatus(
          orderId: any(named: 'orderId'),
          status: any(named: 'status'),
          cancellationReason: any(named: 'cancellationReason'),
        ),
      ).thenAnswer(
        (_) async => const Err(ServerFailure('Đơn đã đối soát')),
      );

      final result =
          await cubit.changeStatus(buildOrder('o-1'), OfficeOrderStatus.shipping);

      expect(result, (ok: false, message: 'Đơn đã đối soát'));
      verify(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: any(named: 'page'),
        ),
      ).called(1);
    });

    test('settle → gửi số thực giao, báo mã đơn, tải lại', () async {
      when(
        () => repo.settle(
          order: any(named: 'order'),
          actualQty: any(named: 'actualQty'),
        ),
      ).thenAnswer((_) async => const Ok<void>(null));
      final order =
          buildOrder('order-abc123', status: OfficeOrderStatus.delivered);

      final result = await cubit.settle(order, {'line-1': 9});

      expect(result, (ok: true, message: AppStrings.settleDone('DH-ABC123')));
      verify(() => repo.settle(order: order, actualQty: {'line-1': 9}))
          .called(1);
      expect(cubit.state.status, ViewStatus.loaded);
    });

    test('settle bị từ chối → câu báo của server, vẫn tải lại', () async {
      when(
        () => repo.settle(
          order: any(named: 'order'),
          actualQty: any(named: 'actualQty'),
        ),
      ).thenAnswer(
        (_) async => const Err<void>(ServerFailure('Chỉ đối soát được đơn đã giao')),
      );

      final result = await cubit.settle(buildOrder('o-1'), const {});

      expect(result, (ok: false, message: 'Chỉ đối soát được đơn đã giao'));
      verify(
        () => repo.getOrders(
          filter: any(named: 'filter'),
          status: any(named: 'status'),
          page: any(named: 'page'),
        ),
      ).called(1);
    });
  });
}
