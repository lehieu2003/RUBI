import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/confirm_delivery.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart';
import 'package:injectable/injectable.dart';

/// State của [TodayOrdersCubit].
///
/// [errorMessage] vừa dùng cho lỗi tải danh sách (kèm [ViewStatus.error])
/// vừa dùng cho lỗi xác nhận giao tạm thời (status vẫn `loaded` — danh sách
/// giữ nguyên để hiển thị, Task 14 hiện message transient rồi cho user thử
/// lại; lần `load`/`refresh` kế tiếp sẽ xoá nó).
class TodayOrdersState extends Equatable {
  const TodayOrdersState({
    required this.status,
    this.orders = const [],
    this.errorMessage,
    this.confirmingOrderId,
  });

  /// State khởi tạo: đang tải, chưa có đơn.
  const TodayOrdersState.initial()
      : this(status: ViewStatus.loading);

  final ViewStatus status;

  /// Đơn của hôm nay — sau MỌI thao tác thành công luôn sắp: `shipping`
  /// trước (createdAt asc), `delivered` sau (createdAt asc).
  final List<DeliveryOrder> orders;

  /// Thông báo lỗi hiện cho driver, nếu có.
  final String? errorMessage;

  /// Đơn đang chờ xác nhận giao (chặn bấm đôi); null khi không có.
  final String? confirmingOrderId;

  @override
  List<Object?> get props =>
      [status, orders, errorMessage, confirmingOrderId];
}

/// State management tab "Đơn hôm nay": tải đơn theo ngày hiện tại, pull-to-
/// refresh, và luồng xác nhận đã giao (gọi use case → cập nhật
/// danh sách local).
@injectable
class TodayOrdersCubit extends Cubit<TodayOrdersState> {
  TodayOrdersCubit({
    required this._getOrders,
    required this._confirmDelivery,
  }) : super(const TodayOrdersState.initial());

  final GetOrdersForDateUseCase _getOrders;
  final ConfirmDeliveryUseCase _confirmDelivery;

  /// Tải đơn của HÔM NAY (ngày local của device, khớp cách office nhập đơn).
  /// Reset toàn bộ state (kể cả [TodayOrdersState.errorMessage] cũ).
  Future<void> load() async {
    emit(const TodayOrdersState(status: ViewStatus.loading));
    final res = await _getOrders(DateTime.now());
    // Màn hình đã đóng trong lúc chờ mạng: không còn ai nghe state này.
    if (isClosed) return;
    switch (res) {
      case Ok<List<DeliveryOrder>>(:final value):
        emit(TodayOrdersState(
          status: ViewStatus.loaded,
          orders: _sortOrders(value),
        ));
      case Err<List<DeliveryOrder>>(:final failure):
        emit(TodayOrdersState(
          status: ViewStatus.error,
          errorMessage: failureMessage(failure),
        ));
    }
  }

  /// Như [load] nhưng KHÔNG emit loading — pull-to-refresh giữ danh sách cũ
  /// hiển thị trong lúc tải lại. Lỗi → state error nhưng vẫn giữ đơn cũ.
  Future<void> refresh() async {
    final res = await _getOrders(DateTime.now());
    // Màn hình đã đóng trong lúc chờ mạng: không còn ai nghe state này.
    if (isClosed) return;
    switch (res) {
      case Ok<List<DeliveryOrder>>(:final value):
        emit(TodayOrdersState(
          status: ViewStatus.loaded,
          orders: _sortOrders(value),
        ));
      case Err<List<DeliveryOrder>>(:final failure):
        emit(TodayOrdersState(
          status: ViewStatus.error,
          orders: state.orders,
          errorMessage: failureMessage(failure),
        ));
    }
  }

  /// Xác nhận đã giao [orderId]. Guard chống bấm đôi: đang có đơn chờ xác
  /// nhận thì lời gọi mới bị bỏ qua.
  ///
  /// Thành công: đơn chuyển `delivered` và xuống CUỐI danh sách; thất bại:
  /// danh sách GIỮ NGUYÊN, chỉ hiện [TodayOrdersState.errorMessage].
  Future<void> confirm(String orderId) async {
    if (state.confirmingOrderId != null) return;
    emit(TodayOrdersState(
      status: state.status,
      orders: state.orders,
      errorMessage: state.errorMessage,
      confirmingOrderId: orderId,
    ));
    final res = await _confirmDelivery(orderId: orderId);
    // Màn hình đã đóng trong lúc chờ mạng: không còn ai nghe state này.
    if (isClosed) return;
    switch (res) {
      case Ok<void>():
        // deliveredAt server tự set; DateTime.now() ở đây chỉ là xấp xỉ để
        // hiển thị local ngay lập tức.
        final markedDeliveredAt = DateTime.now();
        final updated = state.orders.map((o) {
          if (o.id != orderId) return o;
          return DeliveryOrder(
            id: o.id,
            status: OrderStatus.delivered,
            total: o.total,
            customerName: o.customerName,
            customerAddress: o.customerAddress,
            customerPhone: o.customerPhone,
            items: o.items,
            createdAt: o.createdAt,
            deliveredAt: markedDeliveredAt,
            notes: o.notes,
          );
        }).toList();
        emit(TodayOrdersState(
          status: ViewStatus.loaded,
          orders: _sortOrders(updated),
        ));
      case Err<void>(:final failure):
        // Giữ nguyên danh sách — chỉ bắn message, user thử lại.
        emit(TodayOrdersState(
          status: state.status,
          orders: state.orders,
          errorMessage: failureMessage(failure),
        ));
    }
  }

  /// Sắp xếp ổn định: `shipping` trước, `delivered` sau; mỗi nhóm theo
  /// `createdAt` asc. Server vốn trả `createdAt` asc nên thứ tự trong nhóm
  /// được giữ nguyên; việc confirm đánh dấu delivered local mới cần đẩy đơn
  /// xuống nhóm sau.
  List<DeliveryOrder> _sortOrders(List<DeliveryOrder> orders) {
    int byCreatedAt(DeliveryOrder a, DeliveryOrder b) =>
        a.createdAt.compareTo(b.createdAt);
    final shipping =
        orders.where((o) => o.status == OrderStatus.shipping).toList()
          ..sort(byCreatedAt);
    final delivered =
        orders.where((o) => o.status == OrderStatus.delivered).toList()
          ..sort(byCreatedAt);
    return [...shipping, ...delivered];
  }
}
