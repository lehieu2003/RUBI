import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/office_order.dart';

OfficeOrder buildOrder(
  String id, {
  OfficeOrderStatus status = OfficeOrderStatus.pending,
  String customerName = 'Quán Cô Ba',
  String? driverName,
  String? notes,
}) =>
    OfficeOrder(
      id: id,
      status: status,
      total: 250000,
      createdAt: DateTime(2026, 10, 12, 8, 5),
      customerName: customerName,
      customerCode: 'KH001',
      customerAddress: '12 Nguyễn Trãi, Q.1',
      customerPhone: '0903123456',
      lines: const [
        OrderLine(
          id: 'line-1',
          productName: 'Đá viên',
          sizeKg: 5,
          unit: 'bao',
          quantity: 10,
          unitPrice: 25000,
          lineTotal: 250000,
        ),
      ],
      driverId: driverName == null ? null : 'drv-1',
      driverName: driverName,
      notes: notes,
    );

Paginated<OfficeOrder> pageOf(
  List<OfficeOrder> items, {
  int page = 1,
  int totalPages = 1,
}) =>
    Paginated(
      items: items,
      page: page,
      limit: 20,
      totalItems: items.length,
      totalPages: totalPages,
    );

const counts = OrderCounts(
  total: 9,
  byStatus: {
    OfficeOrderStatus.pending: 3,
    OfficeOrderStatus.shipping: 2,
    OfficeOrderStatus.delivered: 1,
    OfficeOrderStatus.completed: 2,
    OfficeOrderStatus.cancelled: 1,
  },
);

const tai = DriverOption(id: 'drv-1', name: 'Nguyễn Văn Tài', phone: '0911222333');
