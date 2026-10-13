import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_dto.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/data/dto/order_dtos.dart';
import 'package:iceflow_mobile/features/orders/data/mappers/office_order_mapper.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/orders_repository.dart';
import 'package:injectable/injectable.dart';
import 'package:intl/intl.dart';

/// Impl của [OrdersRepository] trên Dio.
@LazySingleton(as: OrdersRepository)
class OrdersRepositoryImpl implements OrdersRepository {
  OrdersRepositoryImpl({required this._dio});

  static const _tag = 'orders';

  final Dio _dio;

  @override
  Future<Result<Paginated<OfficeOrder>>> getOrders({
    OrderFilter filter = const OrderFilter(),
    OfficeOrderStatus? status,
    PageParams page = const PageParams(),
  }) {
    return guardApi('getOrders', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(
        '/api/orders',
        queryParameters: {
          ..._filterQuery(filter),
          if (status != null) 'status': status.wireName,
          ...page.toQuery(),
        },
      );
      final rows = apiDataList(res.data);
      final meta = apiMeta(res.data);
      if (rows == null || meta == null) {
        return const Err(
          UnexpectedFailure('Orders response missing `data` or `meta`'),
        );
      }
      final orders = <OfficeOrder>[];
      for (final row in rows) {
        switch (OfficeOrderMapper.fromDto(OfficeOrderDto.fromJson(row))) {
          case Ok<OfficeOrder>(:final value):
            orders.add(value);
          case Err<OfficeOrder>(:final failure):
            return Err(failure);
        }
      }
      return PaginationDto.fromJson(meta).toPage(orders);
    });
  }

  @override
  Future<Result<OrderCounts>> getCounts({
    OrderFilter filter = const OrderFilter(),
  }) {
    return guardApi('getOrderCounts', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(
        '/api/orders/counts',
        queryParameters: _filterQuery(filter),
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Order counts response missing `data`'));
      }
      return OfficeOrderMapper.fromCountsDto(OrderCountsDto.fromJson(data));
    });
  }

  @override
  Future<Result<List<DriverOption>>> getDrivers() {
    return guardApi('getDrivers', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>('/api/drivers');
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(UnexpectedFailure('Drivers response missing `data`'));
      }
      final drivers = <DriverOption>[];
      for (final row in rows) {
        switch (OfficeOrderMapper.fromDriverDto(DriverOptionDto.fromJson(row))) {
          case Ok<DriverOption>(:final value):
            drivers.add(value);
          case Err<DriverOption>(:final failure):
            return Err(failure);
        }
      }
      return Ok(drivers);
    });
  }

  @override
  Future<Result<int>> assignDriver({
    required List<String> orderIds,
    required String driverId,
  }) {
    return guardApi('assignDriver', tag: _tag, run: () async {
      final res = await _dio.patch<dynamic>(
        '/api/orders/bulk-assign',
        data: {'orderIds': orderIds, 'driverId': driverId},
      );
      final assigned = apiDataObject(res.data)?['assignedCount'];
      if (assigned is! int) {
        return const Err(
          UnexpectedFailure('Assign response missing `data.assignedCount`'),
        );
      }
      return Ok(assigned);
    });
  }

  @override
  Future<Result<OfficeOrderStatus>> changeStatus({
    required String orderId,
    required OfficeOrderStatus status,
    String? cancellationReason,
  }) {
    return guardApi('changeStatus', tag: _tag, run: () async {
      final reason = cancellationReason?.trim();
      final res = await _dio.patch<dynamic>(
        '/api/orders/$orderId/status',
        data: {
          'status': status.wireName,
          if (reason != null && reason.isNotEmpty) 'cancellationReason': reason,
        },
      );
      final updated =
          OfficeOrderStatus.fromName(apiDataObject(res.data)?['status'] as String?);
      if (updated == null) {
        return const Err(
          UnexpectedFailure('Status response missing/unknown `data.status`'),
        );
      }
      return Ok(updated);
    });
  }

  @override
  Future<Result<void>> settle({
    required OfficeOrder order,
    Map<String, int> actualQty = const {},
  }) {
    return guardApi('settle', tag: _tag, run: () async {
      await _dio.patch<dynamic>(
        '/api/orders/${order.id}/reconcile',
        data: {
          // Server chỉ ghi nợ và trừ kho các dòng được gửi → gửi đủ mọi dòng.
          'items': [
            for (final line in order.lines)
              {'id': line.id, 'actualQty': actualQty[line.id] ?? line.quantity},
          ],
        },
      );
      return const Ok(null);
    });
  }

  Map<String, dynamic> _filterQuery(OrderFilter filter) {
    final search = filter.search?.trim();
    final date = filter.date;
    return {
      if (search != null && search.isNotEmpty) 'q': search,
      // Ngày theo lịch (năm/tháng/ngày), không convert múi giờ.
      if (date != null) 'date': DateFormat('yyyy-MM-dd').format(date),
      if (filter.unassignedOnly)
        'driverId': 'unassigned'
      else if (filter.driverId != null)
        'driverId': filter.driverId,
    };
  }
}
