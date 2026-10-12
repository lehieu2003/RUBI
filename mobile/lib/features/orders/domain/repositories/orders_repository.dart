import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';

/// Contract cho đơn hàng phía văn phòng (Quản lý và Nhân viên — server trả
/// 403 cho Tài xế, vốn có danh sách riêng ở feature driver).
abstract class OrdersRepository {
  const OrdersRepository();

  /// Đơn hàng kèm khách, tài xế và các dòng hàng, mới nhất trước.
  /// [status] `null` = mọi trạng thái.
  Future<Result<Paginated<OfficeOrder>>> getOrders({
    OrderFilter filter = const OrderFilter(),
    OfficeOrderStatus? status,
    PageParams page = const PageParams(),
  });

  /// Số đơn theo trạng thái dưới [filter] (danh sách chỉ có một trang nên
  /// không tự đếm được).
  Future<Result<OrderCounts>> getCounts({
    OrderFilter filter = const OrderFilter(),
  });

  /// Các tài xế còn giao được hàng.
  Future<Result<List<DriverOption>>> getDrivers();

  /// Gán các đơn cho một tài xế. Chỉ đơn Chờ giao / Đang giao được gán; đơn
  /// khác bị bỏ qua. Trả số đơn đã gán.
  Future<Result<int>> assignDriver({
    required List<String> orderIds,
    required String driverId,
  });

  /// Đổi trạng thái một đơn (không đổi sang đã đối soát được). Huỷ đơn phải
  /// kèm [cancellationReason]. Trả trạng thái mới.
  ///
  /// Đơn đã đối soát hoặc đã huỷ → `Err(ServerFailure)` 409.
  Future<Result<OfficeOrderStatus>> changeStatus({
    required String orderId,
    required OfficeOrderStatus status,
    String? cancellationReason,
  });
}
