/// Endpoint definitions cho tính năng Customers.
abstract final class CustomersEndpoints {
  static const customers = '/api/customers';
  static String customerPrices(String customerId) => '/api/customers/$customerId/prices';
  static const customerOverridePrice = '/api/prices/customer/override';
}

