import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/shells/domain/shell_balance.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Vỏ bao" (Quản lý).
class ShellsState extends Equatable {
  const ShellsState({
    required this.status,
    this.balances = const [],
    this.errorMessage,
  });

  final ViewStatus status;
  final List<ShellBalance> balances;
  final String? errorMessage;

  /// Tổng số vỏ khách đang giữ.
  int get totalHeld => balances.fold(0, (sum, balance) => sum + balance.held);

  /// Tổng tiền cọc của số vỏ đó.
  double get totalDeposit =>
      balances.fold(0, (sum, balance) => sum + balance.netDepositOwed);

  @override
  List<Object?> get props => [status, balances, errorMessage];
}

/// Kết quả một lần ghi vỏ, để màn hình báo cho người dùng.
/// [unsure]: mất response, không biết server đã lưu chưa — danh sách đã được
/// tải lại, màn hình đóng hộp thay vì mời gửi lại.
typedef ShellActionResult = ({bool ok, bool unsure, String message});

/// State management màn "Vỏ bao": số vỏ từng khách đang giữ, ghi vỏ giao /
/// thu, sửa lại tổng.
@injectable
class ShellsCubit extends Cubit<ShellsState> {
  ShellsCubit({required this._repo})
      : super(const ShellsState(status: ViewStatus.loading));

  final ShellsRepository _repo;

  Future<void> load() async {
    emit(ShellsState(status: ViewStatus.loading, balances: state.balances));
    final res = await _repo.getBalances();
    if (isClosed) return;
    switch (res) {
      case Ok<List<ShellBalance>>(:final value):
        emit(ShellsState(status: ViewStatus.loaded, balances: value));
      case Err<List<ShellBalance>>(:final failure):
        emit(
          ShellsState(
            status: ViewStatus.error,
            // Lỗi khi làm mới thì giữ danh sách đang xem.
            balances: state.balances,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Ghi thêm vỏ giao và vỏ thu về của một khách.
  Future<ShellActionResult> record(
    ShellBalance balance, {
    required int shellsOut,
    required int shellsIn,
  }) =>
      _after(
        _repo.record(
          customerId: balance.customerId,
          shellsOut: shellsOut,
          shellsIn: shellsIn,
        ),
        AppStrings.shellsRecorded(balance.customerName, shellsOut, shellsIn),
      );

  /// Sửa lại cả hai tổng của một khách.
  Future<ShellActionResult> correct(
    ShellBalance balance, {
    required int shellsOut,
    required int shellsIn,
  }) =>
      _after(
        _repo.correct(
          customerId: balance.customerId,
          shellsOut: shellsOut,
          shellsIn: shellsIn,
        ),
        AppStrings.shellsCorrected(balance.customerName),
      );

  Future<ShellActionResult> _after(
    Future<Result<void>> request,
    String message,
  ) async {
    switch (await request) {
      case Ok<void>():
        // Số còn giữ và tiền cọc do server tính: lấy lại thay vì tự cộng.
        if (!isClosed) await load();
        return (ok: true, unsure: false, message: message);
      case Err<void>(:final failure):
        if (failure is NetworkFailure && failure.outcomeUnknown) {
          // Server có thể đã ghi: tải lại để người dùng tự kiểm.
          if (!isClosed) await load();
          return (ok: false, unsure: true, message: AppStrings.shellsUnsure);
        }
        return (ok: false, unsure: false, message: failureMessage(failure));
    }
  }
}
