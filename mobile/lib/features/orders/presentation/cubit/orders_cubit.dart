import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/orders_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Đơn hàng" (Quản lý, Nhân viên).
class OrdersState extends Equatable {
  const OrdersState({
    required this.status,
    this.search = '',
    this.tab,
    this.date,
    this.driver,
    this.unassignedOnly = false,
    this.orders = const [],
    this.counts,
    this.hasMore = false,
    this.nextPage = const PageParams(),
    this.loadingMore = false,
    this.errorMessage,
  });

  final ViewStatus status;

  /// Từ khoá tìm kiếm đang áp dụng.
  final String search;

  /// Tab trạng thái đang xem; `null` = tất cả.
  final OfficeOrderStatus? tab;

  /// Chỉ đơn tạo trong ngày này; `null` = mọi ngày.
  final DateTime? date;

  /// Chỉ đơn của tài xế này; `null` = mọi tài xế.
  final DriverOption? driver;

  /// Chỉ đơn chưa gán tài xế (khi bật thì [driver] là `null`).
  final bool unassignedOnly;

  /// Các đơn đã tải của tab đang xem, mới nhất trước.
  final List<OfficeOrder> orders;

  /// Số đơn theo trạng thái dưới bộ lọc hiện tại; `null` khi chưa có.
  final OrderCounts? counts;
  final bool hasMore;
  final PageParams nextPage;
  final bool loadingMore;
  final String? errorMessage;

  /// Bộ lọc gửi cho server, dùng chung cho danh sách và số đếm.
  OrderFilter get filter => OrderFilter(
        search: search,
        date: date,
        driverId: driver?.id,
        unassignedOnly: unassignedOnly,
      );

  /// Cùng tab và bộ lọc, với kết quả khác.
  OrdersState _result({
    required ViewStatus status,
    List<OfficeOrder> orders = const [],
    OrderCounts? counts,
    bool hasMore = false,
    PageParams nextPage = const PageParams(),
    bool loadingMore = false,
    String? errorMessage,
  }) =>
      OrdersState(
        status: status,
        search: search,
        tab: tab,
        date: date,
        driver: driver,
        unassignedOnly: unassignedOnly,
        orders: orders,
        counts: counts,
        hasMore: hasMore,
        nextPage: nextPage,
        loadingMore: loadingMore,
        errorMessage: errorMessage,
      );

  @override
  List<Object?> get props => [
        status,
        search,
        tab,
        date,
        driver,
        unassignedOnly,
        orders,
        counts,
        hasMore,
        nextPage,
        loadingMore,
        errorMessage,
      ];
}

/// Kết quả một thao tác trên đơn, để màn hình báo cho người dùng.
typedef OrderActionResult = ({bool ok, String message});

/// State management màn "Đơn hàng": danh sách theo trạng thái, tìm kiếm, gán
/// tài xế, đổi trạng thái và huỷ đơn.
@injectable
class OrdersCubit extends Cubit<OrdersState> {
  OrdersCubit({required this._repo})
      : super(const OrdersState(status: ViewStatus.loading));

  final OrdersRepository _repo;

  /// Tăng mỗi lần đổi tab / từ khoá, để kết quả về muộn không đè lên.
  int _generation = 0;

  /// Tải lại trang đầu và số đếm với tab và bộ lọc hiện tại.
  Future<void> load() => _reload(state);

  Future<void> selectTab(OfficeOrderStatus? tab) {
    if (tab == state.tab) return Future.value();
    return _reload(_view(tab: tab), keep: false);
  }

  Future<void> setSearch(String search) {
    final trimmed = search.trim();
    if (trimmed == state.search) return Future.value();
    return _reload(_view(search: trimmed), keep: false);
  }

  /// Lọc theo ngày tạo đơn; `null` = mọi ngày.
  Future<void> setDate(DateTime? date) {
    final day = date == null ? null : DateTime(date.year, date.month, date.day);
    if (day == state.date) return Future.value();
    return _reload(_view(date: day, keepDate: false), keep: false);
  }

  /// Lọc theo tài xế: một tài xế, hoặc [unassignedOnly] cho đơn chưa gán;
  /// không truyền gì = mọi tài xế.
  Future<void> setDriver({DriverOption? driver, bool unassignedOnly = false}) {
    final only = unassignedOnly && driver == null;
    if (driver == state.driver && only == state.unassignedOnly) {
      return Future.value();
    }
    return _reload(
      _view(driver: driver, unassignedOnly: only, keepDriver: false),
      keep: false,
    );
  }

  /// State hiện tại với tab / bộ lọc khác (chưa có kết quả).
  OrdersState _view({
    String? search,
    Object? tab = _unchanged,
    DateTime? date,
    bool keepDate = true,
    DriverOption? driver,
    bool unassignedOnly = false,
    bool keepDriver = true,
  }) =>
      OrdersState(
        status: ViewStatus.loading,
        search: search ?? state.search,
        tab: identical(tab, _unchanged) ? state.tab : tab as OfficeOrderStatus?,
        date: keepDate ? state.date : date,
        driver: keepDriver ? state.driver : driver,
        unassignedOnly: keepDriver ? state.unassignedOnly : unassignedOnly,
      );

  static const Object _unchanged = Object();

  Future<void> _reload(OrdersState view, {bool keep = true}) async {
    final generation = ++_generation;
    emit(
      view._result(
        status: ViewStatus.loading,
        orders: keep ? state.orders : const [],
        counts: state.counts,
      ),
    );
    final results = await Future.wait([
      _repo.getOrders(filter: view.filter, status: view.tab),
      _repo.getCounts(filter: view.filter),
    ]);
    if (isClosed || generation != _generation) return;
    final list = results[0] as Result<Paginated<OfficeOrder>>;
    final counts = results[1] as Result<OrderCounts>;
    switch (list) {
      case Ok<Paginated<OfficeOrder>>(:final value):
        emit(
          view._result(
            status: ViewStatus.loaded,
            orders: value.items,
            // Không đếm được thì giữ số cũ: danh sách vẫn dùng được.
            counts: counts is Ok<OrderCounts> ? counts.value : state.counts,
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<OfficeOrder>>(:final failure):
        emit(
          view._result(
            status: ViewStatus.error,
            orders: state.orders,
            counts: state.counts,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Tải trang kế tiếp và nối vào cuối danh sách.
  Future<void> loadMore() async {
    if (!state.hasMore || state.loadingMore) return;
    final generation = _generation;
    emit(_copy(loadingMore: true));
    final res = await _repo.getOrders(
      filter: state.filter,
      status: state.tab,
      page: state.nextPage,
    );
    if (isClosed || generation != _generation) return;
    switch (res) {
      case Ok<Paginated<OfficeOrder>>(:final value):
        emit(
          state._result(
            status: ViewStatus.loaded,
            orders: [...state.orders, ...value.items],
            counts: state.counts,
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<OfficeOrder>>(:final failure):
        emit(_copy(loadingMore: false, errorMessage: failureMessage(failure)));
    }
  }

  /// Các tài xế còn giao được, cho hộp chọn khi gán đơn.
  Future<Result<List<DriverOption>>> drivers() => _repo.getDrivers();

  /// Gán [order] cho [driver].
  Future<OrderActionResult> assign(OfficeOrder order, DriverOption driver) async {
    final res = await _repo.assignDriver(orderIds: [order.id], driverId: driver.id);
    switch (res) {
      case Ok<int>(:final value):
        if (!isClosed) await load();
        // 0: đơn vừa đổi sang trạng thái không gán được nữa.
        return value == 0
            ? (ok: false, message: AppStrings.orderAssignSkipped)
            : (ok: true, message: AppStrings.orderAssigned(driver.name));
      case Err<int>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }

  /// Đổi trạng thái [order]; huỷ đơn thì kèm [cancellationReason].
  Future<OrderActionResult> changeStatus(
    OfficeOrder order,
    OfficeOrderStatus status, {
    String? cancellationReason,
  }) async {
    final res = await _repo.changeStatus(
      orderId: order.id,
      status: status,
      cancellationReason: cancellationReason,
      // Đơn đã đổi ở nơi khác → 409 ORDER_STATUS_CHANGED, không ghi đè.
      expectedStatus: order.status,
    );
    // Thành công hay bị từ chối (đơn đã đổi ở nơi khác) đều lấy lại danh sách.
    if (!isClosed) await load();
    return switch (res) {
      Ok<OfficeOrderStatus>(:final value) => (
          ok: true,
          message: AppStrings.orderStatusChanged(
            order.code,
            AppStrings.orderStatusLabel(value.wireName),
          ),
        ),
      Err<OfficeOrderStatus>(:final failure) => (
          ok: false,
          message: failureMessage(failure),
        ),
    };
  }

  /// Đối soát [order] với số thực giao của từng dòng (dòng không có trong
  /// [actualQty] lấy số đặt).
  Future<OrderActionResult> settle(
    OfficeOrder order,
    Map<String, int> actualQty,
  ) async {
    final res = await _repo.settle(order: order, actualQty: actualQty);
    // Thành công hay bị từ chối (đơn đã chốt ở nơi khác) đều lấy lại danh sách.
    if (!isClosed) await load();
    return switch (res) {
      Ok<void>() => (ok: true, message: AppStrings.settleDone(order.code)),
      Err<void>(:final failure) => (ok: false, message: failureMessage(failure)),
    };
  }

  OrdersState _copy({required bool loadingMore, String? errorMessage}) =>
      state._result(
        status: state.status,
        orders: state.orders,
        counts: state.counts,
        hasMore: state.hasMore,
        nextPage: state.nextPage,
        loadingMore: loadingMore,
        errorMessage: errorMessage,
      );
}
