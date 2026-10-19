/// Endpoint definitions cho tính năng Driver.
abstract final class DriverEndpoints {
  static const drivers = '/api/drivers';
  static const driverOrders = '/api/driver/orders';
  static String confirmOrder(String orderId) => '/api/orders/$orderId/confirm';
}

