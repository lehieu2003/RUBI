import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/extensions/search_text.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/order_entry_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Lên đơn": chọn khách, rồi nhập số lượng từng sản phẩm.
class OrderEntryState extends Equatable {
  const OrderEntryState({
    this.customersStatus = ViewStatus.loading,
    this.customers = const [],
    this.customersError,
    this.query = '',
    this.customer,
    this.productsStatus = ViewStatus.loading,
    this.products = const [],
    this.productsError,
    this.quantities = const {},
    this.submitting = false,
    this.submitError,
  });

  final ViewStatus customersStatus;
  final List<CustomerOption> customers;
  final String? customersError;

  /// Chữ đang gõ để tìm khách.
  final String query;

  /// Khách đang lên đơn; `null` = còn ở bước chọn khách.
  final CustomerOption? customer;

  final ViewStatus productsStatus;

  /// Sản phẩm đang bán với giá của [customer].
  final List<PricedProduct> products;
  final String? productsError;

  /// Số lượng đã nhập theo id sản phẩm; chỉ giữ dòng lớn hơn 0.
  final Map<String, int> quantities;
  final bool submitting;
  final String? submitError;

  /// Khách khớp [query]: tên, mã hoặc số điện thoại, không phân biệt dấu.
  List<CustomerOption> get matches {
    final needle = foldVietnamese(query.trim());
    if (needle.isEmpty) return customers;
    return [
      for (final customer in customers)
        if (foldVietnamese(customer.name).contains(needle) ||
            foldVietnamese(customer.code).contains(needle) ||
            customer.phone.contains(needle))
          customer,
    ];
  }

  int quantityOf(String productId) => quantities[productId] ?? 0;

  /// Số dòng hàng đã nhập.
  int get lineCount => quantities.length;

  /// Tổng tạm tính theo bảng giá đang hiện; con số chốt là của server.
  double get total {
    var sum = 0.0;
    for (final product in products) {
      sum += quantityOf(product.productId) * (product.price ?? 0);
    }
    return sum;
  }

  bool get canSubmit => customer != null && lineCount > 0 && !submitting;

  @override
  List<Object?> get props => [
        customersStatus,
        customers,
        customersError,
        query,
        customer,
        productsStatus,
        products,
        productsError,
        quantities,
        submitting,
        submitError,
      ];
}

/// State management màn "Lên đơn".
@injectable
class OrderEntryCubit extends Cubit<OrderEntryState> {
  OrderEntryCubit({required this._repo}) : super(const OrderEntryState());

  /// Trần cho một dòng: gõ nhầm thêm vài số không thành đơn chục nghìn bao.
  static const maxQuantity = 9999;

  final OrderEntryRepository _repo;

  /// Tăng mỗi lần đổi khách, để bảng giá về muộn của khách cũ không đè lên.
  int _generation = 0;

  Future<void> loadCustomers() async {
    emit(_copy(customersStatus: ViewStatus.loading, clearCustomersError: true));
    final res = await _repo.getCustomers();
    if (isClosed) return;
    switch (res) {
      case Ok<List<CustomerOption>>(:final value):
        emit(_copy(customersStatus: ViewStatus.loaded, customers: value));
      case Err<List<CustomerOption>>(:final failure):
        emit(
          _copy(
            customersStatus: ViewStatus.error,
            customersError: failureMessage(failure),
          ),
        );
    }
  }

  void search(String query) => emit(_copy(query: query));

  /// Chọn khách và tải bảng giá của khách đó.
  Future<void> selectCustomer(CustomerOption customer) {
    emit(
      OrderEntryState(
        customersStatus: state.customersStatus,
        customers: state.customers,
        customer: customer,
      ),
    );
    return loadPrices();
  }

  /// Quay lại bước chọn khách. Số lượng đã nhập bị bỏ: giá mỗi khách một khác.
  void changeCustomer() {
    _generation++;
    emit(
      OrderEntryState(
        customersStatus: state.customersStatus,
        customers: state.customers,
      ),
    );
  }

  Future<void> loadPrices() async {
    final customer = state.customer;
    if (customer == null) return;
    final generation = ++_generation;
    emit(_copy(productsStatus: ViewStatus.loading, clearProductsError: true));
    final res = await _repo.getPriceList(customer.id);
    if (isClosed || generation != _generation) return;
    switch (res) {
      case Ok<List<PricedProduct>>(:final value):
        emit(_copy(productsStatus: ViewStatus.loaded, products: value));
      case Err<List<PricedProduct>>(:final failure):
        emit(
          _copy(
            productsStatus: ViewStatus.error,
            productsError: failureMessage(failure),
          ),
        );
    }
  }

  /// Đặt số lượng một sản phẩm (0 = bỏ dòng). Sản phẩm chưa có giá thì bỏ qua.
  void setQuantity(String productId, int quantity) {
    if (state.submitting) return;
    final known = state.products.any(
      (product) => product.productId == productId && product.canOrder,
    );
    if (!known) return;
    final clamped = quantity.clamp(0, maxQuantity);
    final next = {...state.quantities};
    if (clamped == 0) {
      next.remove(productId);
    } else {
      next[productId] = clamped;
    }
    emit(_copy(quantities: next, clearSubmitError: true));
  }

  /// Gửi đơn. Trả đơn vừa lên, hoặc `null` khi không gửi được (lý do nằm ở
  /// `submitError`).
  Future<CreatedOrder?> submit({String? notes}) async {
    final customer = state.customer;
    if (customer == null || !state.canSubmit) return null;
    emit(_copy(submitting: true, clearSubmitError: true));
    final res = await _repo.createOrder(
      customerId: customer.id,
      quantities: state.quantities,
      notes: notes,
    );
    if (isClosed) return null;
    switch (res) {
      case Ok<CreatedOrder>(:final value):
        emit(_copy(submitting: false));
        return value;
      case Err<CreatedOrder>(:final failure):
        emit(
          _copy(
            submitting: false,
            // Rớt mạng giữa chừng: không biết server đã lưu hay chưa.
            submitError: failure is NetworkFailure
                ? AppStrings.orderEntryUnsure
                : failureMessage(failure),
          ),
        );
        return null;
    }
  }

  OrderEntryState _copy({
    ViewStatus? customersStatus,
    List<CustomerOption>? customers,
    String? customersError,
    bool clearCustomersError = false,
    String? query,
    ViewStatus? productsStatus,
    List<PricedProduct>? products,
    String? productsError,
    bool clearProductsError = false,
    Map<String, int>? quantities,
    bool? submitting,
    String? submitError,
    bool clearSubmitError = false,
  }) =>
      OrderEntryState(
        customersStatus: customersStatus ?? state.customersStatus,
        customers: customers ?? state.customers,
        customersError:
            clearCustomersError ? null : customersError ?? state.customersError,
        query: query ?? state.query,
        customer: state.customer,
        productsStatus: productsStatus ?? state.productsStatus,
        products: products ?? state.products,
        productsError:
            clearProductsError ? null : productsError ?? state.productsError,
        quantities: quantities ?? state.quantities,
        submitting: submitting ?? state.submitting,
        submitError: clearSubmitError ? null : submitError ?? state.submitError,
      );
}
