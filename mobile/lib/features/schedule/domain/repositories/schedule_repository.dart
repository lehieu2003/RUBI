import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';

/// Contract cho việc tự đăng ký ca làm (nhân viên / tài xế).
abstract class ScheduleRepository {
  const ScheduleRepository();

  /// Lịch cả nhóm trong 7 ngày bắt đầu từ [weekStart] (chỉ dùng phần
  /// năm/tháng/ngày, gửi `yyyy-MM-dd`).
  Future<Result<WeekSchedule>> getWeek(DateTime weekStart);

  /// Xin một ca cho chính mình — tạo ở trạng thái `pending`. Xin lại ca đã có
  /// thì trả ca đó nguyên trạng; ca `rejected` thành `pending` lại.
  ///
  /// Ngày/khung giờ đã qua (400), ca đủ người hoặc bảng công đã chốt (409)
  /// → `Err(ServerFailure)` với message tiếng Việt từ server.
  Future<Result<Shift>> requestShift({
    required DateTime date,
    required ShiftSlot slot,
  });

  /// Rút yêu cầu `pending`/`rejected` của chính mình. Ca đã duyệt hoặc tháng
  /// đã chốt → `Err(ServerFailure)` 409.
  Future<Result<void>> withdrawShift({
    required DateTime date,
    required ShiftSlot slot,
  });
}
