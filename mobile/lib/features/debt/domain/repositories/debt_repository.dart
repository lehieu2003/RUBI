import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';

/// Contract cho công nợ khách hàng (chỉ Quản lý — server trả 403 cho vai
/// trò khác).
abstract class DebtRepository {
  const DebtRepository();

  /// Các khách đang nợ, nợ nhiều nhất trước.
  Future<Result<List<CustomerDebt>>> getDebts();

  /// Sổ nợ của một khách (ghi nợ và thu tiền), mới nhất trước.
  Future<Result<Paginated<LedgerEntry>>> getLedger(
    String customerId, {
    PageParams page = const PageParams(),
  });

  /// Ghi nhận tiền thu của khách. [amount] là VND nguyên, lớn hơn 0.
  ///
  /// Thu nhiều hơn số đang nợ → `Err(ServerFailure)` 409 với câu tiếng Việt
  /// của server.
  Future<Result<PaymentReceipt>> recordPayment({
    required String customerId,
    required int amount,
    String? notes,
  });
}
