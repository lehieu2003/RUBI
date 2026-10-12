import 'package:equatable/equatable.dart';

/// Công nợ hiện tại của một khách.
class CustomerDebt extends Equatable {
  const CustomerDebt({
    required this.customerId,
    required this.customerName,
    required this.outstandingDebt,
    this.lastPaymentAt,
  });

  final String customerId;
  final String customerName;

  /// Số tiền còn nợ (VND).
  final double outstandingDebt;

  /// Lần thu tiền gần nhất; `null` nếu chưa từng thu.
  final DateTime? lastPaymentAt;

  @override
  List<Object?> get props =>
      [customerId, customerName, outstandingDebt, lastPaymentAt];
}

/// Loại dòng trong sổ nợ — khớp giá trị server gửi.
enum LedgerEntryType {
  /// Ghi nợ khi một đơn được đối soát.
  debt,

  /// Thu tiền của khách.
  payment;

  /// `null` cho giá trị lạ/thiếu: không đoán một dòng là nợ hay là thu.
  static LedgerEntryType? fromName(String? name) {
    return switch (name) {
      'DEBT' => debt,
      'PAYMENT' => payment,
      _ => null,
    };
  }
}

/// Một dòng trong sổ nợ của khách.
class LedgerEntry extends Equatable {
  const LedgerEntry({
    required this.id,
    required this.customerId,
    required this.type,
    required this.amount,
    required this.createdAt,
    this.notes,
  });

  final String id;
  final String customerId;
  final LedgerEntryType type;

  /// Số tiền (VND), luôn dương; [type] cho biết là nợ thêm hay đã thu.
  final double amount;
  final DateTime createdAt;
  final String? notes;

  @override
  List<Object?> get props => [id, customerId, type, amount, createdAt, notes];
}

/// Kết quả ghi nhận một lần thu tiền.
class PaymentReceipt extends Equatable {
  const PaymentReceipt({required this.entry, required this.outstandingDebt});

  /// Dòng PAYMENT vừa được ghi.
  final LedgerEntry entry;

  /// Số còn nợ sau lần thu này.
  final double outstandingDebt;

  @override
  List<Object?> get props => [entry, outstandingDebt];
}
