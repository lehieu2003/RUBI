import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';

/// Contract cho danh bạ khách hàng (Quản lý và Nhân viên; thêm khách chỉ
/// Quản lý).
abstract class CustomersRepository {
  const CustomersRepository();

  /// Mọi khách hàng đang hoạt động, theo tên. Không phân trang: màn hình tìm
  /// ngay trên máy.
  Future<Result<List<Customer>>> getCustomers();

  /// Bảng giá áp cho khách [customerId]: mọi sản phẩm đang bán, theo tên rồi
  /// kích cỡ.
  Future<Result<List<CustomerPrice>>> getPrices(String customerId);

  /// Thêm khách hàng (chỉ Quản lý). [code] và [name] bắt buộc.
  ///
  /// Mã đã có → `Err(ServerFailure)` 409 với câu của server.
  Future<Result<Customer>> createCustomer({
    required String code,
    required String name,
    String? address,
    String? phone,
  });
}
