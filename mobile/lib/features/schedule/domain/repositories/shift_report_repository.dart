import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';

/// Contract cho bảng công (chỉ Quản lý).
abstract class ShiftReportRepository {
  const ShiftReportRepository();

  /// Bảng công của tháng chứa [month].
  Future<Result<ShiftReport>> getReport(DateTime month);

  /// Chốt ([locked] true) hoặc mở lại công của tháng chứa [month]. Trả thời
  /// điểm chốt, `null` khi tháng vừa được mở lại.
  ///
  /// Chốt khi còn ca chờ duyệt → `Err(ServerFailure)` 409.
  Future<Result<DateTime?>> setLock(DateTime month, {required bool locked});
}
