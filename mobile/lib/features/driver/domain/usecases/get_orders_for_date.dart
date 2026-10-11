import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';
import 'package:injectable/injectable.dart';

/// Lấy đơn giao theo ngày — ủy thác hoàn toàn cho [DriverRepository].
@lazySingleton
class GetOrdersForDateUseCase {
  const GetOrdersForDateUseCase(this._repository);

  final DriverRepository _repository;

  Future<Result<List<DeliveryOrder>>> call(DateTime date) {
    return _repository.getOrders(date);
  }
}
