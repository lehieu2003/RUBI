import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/shift_report_dtos.dart';
import 'package:iceflow_mobile/features/schedule/data/mappers/shift_report_mapper.dart';
import 'package:iceflow_mobile/features/schedule/data/schedule_endpoints.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/shift_report.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/shift_report_repository.dart';
import 'package:injectable/injectable.dart';

/// Tháng dạng server nhận: `YYYY-MM`.
String _wireMonth(DateTime month) =>
    '${month.year.toString().padLeft(4, '0')}-${month.month.toString().padLeft(2, '0')}';

/// Impl của [ShiftReportRepository] trên Dio.
@LazySingleton(as: ShiftReportRepository)
class ShiftReportRepositoryImpl implements ShiftReportRepository {
  ShiftReportRepositoryImpl({required this._dio});

  static const _tag = 'shift-report';

  final Dio _dio;

  @override
  Future<Result<ShiftReport>> getReport(DateTime month) {
    return guardApi('getReport', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(
        ScheduleEndpoints.shiftsReport,
        queryParameters: {'month': _wireMonth(month)},
      );
      final data = apiDataObject(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Shift report response missing `data`'));
      }
      return ShiftReportMapper.fromDto(ShiftReportDto.fromJson(data));
    });
  }

  @override
  Future<Result<DateTime?>> setLock(DateTime month, {required bool locked}) {
    return guardApi('setLock', tag: _tag, run: () async {
      final res = await _dio.post<dynamic>(
        ScheduleEndpoints.shiftsLock,
        data: {'month': _wireMonth(month), 'locked': locked},
      );
      final data = apiDataObject(res.data);
      if (data == null || !data.containsKey('lockedAt')) {
        return const Err(
          UnexpectedFailure('Payroll lock response missing `data.lockedAt`'),
        );
      }
      final raw = data['lockedAt'];
      if (raw == null) return const Ok(null);
      final lockedAt = raw is String ? MappingValidator.dateTime(raw) : null;
      if (lockedAt == null) {
        return const Err(
          UnexpectedFailure('Payroll lock response has a malformed `lockedAt`'),
        );
      }
      return Ok(lockedAt);
    });
  }
}
