import 'package:iceflow_mobile/core/location/location_service.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';

/// Contract cho dữ liệu giao hàng của driver.
abstract class DriverRepository {
  const DriverRepository();

  /// Đơn hàng cần giao trong [date] (đơn đã giao hôm đó cũng có mặt với
  /// status `delivered`), server đã sort `createdAt` asc.
  ///
  /// [date] được format `yyyy-MM-dd` theo giờ local — khớp cách office nhập
  /// đơn theo ngày và filter `createdAt` phía server.
  Future<Result<List<DeliveryOrder>>> getOrders(DateTime date);

  /// Xác nhận đã giao [orderId]. [gps] là vị trí lúc xác nhận (null khi
  /// người dùng không cho phép vị trí).
  Future<Result<void>> confirmDelivery({required String orderId, GeoPoint? gps});
}
