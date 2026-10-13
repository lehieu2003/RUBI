import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';

/// Contract cho sản phẩm và giá mặc định (chỉ Quản lý).
abstract class ProductsRepository {
  const ProductsRepository();

  /// Mọi sản phẩm kèm giá mặc định, kể cả sản phẩm đã ngừng bán, theo tên
  /// rồi kích cỡ.
  Future<Result<List<Product>>> getProducts();

  /// Thêm sản phẩm cùng giá mặc định của nó. [unit] bỏ trống thì server
  /// dùng "Bao".
  ///
  /// Trùng tên và kích cỡ với sản phẩm đã có (kể cả đã ngừng bán) →
  /// `Err(ServerFailure)` 409.
  Future<Result<Product>> createProduct({
    required String name,
    required int sizeKg,
    required double price,
    String? unit,
    int? minStock,
  });

  /// Sửa một sản phẩm; chỉ các trường được truyền mới đổi. [clearMinStock]
  /// tắt cảnh báo tồn kho (ưu tiên hơn [minStock]). Giá không đổi ở đây, xem
  /// [setPrice]; trả về sản phẩm với giá [currentPrice] đang biết.
  Future<Result<Product>> updateProduct(
    String id, {
    String? name,
    String? unit,
    int? minStock,
    bool clearMinStock = false,
    bool? isActive,
    double? currentPrice,
  });

  /// Đặt giá mặc định của một sản phẩm.
  Future<Result<void>> setPrice(String productId, double price);
}
