import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_guard.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_dto.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/audit/data/audit_endpoints.dart';
import 'package:iceflow_mobile/features/audit/data/dto/audit_dtos.dart';
import 'package:iceflow_mobile/features/audit/data/mappers/audit_mapper.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';
import 'package:iceflow_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [AuditRepository] trên Dio.
@LazySingleton(as: AuditRepository)
class AuditRepositoryImpl implements AuditRepository {
  AuditRepositoryImpl({required this._dio});

  final Dio _dio;

  @override
  Future<Result<Paginated<AuditEntry>>> getEntries({
    AuditFilter filter = AuditFilter.all,
    PageParams page = const PageParams(),
  }) {
    return guardApi('getAuditEntries', tag: 'audit', run: () async {
      final res = await _dio.get<dynamic>(
        AuditEndpoints.auditLogs,
        queryParameters: {
          ...page.toQuery(),
          if (filter.wireName != null) 'type': filter.wireName,
        },
      );
      final rows = apiDataList(res.data);
      final meta = apiMeta(res.data);
      if (rows == null || meta == null) {
        return const Err(
          UnexpectedFailure('Audit log response missing `data` or `meta`'),
        );
      }
      final entries = <AuditEntry>[];
      for (final row in rows) {
        switch (AuditMapper.fromDto(AuditEntryDto.fromJson(row))) {
          case Ok<AuditEntry>(:final value):
            entries.add(value);
          case Err<AuditEntry>(:final failure):
            return Err(failure);
        }
      }
      return PaginationDto.fromJson(meta).toPage(entries);
    });
  }
}
