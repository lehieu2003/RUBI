import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/error/failure_messages.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/driver/domain/entities/delivery_order.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart';

/// Trạng thái tab "Lịch sử" của driver.
enum HistoryStatus { loading, loaded, error }

/// State của [HistoryCubit]. [selectedDate] luôn là ngày (bỏ phần giờ).
class HistoryState extends Equatable {
  const HistoryState({
    required this.status,
    required this.selectedDate,
    this.orders = const [],
    this.errorMessage,
  });

  final HistoryStatus status;

  /// Ngày đang xem (date-only). Chỉ xem được từ hôm qua lùi về tối đa
  /// 30 ngày.
  final DateTime selectedDate;
  final List<DeliveryOrder> orders;

  /// Thông báo khi chọn ngày ngoài phạm vi hoặc khi tải lỗi.
  final String? errorMessage;

  @override
  List<Object?> get props => [status, selectedDate, orders, errorMessage];
}

/// State management tab "Lịch sử": driver xem lại các ngày đã giao (tối đa
/// 30 ngày, không được xem tương lai).
///
/// Constructor KHÔNG tự load — HistoryTab gọi `selectDate(initial)` hoặc
/// `load()` trong initState để có dữ liệu lần đầu.
class HistoryCubit extends Cubit<HistoryState> {
  HistoryCubit({required this._getOrders})
      : super(HistoryState(
          status: HistoryStatus.loading,
          selectedDate: _dateOnly(DateTime.now()).subtract(_oneDay),
        ));

  static const _oneDay = Duration(days: 1);
  static const _maxLookBackDays = 30;

  final GetOrdersForDateUseCase _getOrders;

  /// Chọn ngày để xem. Ngày ngoài phạm vi (tương lai / quá 30 ngày) KHÔNG
  /// được nhận thầm: giữ nguyên lựa chọn cũ và báo message tương ứng.
  Future<void> selectDate(DateTime date) async {
    final chosen = _dateOnly(date);
    final today = _dateOnly(DateTime.now());
    final yesterday = today.subtract(_oneDay);
    final oldest = today.subtract(const Duration(days: _maxLookBackDays));

    if (chosen.isAfter(yesterday)) {
      emit(HistoryState(
        status: state.status,
        selectedDate: state.selectedDate,
        orders: state.orders,
        errorMessage: AppStrings.historyFutureDate,
      ));
      return;
    }
    if (chosen.isBefore(oldest)) {
      emit(HistoryState(
        status: state.status,
        selectedDate: state.selectedDate,
        orders: state.orders,
        errorMessage: AppStrings.historyRangeLimit,
      ));
      return;
    }

    emit(HistoryState(status: HistoryStatus.loading, selectedDate: chosen));
    await _fetch();
  }

  /// Tải lại [HistoryState.selectedDate] hiện tại (HistoryTab initState gọi
  /// lần đầu; cũng dùng để thử lại sau lỗi).
  Future<void> load() async {
    emit(HistoryState(
      status: HistoryStatus.loading,
      selectedDate: state.selectedDate,
    ));
    await _fetch();
  }

  Future<void> _fetch() async {
    final res = await _getOrders(state.selectedDate);
    switch (res) {
      case Ok<List<DeliveryOrder>>(:final value):
        emit(HistoryState(
          status: HistoryStatus.loaded,
          selectedDate: state.selectedDate,
          orders: value,
        ));
      case Err<List<DeliveryOrder>>(:final failure):
        emit(HistoryState(
          status: HistoryStatus.error,
          selectedDate: state.selectedDate,
          errorMessage: failureMessage(failure),
        ));
    }
  }

  static DateTime _dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);
}
