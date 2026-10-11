import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/network/auth_interceptor.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/data/dto/driver_dtos.dart';
import 'package:iceflow_mobile/features/driver/data/mappers/order_mapper.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';
import 'package:injectable/injectable.dart';
import 'package:intl/intl.dart';

/// Impl của [DriverRepository] trên Dio (token do [AuthInterceptor] gắn,
/// 401/refresh/logout cũng do interceptor xử lý trước khi tới đây).
@LazySingleton(as: DriverRepository)
class DriverRepositoryImpl implements DriverRepository {
  // `this._dio` (private initializing formal): call-site vẫn là `dio: ...`.
  DriverRepositoryImpl({required this._dio});

  final Dio _dio;

  @override
  Future<Result<List<DeliveryOrder>>> getOrders(DateTime date) async {
    try {
      // Format ngày theo GIỜ LOCAL của device (office nhập đơn theo ngày
      // local, server filter `createdAt` theo ngày đó) — giữ nguyên behavior
      // của web, không convert UTC.
      final formatted = DateFormat('yyyy-MM-dd').format(date);
      final res = await _dio.get<dynamic>(
        '/api/driver/orders',
        queryParameters: {'date': formatted},
      );

      final body = _bodyOf(res.data);
      final dataDto = DriverOrdersDataDto.fromJson(_bodyOf(body['data']));
      if (dataDto.orders == null) {
        return const Err(
          UnexpectedFailure('Driver orders response missing `data.orders`'),
        );
      }

      final orders = <DeliveryOrder>[];
      for (final orderDto in dataDto.orders!) {
        switch (OrderMapper.fromDto(orderDto)) {
          case Ok<DeliveryOrder>(:final value):
            orders.add(value);
          case Err<DeliveryOrder>(:final failure):
            return Err(failure);
        }
      }
      return Ok(orders);
    } on DioException catch (err) {
      // Message từ server (VD: "Order not found") giữ nguyên qua mapDioError.
      return Err(mapDioError(err));
    } catch (e) {
      // Guarantee Result: TypeError parse (field sai kiểu)... không được phép
      // xuyên qua biên Result.
      return Err(UnexpectedFailure('Unexpected getOrders failure: $e'));
    }
  }

  @override
  Future<Result<void>> confirmDelivery({required String orderId}) async {
    try {
      await _dio.patch<dynamic>(
        '/api/orders/$orderId/confirm',
        data: const <String, dynamic>{},
      );
      // Payload 200 (orderId/status) không cần gì thêm — còn lại
      // state phía server đã cập nhật.
      return const Ok<void>(null);
    } on DioException catch (err) {
      return Err(mapDioError(err));
    } catch (e) {
      return Err(UnexpectedFailure('Unexpected confirmDelivery failure: $e'));
    }
  }

  /// Lấy object map từ payload; payload không phải map → map rỗng để repository
  /// xử lý thành `Err(UnexpectedFailure)`.
  Map<String, dynamic> _bodyOf(Object? raw) =>
      raw is Map<String, dynamic> ? raw : const {};
}
