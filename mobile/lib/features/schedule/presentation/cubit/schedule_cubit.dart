import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/domain/shift_rules.dart';
import 'package:injectable/injectable.dart';

/// State của tab "Ca làm".
class ScheduleState extends Equatable {
  const ScheduleState({
    required this.status,
    required this.weekStart,
    required this.selectedDate,
    this.week,
    this.errorMessage,
    this.busySlot,
  });

  final ViewStatus status;

  /// Thứ Hai của tuần đang xem.
  final DateTime weekStart;

  /// Ngày đang xem trong tuần.
  final DateTime selectedDate;

  /// Lịch của tuần; `null` khi chưa tải được lần nào.
  final WeekSchedule? week;

  /// Lỗi tải lịch.
  final String? errorMessage;

  /// Khung giờ đang chờ server (chặn bấm đôi); `null` khi không có.
  final ShiftSlot? busySlot;

  /// Tám khung giờ của [selectedDate]; rỗng khi chưa có lịch.
  List<SlotInfo> get slots {
    final week = this.week;
    return week == null ? const [] : ShiftRules.slotsOf(week, selectedDate);
  }

  @override
  List<Object?> get props =>
      [status, weekStart, selectedDate, week, errorMessage, busySlot];
}

/// Kết quả một lần đăng ký / huỷ ca, để màn hình báo cho người dùng.
typedef ShiftActionResult = ({bool ok, String message});

/// State management tab "Ca làm": xem lịch tuần của cả nhóm, đăng ký và huỷ
/// ca của chính mình.
@injectable
class ScheduleCubit extends Cubit<ScheduleState> {
  // `now` chỉ để test cố định ngày; DI không cấp (dùng đồng hồ của máy).
  ScheduleCubit({required this._repo, @ignoreParam DateTime Function()? now})
      : _now = now ?? DateTime.now,
        super(_initial((now ?? DateTime.now)()));

  final ScheduleRepository _repo;
  final DateTime Function() _now;

  static ScheduleState _initial(DateTime now) {
    final today = DateTime(now.year, now.month, now.day);
    return ScheduleState(
      status: ViewStatus.loading,
      weekStart: ShiftRules.mondayOf(today),
      selectedDate: today,
    );
  }

  /// Tải (lại) tuần đang xem.
  Future<void> load() async {
    emit(
      ScheduleState(
        status: ViewStatus.loading,
        weekStart: state.weekStart,
        selectedDate: state.selectedDate,
        week: state.week,
      ),
    );
    await _fetch();
  }

  /// Sang tuần trước ([delta] = -1) hoặc tuần sau (+1).
  Future<void> showWeek(int delta) async {
    final start = state.weekStart;
    final weekStart = DateTime(start.year, start.month, start.day + 7 * delta);
    final now = _now();
    final today = DateTime(now.year, now.month, now.day);
    final hasToday = !today.isBefore(weekStart) &&
        today.isBefore(DateTime(weekStart.year, weekStart.month, weekStart.day + 7));
    emit(
      ScheduleState(
        status: ViewStatus.loading,
        weekStart: weekStart,
        // Tuần này mở ở hôm nay; tuần khác mở ở thứ Hai.
        selectedDate: hasToday ? today : weekStart,
      ),
    );
    await _fetch();
  }

  void selectDay(DateTime date) {
    emit(
      ScheduleState(
        status: state.status,
        weekStart: state.weekStart,
        selectedDate: DateTime(date.year, date.month, date.day),
        week: state.week,
        errorMessage: state.errorMessage,
        busySlot: state.busySlot,
      ),
    );
  }

  /// Đăng ký khung giờ [info] của ngày đang xem, hoặc huỷ nếu mình đang có
  /// yêu cầu chờ duyệt. Ca bị từ chối thì xin lại; ca đã duyệt chỉ Quản lý
  /// đổi được.
  ///
  /// Trả `null` khi lời gọi bị bỏ qua (đang có khung giờ khác chờ server).
  Future<ShiftActionResult?> toggle(SlotInfo info) async {
    if (state.busySlot != null) return null;
    if (info.mine == ShiftStatus.approved) {
      return (ok: false, message: AppStrings.shiftApprovedLocked);
    }
    final date = state.selectedDate;
    final withdrawing = info.mine == ShiftStatus.pending;
    _emitBusy(info.slot);

    final Result<Object?> res = withdrawing
        ? await _repo.withdrawShift(date: date, slot: info.slot)
        : await _repo.requestShift(date: date, slot: info.slot);
    if (isClosed) return null;

    final ShiftActionResult outcome = switch (res) {
      Ok<Object?>() => (
          ok: true,
          message: withdrawing
              ? AppStrings.shiftWithdrawn
              : AppStrings.shiftRequested,
        ),
      Err<Object?>(:final failure) => (ok: false, message: failureMessage(failure)),
    };
    // Thành công, hoặc server từ chối vì lịch đã đổi (409: đủ người, đã
    // duyệt, đã chốt công): lấy lại lịch thật thay vì đoán.
    final stale = res is Err<Object?> &&
        res.failure is ServerFailure &&
        (res.failure as ServerFailure).statusCode == 409;
    if (outcome.ok || stale) {
      await _fetch(silent: true);
      if (isClosed) return outcome;
    }
    _emitBusy(null);
    return outcome;
  }

  void _emitBusy(ShiftSlot? slot) {
    emit(
      ScheduleState(
        status: state.status,
        weekStart: state.weekStart,
        selectedDate: state.selectedDate,
        week: state.week,
        errorMessage: state.errorMessage,
        busySlot: slot,
      ),
    );
  }

  /// [silent]: giữ nguyên màn hình trong lúc tải; lỗi thì giữ lịch cũ.
  Future<void> _fetch({bool silent = false}) async {
    final weekStart = state.weekStart;
    final res = await _repo.getWeek(weekStart);
    // Màn hình đã đóng, hoặc người dùng đã sang tuần khác trong lúc chờ.
    if (isClosed || state.weekStart != weekStart) return;
    switch (res) {
      case Ok<WeekSchedule>(:final value):
        emit(
          ScheduleState(
            status: ViewStatus.loaded,
            weekStart: weekStart,
            selectedDate: state.selectedDate,
            week: value,
            busySlot: state.busySlot,
          ),
        );
      case Err<WeekSchedule>(:final failure):
        if (silent) return;
        emit(
          ScheduleState(
            status: ViewStatus.error,
            weekStart: weekStart,
            selectedDate: state.selectedDate,
            week: state.week,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }
}
