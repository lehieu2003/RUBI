// DTOs cho công nợ: `/api/reports/debt`, `/api/customers/{id}/ledger`,
// `/api/customers/{id}/payments` (envelope `{ success, data|error }`).
//
// `fromJson` do json_serializable sinh (`debt_dtos.g.dart`; sửa file này xong
// chạy `dart run build_runner build`). Mọi field nullable, không validate —
// mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'debt_dtos.g.dart';

/// Một phần tử của `data` trong `GET /api/reports/debt`.
@JsonSerializable(createToJson: false)
class CustomerDebtDto {
  const CustomerDebtDto({
    this.customerId,
    this.customerName,
    this.outstandingDebt,
    this.lastPaymentDate,
  });

  factory CustomerDebtDto.fromJson(Map<String, dynamic> json) =>
      _$CustomerDebtDtoFromJson(json);

  final String? customerId;
  final String? customerName;
  final num? outstandingDebt;

  /// ISO 8601; `null` hợp lệ: khách chưa từng trả.
  final String? lastPaymentDate;
}

/// Một dòng sổ nợ: phần tử của `data` trong ledger, và `data.payment` của
/// lần ghi nhận thu tiền.
@JsonSerializable(createToJson: false)
class LedgerEntryDto {
  const LedgerEntryDto({
    this.id,
    this.customerId,
    this.type,
    this.amount,
    this.notes,
    this.createdAt,
  });

  factory LedgerEntryDto.fromJson(Map<String, dynamic> json) =>
      _$LedgerEntryDtoFromJson(json);

  final String? id;
  final String? customerId;

  /// `DEBT | PAYMENT`.
  final String? type;
  final num? amount;
  final String? notes;
  final String? createdAt;
}

/// `data` của `POST /api/customers/{id}/payments`.
@JsonSerializable(createToJson: false)
class PaymentReceiptDto {
  const PaymentReceiptDto({this.payment, this.outstandingDebt});

  factory PaymentReceiptDto.fromJson(Map<String, dynamic> json) =>
      _$PaymentReceiptDtoFromJson(json);

  final LedgerEntryDto? payment;
  final num? outstandingDebt;
}
