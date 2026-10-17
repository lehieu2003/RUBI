import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';

/// Contract cho việc lên đơn (Quản lý và Nhân viên).
abstract class OrderEntryRepository {
  const OrderEntryRepository();

  /// Mọi khách hàng đang hoạt động, theo tên. Danh sách không phân trang:
  /// màn lên đơn tìm ngay trên máy cho nhanh.
  Future<Result<List<CustomerOption>>> getCustomers();

  /// Các sản phẩm đang bán với giá của khách [customerId] và số còn bán
  /// được, theo tên rồi kích cỡ.
  ///
  /// Khách không tồn tại → `Err(ServerFailure)` 404.
  Future<Result<List<PricedProduct>>> getPriceList(String customerId);

  /// Lên đơn cho [customerId]. [quantities] là số lượng theo id sản phẩm;
  /// dòng 0 không được gửi, và phải còn ít nhất một dòng. Không gửi giá:
  /// server tính theo bảng giá của khách.
  ///
  /// Không có dòng nào lớn hơn 0 → `Err(ValidationFailure)` mà không gọi
  /// server. Sản phẩm ngừng bán hoặc chưa có giá → `Err(ServerFailure)` 400.
  ///
  /// [idempotencyKey]: mã của lần gửi này (xem `SubmissionKey`); gửi lại với
  /// cùng mã thì server trả lại đơn đã lên, không lên thêm đơn.
  Future<Result<CreatedOrder>> createOrder({
    required String customerId,
    required Map<String, int> quantities,
    String? notes,
    String? idempotencyKey,
  });
}
