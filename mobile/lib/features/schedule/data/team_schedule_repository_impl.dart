import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/schedule/data/dto/schedule_dtos.dart';
import 'package:iceflow_mobile/features/schedule/data/mappers/schedule_mapper.dart';
import 'package:iceflow_mobile/features/schedule/data/schedule_endpoints.dart';
import 'package:iceflow_mobile/features/schedule/domain/entities/week_schedule.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart';
import 'package:injectable/injectable.dart';
import 'package:intl/intl.dart';

/// Impl của [TeamScheduleRepository] trên Dio.
@LazySingleton(as: TeamScheduleRepository)
class TeamScheduleRepositoryImpl implements TeamScheduleRepository {
  TeamScheduleRepositoryImpl({required this._dio});

  static const _tag = 'schedule';

  final Dio _dio;

  @override
  Future<Result<List<SchedulePerson>>> getTeamWeek(DateTime weekStart) {
    return guardApi('getTeamWeek', tag: _tag, run: () async {
      final res = await _dio.get<dynamic>(
        ScheduleEndpoints.assignments,
        // Ngày theo lịch (năm/tháng/ngày), không convert múi giờ.
        queryParameters: {'week': DateFormat('yyyy-MM-dd').format(weekStart)},
      );
      final rows = apiDataList(res.data);
      if (rows == null) {
        return const Err(
          UnexpectedFailure('Team schedule response missing `data`'),
        );
      }
      final people = <SchedulePerson>[];
      for (final row in rows) {
        switch (ScheduleMapper.fromPersonDto(SchedulePersonDto.fromJson(row))) {
          case Ok<SchedulePerson>(:final value):
            // Không có id thì không duyệt được ca đó: coi là payload hỏng.
            if (value.shifts.any((shift) => shift.id == null)) {
              return const Err(
                UnexpectedFailure('Team schedule shift payload missing `id`'),
              );
            }
            people.add(value);
          case Err<SchedulePerson>(:final failure):
            return Err(failure);
        }
      }
      return Ok(people);
    });
  }

  @override
  Future<Result<int>> reviewShifts({
    required List<String> shiftIds,
    required bool approve,
  }) {
    return guardApi('reviewShifts', tag: _tag, run: () async {
      final res = await _dio.post<dynamic>(
        ScheduleEndpoints.review,
        data: {'ids': shiftIds, 'action': approve ? 'APPROVE' : 'REJECT'},
      );
      final updated = apiDataObject(res.data)?['updated'];
      if (updated is! int) {
        return const Err(
          UnexpectedFailure('Review response missing `data.updated`'),
        );
      }
      return Ok(updated);
    });
  }
}
