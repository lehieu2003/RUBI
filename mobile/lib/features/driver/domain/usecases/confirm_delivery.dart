import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';

/// Xác nhận đã giao một đơn — ủy thác cho [DriverRepository].
class ConfirmDeliveryUseCase {
  const ConfirmDeliveryUseCase(this._repository);

  final DriverRepository _repository;

  Future<Result<void>> call({required String orderId}) {
    return _repository.confirmDelivery(orderId: orderId);
  }
}
