import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/debt/data/dto/debt_dtos.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';

/// Chuyển DTO công nợ → domain. Đây là tiền: thiếu số, loại dòng lạ hay ngày
/// không đọc được đều là payload hỏng, không suy mặc định.
abstract final class DebtMapper {
  static Result<CustomerDebt> fromDebtDto(CustomerDebtDto dto) {
    final customerId = MappingValidator.nonEmpty(dto.customerId);
    if (customerId == null) {
      return Err(MappingValidator.missing('Debt', 'customerId'));
    }
    final customerName = MappingValidator.nonEmpty(dto.customerName);
    if (customerName == null) {
      return Err(MappingValidator.missing('Debt', 'customerName'));
    }
    final outstandingDebt = dto.outstandingDebt;
    if (outstandingDebt == null) {
      return Err(MappingValidator.missing('Debt', 'outstandingDebt'));
    }
    // Có mà không đọc được → hỏng; không có → chưa từng trả.
    final lastPaymentAt = MappingValidator.dateTime(dto.lastPaymentDate);
    if (dto.lastPaymentDate != null && lastPaymentAt == null) {
      return const Err(
        UnexpectedFailure('Debt payload unparseable `lastPaymentDate`'),
      );
    }
    return Ok(
      CustomerDebt(
        customerId: customerId,
        customerName: customerName,
        outstandingDebt: outstandingDebt.toDouble(),
        lastPaymentAt: lastPaymentAt,
      ),
    );
  }

  static Result<LedgerEntry> fromEntryDto(LedgerEntryDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) {
      return Err(MappingValidator.missing('Ledger entry', 'id'));
    }
    final customerId = MappingValidator.nonEmpty(dto.customerId);
    if (customerId == null) {
      return Err(MappingValidator.missing('Ledger entry', 'customerId'));
    }
    final type = LedgerEntryType.fromName(dto.type);
    if (type == null) {
      return Err(UnexpectedFailure('Unknown ledger entry type: ${dto.type}'));
    }
    final amount = dto.amount;
    if (amount == null) {
      return Err(MappingValidator.missing('Ledger entry', 'amount'));
    }
    final createdAt = MappingValidator.dateTime(dto.createdAt);
    if (createdAt == null) {
      return const Err(
        UnexpectedFailure('Ledger entry payload missing/unparseable `createdAt`'),
      );
    }
    return Ok(
      LedgerEntry(
        id: id,
        customerId: customerId,
        type: type,
        amount: amount.toDouble(),
        createdAt: createdAt,
        notes: MappingValidator.nonEmpty(dto.notes),
      ),
    );
  }

  static Result<PaymentReceipt> fromReceiptDto(PaymentReceiptDto dto) {
    final payment = dto.payment;
    if (payment == null) {
      return Err(MappingValidator.missing('Payment', 'payment'));
    }
    final outstandingDebt = dto.outstandingDebt;
    if (outstandingDebt == null) {
      return Err(MappingValidator.missing('Payment', 'outstandingDebt'));
    }
    return switch (fromEntryDto(payment)) {
      Ok<LedgerEntry>(:final value) => Ok(
          PaymentReceipt(
            entry: value,
            outstandingDebt: outstandingDebt.toDouble(),
          ),
        ),
      Err<LedgerEntry>(:final failure) => Err(failure),
    };
  }
}
