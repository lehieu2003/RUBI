import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';
import 'package:iceflow_mobile/features/products/domain/repositories/products_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Sản phẩm & giá" (Quản lý).
class ProductsState extends Equatable {
  const ProductsState({
    required this.status,
    this.products = const [],
    this.errorMessage,
  });

  final ViewStatus status;

  /// Mọi sản phẩm, theo tên rồi kích cỡ.
  final List<Product> products;
  final String? errorMessage;

  /// Sản phẩm đang bán.
  List<Product> get onSale => [
        for (final product in products)
          if (product.isActive) product,
      ];

  /// Sản phẩm đã ngừng bán.
  List<Product> get discontinued => [
        for (final product in products)
          if (!product.isActive) product,
      ];

  @override
  List<Object?> get props => [status, products, errorMessage];
}

/// Kết quả một thao tác trên sản phẩm, để màn hình báo cho người dùng.
typedef ProductActionResult = ({bool ok, String message});

/// State management màn "Sản phẩm & giá": danh sách, thêm, đổi giá, sửa,
/// ngừng bán / bán lại.
@injectable
class ProductsCubit extends Cubit<ProductsState> {
  ProductsCubit({required this._repo})
      : super(const ProductsState(status: ViewStatus.loading));

  final ProductsRepository _repo;

  Future<void> load() async {
    emit(ProductsState(status: ViewStatus.loading, products: state.products));
    final res = await _repo.getProducts();
    if (isClosed) return;
    switch (res) {
      case Ok<List<Product>>(:final value):
        emit(ProductsState(status: ViewStatus.loaded, products: value));
      case Err<List<Product>>(:final failure):
        emit(
          ProductsState(
            status: ViewStatus.error,
            // Lỗi khi làm mới thì giữ danh sách đang xem.
            products: state.products,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Thêm sản phẩm cùng giá mặc định; thành công thì tải lại danh sách (để
  /// sản phẩm mới đứng đúng thứ tự).
  Future<ProductActionResult> create({
    required String name,
    required int sizeKg,
    required double price,
    String? unit,
    int? minStock,
  }) async {
    final res = await _repo.createProduct(
      name: name,
      sizeKg: sizeKg,
      price: price,
      unit: unit,
      minStock: minStock,
    );
    switch (res) {
      case Ok<Product>(:final value):
        if (!isClosed) await load();
        return (ok: true, message: AppStrings.productCreated(value.label));
      case Err<Product>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }

  /// Đổi giá mặc định. Đơn đã lên giữ giá cũ; đơn mới tính giá này.
  Future<ProductActionResult> setPrice(Product product, double price) async {
    switch (await _repo.setPrice(product.id, price)) {
      case Ok<void>():
        _replace(product.copyWith(price: price));
        return (
          ok: true,
          message: AppStrings.productPriceSet(product.label, formatVnd(price)),
        );
      case Err<void>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }

  /// Sửa tên, đơn vị và mức cảnh báo tồn kho ([minStock] `null` là tắt).
  Future<ProductActionResult> edit(
    Product product, {
    required String name,
    required String unit,
    required int? minStock,
  }) =>
      _update(
        _repo.updateProduct(
          product.id,
          name: name,
          unit: unit,
          minStock: minStock,
          clearMinStock: minStock == null,
          currentPrice: product.price,
        ),
        (updated) => AppStrings.productSaved(updated.label),
      );

  /// Ngừng bán hoặc bán lại một sản phẩm.
  Future<ProductActionResult> setActive(Product product, {required bool active}) =>
      _update(
        _repo.updateProduct(
          product.id,
          isActive: active,
          currentPrice: product.price,
        ),
        (updated) => active
            ? AppStrings.productResumed(updated.label)
            : AppStrings.productStopped(updated.label),
      );

  Future<ProductActionResult> _update(
    Future<Result<Product>> request,
    String Function(Product updated) message,
  ) async {
    switch (await request) {
      case Ok<Product>(:final value):
        _replace(value);
        return (ok: true, message: message(value));
      case Err<Product>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }

  void _replace(Product updated) {
    if (isClosed) return;
    emit(
      ProductsState(
        status: state.status,
        products: [
          for (final product in state.products)
            product.id == updated.id ? updated : product,
        ],
        errorMessage: state.errorMessage,
      ),
    );
  }
}
