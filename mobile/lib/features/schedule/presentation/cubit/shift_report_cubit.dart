import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/shift_report_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Bảng công" (Quản lý).
class ShiftReportState extends Equatable {
  const ShiftReportState({
    required this.status,
    required this.month,
    this.report,
    this.errorMessage,
  });

  final ViewStatus status;

  /// Ngày đầu của tháng đang xem.
  final DateTime month;

  /// Bảng công của [month]; `null` khi chưa tải được.
  final ShiftReport? report;
  final String? errorMessage;

  @override
  List<Object?> get props => [status, month, report, errorMessage];
}

/// Kết quả chốt / mở công, để màn hình báo cho người dùng.
typedef ShiftReportActionResult = ({bool ok, String message});

/// State management màn "Bảng công": xem từng tháng, chốt hoặc mở lại công.
@injectable
class ShiftReportCubit extends Cubit<ShiftReportState> {
  ShiftReportCubit({
    required this._repo,
    @ignoreParam DateTime Function()? now,
  }) : super(
          ShiftReportState(
            status: ViewStatus.loading,
            month: _firstOf((now ?? DateTime.now)()),
          ),
        );

  final ShiftReportRepository _repo;

  /// Tăng mỗi lần đổi tháng, để bảng công về muộn của tháng cũ không đè lên.
  int _generation = 0;

  static DateTime _firstOf(DateTime date) => DateTime(date.year, date.month);

  Future<void> load() => _load(state.month, keep: true);

  Future<void> previousMonth() =>
      _load(DateTime(state.month.year, state.month.month - 1));

  Future<void> nextMonth() =>
      _load(DateTime(state.month.year, state.month.month + 1));

  Future<void> _load(DateTime month, {bool keep = false}) async {
    final generation = ++_generation;
    emit(
      ShiftReportState(
        status: ViewStatus.loading,
        month: month,
        report: keep ? state.report : null,
      ),
    );
    final res = await _repo.getReport(month);
    if (isClosed || generation != _generation) return;
    switch (res) {
      case Ok<ShiftReport>(:final value):
        emit(
          ShiftReportState(status: ViewStatus.loaded, month: month, report: value),
        );
      case Err<ShiftReport>(:final failure):
        emit(
          ShiftReportState(
            status: ViewStatus.error,
            month: month,
            report: state.report,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Chốt hoặc mở lại công của tháng đang xem.
  Future<ShiftReportActionResult> setLock({required bool locked}) async {
    final month = state.month;
    final res = await _repo.setLock(month, locked: locked);
    switch (res) {
      case Ok<DateTime?>(:final value):
        final report = state.report;
        if (!isClosed && report != null && month == state.month) {
          emit(
            ShiftReportState(
              status: state.status,
              month: month,
              report: ShiftReport(
                month: report.month,
                people: report.people,
                lockedAt: value,
              ),
              errorMessage: state.errorMessage,
            ),
          );
        }
        final label = AppStrings.shiftReportMonth(month.month, month.year);
        return (
          ok: true,
          message: value == null
              ? AppStrings.shiftReportReopened(label)
              : AppStrings.shiftReportLocked(label),
        );
      case Err<DateTime?>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }
}
