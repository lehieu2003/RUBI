import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Contract cho việc Quản lý xem và duyệt ca của cả nhóm (server trả 403 cho
/// vai trò khác). Tự đăng ký ca là [ScheduleRepository].
abstract class TeamScheduleRepository {
  const TeamScheduleRepository();

  /// Nhân viên và tài xế đang hoạt động, cùng các ca của họ trong 7 ngày bắt
  /// đầu từ [weekStart] (chỉ dùng phần năm/tháng/ngày). Mọi ca đều có
  /// [Shift.id]; ca bị từ chối cũng có mặt.
  Future<Result<List<SchedulePerson>>> getTeamWeek(DateTime weekStart);

  /// Duyệt ([approve] = true) hoặc từ chối các yêu cầu ca có id trong
  /// [shiftIds]. Trả số ca đã đổi.
  ///
  /// Có ca thuộc tháng đã chốt bảng công → `Err(ServerFailure)` 409.
  Future<Result<int>> reviewShifts({
    required List<String> shiftIds,
    required bool approve,
  });
}
