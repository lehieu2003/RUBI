/// Endpoint definitions cho tính năng Orders.
abstract final class OrdersEndpoints {
  static const orders = '/api/orders';
  static const counts = '/api/orders/counts';
  static const bulkAssign = '/api/orders/bulk-assign';
  static String orderStatus(String id) => '/api/orders/$id/status';
  static String orderReconcile(String id) => '/api/orders/$id/reconcile';
  static const drivers = '/api/drivers';
}

