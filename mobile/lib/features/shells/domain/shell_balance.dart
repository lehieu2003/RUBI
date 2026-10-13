import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/core/result/result.dart';

/// Số vỏ bao một khách đang giữ và tiền cọc tương ứng.
class ShellBalance extends Equatable {
  const ShellBalance({
    required this.customerId,
    required this.customerName,
    required this.shellsOut,
    required this.shellsIn,
    required this.depositPerShell,
    required this.netDepositOwed,
  });

  final String customerId;
  final String customerName;

  /// Tổng số vỏ đã giao cho khách.
  final int shellsOut;

  /// Tổng số vỏ khách đã trả về.
  final int shellsIn;
  final double depositPerShell;

  /// Tiền cọc của số vỏ khách còn giữ, như server tính.
  final double netDepositOwed;

  /// Số vỏ khách còn giữ.
  int get held => shellsOut - shellsIn;

  @override
  List<Object?> get props => [
        customerId,
        customerName,
        shellsOut,
        shellsIn,
        depositPerShell,
        netDepositOwed,
      ];
}

/// Contract cho sổ vỏ bao (chỉ Quản lý).
abstract class ShellsRepository {
  const ShellsRepository();

  /// Các khách có phát sinh vỏ bao, khách giữ nhiều tiền cọc nhất trước.
  Future<Result<List<ShellBalance>>> getBalances();

  /// Ghi thêm vỏ giao cho khách ([shellsOut]) và vỏ thu về ([shellsIn]);
  /// hai số cộng vào tổng hiện có.
  Future<Result<void>> record({
    required String customerId,
    int shellsOut = 0,
    int shellsIn = 0,
  });

  /// Sửa lại cả hai tổng (khi đã nhập nhầm): [shellsOut] và [shellsIn] thay
  /// cho số đang lưu.
  Future<Result<void>> correct({
    required String customerId,
    required int shellsOut,
    required int shellsIn,
  });
}
