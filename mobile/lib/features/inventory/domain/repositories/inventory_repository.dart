import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';

/// Contract cho kho lạnh (chỉ Quản lý — server trả 403 cho vai trò khác).
abstract class InventoryRepository {
  const InventoryRepository();

  /// Tồn kho của mọi sản phẩm đang bán.
  Future<Result<Stock>> getStock();

  /// Nhập một mẻ sản xuất: cộng [quantity] vào tồn của [productId].
  /// Trả tồn trên sổ sau khi nhập.
  ///
  /// [idempotencyKey]: mã của lần gửi này (xem `SubmissionKey`); gửi lại với
  /// cùng mã thì server không ghi lần nữa.
  Future<Result<int>> recordProduction({
    required String productId,
    required int quantity,
    String? idempotencyKey,
  });

  /// Kiểm kho: số đếm thực tế [counted] thay cho tồn trên sổ, và được giữ
  /// trong lịch sử kiểm kho cùng [note]. Trả tồn trên sổ sau khi kiểm.
  Future<Result<int>> recordCount({
    required String productId,
    required int counted,
    String? note,
  });
}
