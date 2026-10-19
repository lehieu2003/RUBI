/// Endpoint definitions cho tính năng Products (Sản phẩm & Giá).
abstract final class ProductsEndpoints {
  static const globalPrices = '/api/prices/global';
  static const products = '/api/products';
  static String productById(String id) => '/api/products/$id';
}

