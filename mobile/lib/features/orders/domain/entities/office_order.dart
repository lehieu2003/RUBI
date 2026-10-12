import 'package:equatable/equatable.dart';

/// Trạng thái đơn như văn phòng thấy — khớp giá trị server gửi. (Tài xế chỉ
/// thấy hai trạng thái, xem `OrderStatus` của feature driver.)
enum OfficeOrderStatus {
  pending('PENDING'),
  shipping('SHIPPING'),
  delivered('DELIVERED'),

  /// Đã đối soát. Chỉ tới được qua đối soát, không đổi tay được.
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const OfficeOrderStatus(this.wireName);

  /// Giá trị gửi/nhận qua API.
  final String wireName;

  /// Đơn đã đối soát hoặc đã huỷ thì không đổi được nữa.
  bool get isFinal => this == completed || this == cancelled;

  /// `null` cho giá trị lạ/thiếu: không đoán trạng thái của một đơn.
  static OfficeOrderStatus? fromName(String? name) {
    for (final status in values) {
      if (status.wireName == name) return status;
    }
    return null;
  }
}

/// Một dòng hàng của đơn.
class OrderLine extends Equatable {
  const OrderLine({
    required this.id,
    required this.productName,
    required this.sizeKg,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    this.actualQty,
  });

  /// Id của dòng — đối soát gửi số thực giao theo id này.
  final String id;
  final String productName;
  final int sizeKg;
  final String unit;

  /// Số lượng đặt.
  final int quantity;
  final double unitPrice;
  final double lineTotal;

  /// Số thực giao, có sau khi đối soát; `null` trước đó.
  final int? actualQty;

  @override
  List<Object?> get props =>
      [id, productName, sizeKg, unit, quantity, unitPrice, lineTotal, actualQty];
}

/// Một đơn hàng như văn phòng (Quản lý, Nhân viên) thấy.
class OfficeOrder extends Equatable {
  const OfficeOrder({
    required this.id,
    required this.status,
    required this.total,
    required this.createdAt,
    required this.customerName,
    required this.customerCode,
    required this.customerAddress,
    required this.customerPhone,
    required this.lines,
    this.notes,
    this.driverId,
    this.driverName,
    this.deliveredAt,
    this.completedAt,
  });

  final String id;
  final OfficeOrderStatus status;
  final double total;
  final DateTime createdAt;
  final String customerName;
  final String customerCode;
  final String customerAddress;
  final String customerPhone;
  final List<OrderLine> lines;

  /// Dặn dò khi giao, hoặc `[HỦY: lý do]` với đơn đã huỷ.
  final String? notes;

  /// `null` khi đơn chưa gán tài xế.
  final String? driverId;
  final String? driverName;
  final DateTime? deliveredAt;

  /// Thời điểm đối soát.
  final DateTime? completedAt;

  /// Mã đơn như mọi màn hình hiển thị: "DH-" + 6 ký tự cuối của id.
  String get code {
    final tail = id.length <= 6 ? id : id.substring(id.length - 6);
    return 'DH-${tail.toUpperCase()}';
  }

  @override
  List<Object?> get props => [
        id,
        status,
        total,
        createdAt,
        customerName,
        customerCode,
        customerAddress,
        customerPhone,
        lines,
        notes,
        driverId,
        driverName,
        deliveredAt,
        completedAt,
      ];
}

/// Số đơn theo từng trạng thái, dưới cùng bộ lọc với danh sách.
class OrderCounts extends Equatable {
  const OrderCounts({required this.total, required this.byStatus});

  final int total;
  final Map<OfficeOrderStatus, int> byStatus;

  int of(OfficeOrderStatus status) => byStatus[status] ?? 0;

  @override
  List<Object?> get props => [total, byStatus];
}

/// Một tài xế còn giao được hàng, để gán đơn.
class DriverOption extends Equatable {
  const DriverOption({required this.id, required this.name, this.phone});

  final String id;
  final String name;
  final String? phone;

  @override
  List<Object?> get props => [id, name, phone];
}

/// Bộ lọc của danh sách đơn và của số đếm theo trạng thái.
class OrderFilter extends Equatable {
  const OrderFilter({
    this.search,
    this.date,
    this.driverId,
    this.unassignedOnly = false,
  });

  /// Tên hoặc mã khách, hoặc mã đơn (DH-JI9A6Q).
  final String? search;

  /// Ngày tạo đơn (ngày theo lịch Việt Nam); `null` = mọi ngày.
  final DateTime? date;

  /// Chỉ đơn của tài xế này.
  final String? driverId;

  /// Chỉ đơn chưa gán tài xế (ưu tiên hơn [driverId]).
  final bool unassignedOnly;

  @override
  List<Object?> get props => [search, date, driverId, unassignedOnly];
}
