import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/extensions/search_text.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/domain/repositories/customers_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Khách hàng".
class CustomersState extends Equatable {
  const CustomersState({
    required this.status,
    this.customers = const [],
    this.query = '',
    this.errorMessage,
  });

  final ViewStatus status;

  /// Mọi khách đang hoạt động, theo tên.
  final List<Customer> customers;

  /// Chữ đang gõ để tìm.
  final String query;
  final String? errorMessage;

  /// Khách khớp [query]: tên, mã hoặc số điện thoại, không phân biệt dấu.
  List<Customer> get matches {
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

  @override
  List<Object?> get props => [status, customers, query, errorMessage];
}

/// Kết quả thêm khách, để màn hình báo cho người dùng.
typedef CustomerActionResult = ({bool ok, String message});

/// State management màn "Khách hàng": danh sách, tìm kiếm, thêm khách.
@injectable
class CustomersCubit extends Cubit<CustomersState> {
  CustomersCubit({required this._repo})
      : super(const CustomersState(status: ViewStatus.loading));

  final CustomersRepository _repo;

  Future<void> load() async {
    emit(
      CustomersState(
        status: ViewStatus.loading,
        customers: state.customers,
        query: state.query,
      ),
    );
    final res = await _repo.getCustomers();
    if (isClosed) return;
    switch (res) {
      case Ok<List<Customer>>(:final value):
        emit(
          CustomersState(
            status: ViewStatus.loaded,
            customers: value,
            query: state.query,
          ),
        );
      case Err<List<Customer>>(:final failure):
        emit(
          CustomersState(
            status: ViewStatus.error,
            // Lỗi khi làm mới thì giữ danh sách đang xem.
            customers: state.customers,
            query: state.query,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  void search(String query) => emit(
        CustomersState(
          status: state.status,
          customers: state.customers,
          query: query,
          errorMessage: state.errorMessage,
        ),
      );

  /// Thêm khách (chỉ Quản lý); thành công thì tải lại danh sách.
  Future<CustomerActionResult> create({
    required String code,
    required String name,
    String? address,
    String? phone,
  }) async {
    final res = await _repo.createCustomer(
      code: code,
      name: name,
      address: address,
      phone: phone,
    );
    switch (res) {
      case Ok<Customer>(:final value):
        if (!isClosed) await load();
        return (ok: true, message: AppStrings.customerCreated(value.name));
      case Err<Customer>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }
}

/// State của màn chi tiết một khách: bảng giá áp cho khách đó.
class CustomerDetailState extends Equatable {
  const CustomerDetailState({
    required this.status,
    this.prices = const [],
    this.errorMessage,
  });

  final ViewStatus status;
  final List<CustomerPrice> prices;
  final String? errorMessage;

  @override
  List<Object?> get props => [status, prices, errorMessage];
}

/// Tải bảng giá của một khách cho màn chi tiết.
@injectable
class CustomerDetailCubit extends Cubit<CustomerDetailState> {
  CustomerDetailCubit({
    required this._repo,
    @factoryParam required Customer customer,
  })  : _customerId = customer.id,
        super(const CustomerDetailState(status: ViewStatus.loading));

  final CustomersRepository _repo;
  final String _customerId;

  Future<void> load() async {
    emit(const CustomerDetailState(status: ViewStatus.loading));
    final res = await _repo.getPrices(_customerId);
    if (isClosed) return;
    switch (res) {
      case Ok<List<CustomerPrice>>(:final value):
        emit(CustomerDetailState(status: ViewStatus.loaded, prices: value));
      case Err<List<CustomerPrice>>(:final failure):
        emit(
          CustomerDetailState(
            status: ViewStatus.error,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }
}
