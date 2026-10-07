import 'package:iceflow_mobile/core/location/location_service.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';

/// Xác nhận đã giao một đơn — ủy thác cho [DriverRepository].
class ConfirmDeliveryUseCase {
  const ConfirmDeliveryUseCase(this._repository);

  final DriverRepository _repository;

  /// [gps] là vị trí lúc xác nhận; null khi không có/cấp phép vị trí.
  Future<Result<void>> call({required String orderId, GeoPoint? gps}) {
    return _repository.confirmDelivery(orderId: orderId, gps: gps);
  }
}
