import 'package:equatable/equatable.dart';

/// Lọc nhật ký theo loại — khớp tham số `type` của server.
enum AuditFilter {
  /// Mọi dòng.
  all(null),

  /// Các dòng về một đơn hàng.
  order('ORDER'),

  /// Các dòng làm đổi số nợ của khách (chốt đơn, thu tiền).
  debt('DEBT');

  const AuditFilter(this.wireName);

  /// Giá trị gửi lên server; `null` = không lọc.
  final String? wireName;
}

/// Một dòng nhật ký: ai đã làm gì với đơn hàng hoặc công nợ, lúc nào.
class AuditEntry extends Equatable {
  const AuditEntry({
    required this.id,
    required this.action,
    required this.summary,
    required this.userName,
    required this.createdAt,
    this.orderCode,
    this.customerName,
  });

  final String id;

  /// Mã thao tác như server gửi (`ORDER_CREATED`, `DEBT_PAYMENT`...). Giữ
  /// nguyên chuỗi: server thêm loại mới thì app vẫn hiện được dòng đó.
  final String action;

  /// Câu tiếng Việt do server viết sẵn để đọc.
  final String summary;

  /// Tên người thực hiện tại thời điểm đó.
  final String userName;
  final DateTime createdAt;

  /// "DH-A1B2C3"; `null` với dòng không gắn với đơn (thu tiền).
  final String? orderCode;
  final String? customerName;

  @override
  List<Object?> get props =>
      [id, action, summary, userName, createdAt, orderCode, customerName];
}
