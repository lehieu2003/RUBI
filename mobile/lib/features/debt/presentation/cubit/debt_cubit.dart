import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:injectable/injectable.dart';

/// State của tab "Công nợ" (Quản lý).
class DebtState extends Equatable {
  const DebtState({required this.status, this.debts, this.errorMessage});

  final ViewStatus status;

  /// Các khách đang nợ, nợ nhiều nhất trước; `null` khi chưa tải được.
  final List<CustomerDebt>? debts;
  final String? errorMessage;

  /// Tổng số tiền khách còn nợ.
  double get totalOutstanding => (debts ?? const [])
      .fold(0, (sum, debt) => sum + (debt.outstandingDebt > 0 ? debt.outstandingDebt : 0));

  @override
  List<Object?> get props => [status, debts, errorMessage];
}

/// State management tab "Công nợ": danh sách khách đang nợ.
@injectable
class DebtCubit extends Cubit<DebtState> {
  DebtCubit({required this._repo})
      : super(const DebtState(status: ViewStatus.loading));

  final DebtRepository _repo;

  /// Tải (lại) danh sách; giữ danh sách đang hiện trong lúc tải.
  Future<void> load() async {
    emit(DebtState(status: ViewStatus.loading, debts: state.debts));
    final res = await _repo.getDebts();
    if (isClosed) return;
    switch (res) {
      case Ok<List<CustomerDebt>>(:final value):
        emit(DebtState(status: ViewStatus.loaded, debts: value));
      case Err<List<CustomerDebt>>(:final failure):
        emit(
          DebtState(
            status: ViewStatus.error,
            debts: state.debts,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }
}
