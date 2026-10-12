import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/domain/shift_rules.dart';
import 'package:iceflow_mobile/features/schedule/domain/team_schedule_rules.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:injectable/injectable.dart';

/// State của tab "Duyệt ca" (Quản lý).
class TeamScheduleState extends Equatable {
  const TeamScheduleState({
    required this.status,
    required this.weekStart,
    required this.selectedDate,
    this.people,
    this.errorMessage,
    this.busy = false,
  });

  final ViewStatus status;

  /// Thứ Hai của tuần đang xem.
  final DateTime weekStart;
  final DateTime selectedDate;

  /// Lịch cả nhóm của tuần; `null` khi chưa tải được lần nào.
  final List<SchedulePerson>? people;
  final String? errorMessage;

  /// Đang gửi một lần duyệt / từ chối (chặn bấm đôi).
  final bool busy;

  /// Các khung giờ có người của [selectedDate].
  List<TeamSlot> get slots => people == null
      ? const []
      : TeamScheduleRules.slotsOf(people!, selectedDate);

  /// Mọi yêu cầu chờ duyệt trong tuần.
  List<Shift> get pending =>
      people == null ? const [] : TeamScheduleRules.pending(people!);

  @override
  List<Object?> get props =>
      [status, weekStart, selectedDate, people, errorMessage, busy];
}

/// State management tab "Duyệt ca": lịch cả nhóm theo tuần, duyệt và từ chối
/// yêu cầu ca.
@injectable
class TeamScheduleCubit extends Cubit<TeamScheduleState> {
  // `now` chỉ để test cố định ngày; DI không cấp (dùng đồng hồ của máy).
  TeamScheduleCubit({
    required this._repo,
    @ignoreParam DateTime Function()? now,
  })  : _now = now ?? DateTime.now,
        super(_initial((now ?? DateTime.now)()));

  final TeamScheduleRepository _repo;
  final DateTime Function() _now;

  static TeamScheduleState _initial(DateTime now) {
    final today = DateTime(now.year, now.month, now.day);
    return TeamScheduleState(
      status: ViewStatus.loading,
      weekStart: ShiftRules.mondayOf(today),
      selectedDate: today,
    );
  }

  /// Tải (lại) tuần đang xem.
  Future<void> load() async {
    emit(
      TeamScheduleState(
        status: ViewStatus.loading,
        weekStart: state.weekStart,
        selectedDate: state.selectedDate,
        people: state.people,
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
      TeamScheduleState(
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
      TeamScheduleState(
        status: state.status,
        weekStart: state.weekStart,
        selectedDate: DateTime(date.year, date.month, date.day),
        people: state.people,
        errorMessage: state.errorMessage,
        busy: state.busy,
      ),
    );
  }

  /// Duyệt ([approve] = true) hoặc từ chối các ca trong [shifts].
  ///
  /// Trả `null` khi lời gọi bị bỏ qua (đang gửi lần khác, hoặc không có ca
  /// nào).
  Future<ShiftActionResult?> review(
    List<Shift> shifts, {
    required bool approve,
  }) async {
    final ids = [for (final shift in shifts) if (shift.id != null) shift.id!];
    if (state.busy || ids.isEmpty) return null;
    _emitBusy(true);

    final res = await _repo.reviewShifts(shiftIds: ids, approve: approve);
    if (isClosed) return null;

    final ShiftActionResult outcome = switch (res) {
      Ok<int>(:final value) => (
          ok: true,
          message: approve
              ? AppStrings.shiftsApproved(value)
              : AppStrings.shiftsRejected(value),
        ),
      Err<int>(:final failure) => (ok: false, message: failureMessage(failure)),
    };
    // Thành công, hoặc server từ chối vì lịch đã đổi (409: tháng đã chốt
    // công): lấy lại lịch thật.
    final stale = res is Err<int> &&
        res.failure is ServerFailure &&
        (res.failure as ServerFailure).statusCode == 409;
    if (outcome.ok || stale) {
      await _fetch(silent: true);
      if (isClosed) return outcome;
    }
    _emitBusy(false);
    return outcome;
  }

  void _emitBusy(bool busy) {
    emit(
      TeamScheduleState(
        status: state.status,
        weekStart: state.weekStart,
        selectedDate: state.selectedDate,
        people: state.people,
        errorMessage: state.errorMessage,
        busy: busy,
      ),
    );
  }

  /// [silent]: giữ nguyên màn hình trong lúc tải; lỗi thì giữ lịch cũ.
  Future<void> _fetch({bool silent = false}) async {
    final weekStart = state.weekStart;
    final res = await _repo.getTeamWeek(weekStart);
    // Màn hình đã đóng, hoặc người dùng đã sang tuần khác trong lúc chờ.
    if (isClosed || state.weekStart != weekStart) return;
    switch (res) {
      case Ok<List<SchedulePerson>>(:final value):
        emit(
          TeamScheduleState(
            status: ViewStatus.loaded,
            weekStart: weekStart,
            selectedDate: state.selectedDate,
            people: value,
            busy: state.busy,
          ),
        );
      case Err<List<SchedulePerson>>(:final failure):
        if (silent) return;
        emit(
          TeamScheduleState(
            status: ViewStatus.error,
            weekStart: weekStart,
            selectedDate: state.selectedDate,
            people: state.people,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }
}
