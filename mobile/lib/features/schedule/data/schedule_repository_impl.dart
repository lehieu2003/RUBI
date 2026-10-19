import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/auth_interceptor.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/schedule_dtos.dart';
import 'package:iceflow_mobile/features/schedule/data/mappers/schedule_mapper.dart';
import 'package:iceflow_mobile/features/schedule/data/schedule_endpoints.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:injectable/injectable.dart';
import 'package:intl/intl.dart';

/// Impl của [ScheduleRepository] trên Dio (token do [AuthInterceptor] gắn,
/// 401/refresh/logout cũng do interceptor xử lý trước khi tới đây).
@LazySingleton(as: ScheduleRepository)
class ScheduleRepositoryImpl implements ScheduleRepository {
  ScheduleRepositoryImpl({required this._dio});

  final Dio _dio;

  @override
  Future<Result<WeekSchedule>> getWeek(DateTime weekStart) async {
    try {
      final res = await _dio.get<dynamic>(
        ScheduleEndpoints.mySchedule,
        queryParameters: {'week': _formatDate(weekStart)},
      );

      final data = _dataOf(res.data);
      if (data == null) {
        return const Err(UnexpectedFailure('Schedule response missing `data`'));
      }
      return ScheduleMapper.fromDto(WeekScheduleDto.fromJson(data));
    } on DioException catch (err) {
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      // Guarantee Result: TypeError parse (field sai kiểu)... không được phép
      // xuyên qua biên Result.
      AppLogger.error(
        'Unexpected getWeek failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'schedule',
      );
      return Err(UnexpectedFailure('Unexpected getWeek failure: $e'));
    }
  }

  @override
  Future<Result<Shift>> requestShift({
    required DateTime date,
    required ShiftSlot slot,
  }) async {
    try {
      final res = await _dio.post<dynamic>(
        ScheduleEndpoints.mySchedule,
        data: _shiftBody(date, slot),
      );

      final data = _dataOf(res.data);
      final shiftDto = data == null ? null : RequestShiftDataDto.fromJson(data).shift;
      if (shiftDto == null) {
        return const Err(
          UnexpectedFailure('Request shift response missing `data.shift`'),
        );
      }
      return ScheduleMapper.fromShiftDto(shiftDto);
    } on DioException catch (err) {
      // Message từ server (VD: "Ca này đã đủ 2 người...") giữ nguyên.
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      AppLogger.error(
        'Unexpected requestShift failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'schedule',
      );
      return Err(UnexpectedFailure('Unexpected requestShift failure: $e'));
    }
  }

  @override
  Future<Result<void>> withdrawShift({
    required DateTime date,
    required ShiftSlot slot,
  }) async {
    try {
      // API nhận ca cần rút trong body của DELETE.
      await _dio.delete<dynamic>(
        ScheduleEndpoints.mySchedule,
        data: _shiftBody(date, slot),
      );
      return const Ok<void>(null);
    } on DioException catch (err) {
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      AppLogger.error(
        'Unexpected withdrawShift failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'schedule',
      );
      return Err(UnexpectedFailure('Unexpected withdrawShift failure: $e'));
    }
  }

  Map<String, dynamic> _shiftBody(DateTime date, ShiftSlot slot) => {
        'shiftDate': _formatDate(date),
        'shift': slot.wireName,
      };

  /// Ngày theo lịch (năm/tháng/ngày của [date]), không convert múi giờ.
  String _formatDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

  /// Lấy object `data` từ envelope; `null` nếu payload không có `data` map.
  Map<String, dynamic>? _dataOf(Object? body) {
    final data = body is Map<String, dynamic> ? body['data'] : null;
    return data is Map<String, dynamic> ? data : null;
  }
}
