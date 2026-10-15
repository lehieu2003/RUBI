import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn sổ nợ một khách.
class LedgerState extends Equatable {
  const LedgerState({
    required this.status,
    required this.outstandingDebt,
    this.entries = const [],
    this.hasMore = false,
    this.nextPage = const PageParams(),
    this.loadingMore = false,
    this.errorMessage,
  });

  final ViewStatus status;

  /// Số còn nợ: lấy từ danh sách công nợ lúc mở, cập nhật sau mỗi lần thu.
  final double outstandingDebt;

  /// Các dòng đã tải, mới nhất trước.
  final List<LedgerEntry> entries;
  final bool hasMore;
  final PageParams nextPage;
  final bool loadingMore;
  final String? errorMessage;

  @override
  List<Object?> get props => [
        status,
        outstandingDebt,
        entries,
        hasMore,
        nextPage,
        loadingMore,
        errorMessage,
      ];
}

/// Kết quả ghi nhận một lần thu tiền, để màn hình báo cho người dùng.
/// [unsure]: mất response, không biết server đã lưu chưa — sổ đã được tải
/// lại, màn hình đóng sheet thay vì mời gửi lại.
typedef PaymentResult = ({bool ok, bool unsure, String message});

/// State management màn sổ nợ: các dòng ghi nợ / thu tiền của một khách
/// (tải dần theo trang) và ghi nhận thu tiền.
@injectable
class LedgerCubit extends Cubit<LedgerState> {
  LedgerCubit({
    required this._repo,
    @factoryParam required CustomerDebt debt,
  })  : _customerId = debt.customerId,
        super(
          LedgerState(
            status: ViewStatus.loading,
            outstandingDebt: debt.outstandingDebt,
          ),
        );

  final DebtRepository _repo;
  final String _customerId;

  /// Tải lại từ trang đầu.
  Future<void> load() async {
    emit(
      LedgerState(
        status: ViewStatus.loading,
        outstandingDebt: state.outstandingDebt,
        entries: state.entries,
      ),
    );
    final res = await _repo.getLedger(_customerId);
    if (isClosed) return;
    switch (res) {
      case Ok<Paginated<LedgerEntry>>(:final value):
        emit(
          LedgerState(
            status: ViewStatus.loaded,
            outstandingDebt: state.outstandingDebt,
            entries: value.items,
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<LedgerEntry>>(:final failure):
        emit(
          LedgerState(
            status: ViewStatus.error,
            outstandingDebt: state.outstandingDebt,
            entries: state.entries,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Tải trang kế tiếp và nối vào cuối danh sách.
  Future<void> loadMore() async {
    if (!state.hasMore || state.loadingMore) return;
    emit(_copy(loadingMore: true));
    final res = await _repo.getLedger(_customerId, page: state.nextPage);
    if (isClosed) return;
    switch (res) {
      case Ok<Paginated<LedgerEntry>>(:final value):
        emit(
          LedgerState(
            status: ViewStatus.loaded,
            outstandingDebt: state.outstandingDebt,
            entries: [...state.entries, ...value.items],
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<LedgerEntry>>(:final failure):
        emit(_copy(loadingMore: false, errorMessage: failureMessage(failure)));
    }
  }

  /// Ghi nhận [amount] VND khách vừa trả.
  Future<PaymentResult> recordPayment(int amount, {String? notes}) async {
    final res = await _repo.recordPayment(
      customerId: _customerId,
      amount: amount,
      notes: notes,
    );
    switch (res) {
      case Ok<PaymentReceipt>(:final value):
        if (!isClosed) {
          emit(
            LedgerState(
              status: state.status,
              outstandingDebt: value.outstandingDebt,
              // Dòng vừa ghi là mới nhất: lên đầu, không cần tải lại.
              entries: [value.entry, ...state.entries],
              hasMore: state.hasMore,
              nextPage: state.nextPage,
            ),
          );
        }
        return (
          ok: true,
          unsure: false,
          message: AppStrings.paymentSaved(
            formatVnd(amount.toDouble()),
            formatVnd(value.outstandingDebt),
          ),
        );
      case Err<PaymentReceipt>(:final failure):
        if (failure is NetworkFailure && failure.outcomeUnknown) {
          // Server có thể đã ghi: tải lại sổ để người dùng tự kiểm.
          if (!isClosed) await load();
          return (ok: false, unsure: true, message: AppStrings.paymentUnsure);
        }
        return (ok: false, unsure: false, message: failureMessage(failure));
    }
  }

  LedgerState _copy({required bool loadingMore, String? errorMessage}) =>
      LedgerState(
        status: state.status,
        outstandingDebt: state.outstandingDebt,
        entries: state.entries,
        hasMore: state.hasMore,
        nextPage: state.nextPage,
        loadingMore: loadingMore,
        errorMessage: errorMessage,
      );
}
