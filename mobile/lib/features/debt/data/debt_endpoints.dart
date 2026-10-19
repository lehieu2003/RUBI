/// Endpoint definitions cho tính năng Debt (Công nợ).
abstract final class DebtEndpoints {
  static const debtReport = '/api/reports/debt';
  static String customerLedger(String customerId) => '/api/customers/$customerId/ledger';
  static String customerPayments(String customerId) => '/api/customers/$customerId/payments';
}

