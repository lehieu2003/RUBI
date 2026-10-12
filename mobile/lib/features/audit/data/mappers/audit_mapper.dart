import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/mapping_validator.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/audit/data/dto/audit_dtos.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';

/// Chuyển DTO nhật ký → domain.
abstract final class AuditMapper {
  static Result<AuditEntry> fromDto(AuditEntryDto dto) {
    final id = MappingValidator.nonEmpty(dto.id);
    if (id == null) {
      return Err(MappingValidator.missing('Audit entry', 'id'));
    }
    final action = MappingValidator.nonEmpty(dto.action);
    if (action == null) {
      return Err(MappingValidator.missing('Audit entry', 'action'));
    }
    final summary = dto.summary;
    if (summary == null) {
      return Err(MappingValidator.missing('Audit entry', 'summary'));
    }
    final userName = MappingValidator.nonEmpty(dto.userName);
    if (userName == null) {
      return Err(MappingValidator.missing('Audit entry', 'userName'));
    }
    final createdAt = MappingValidator.dateTime(dto.createdAt);
    if (createdAt == null) {
      return const Err(
        UnexpectedFailure('Audit entry payload missing/unparseable `createdAt`'),
      );
    }
    return Ok(
      AuditEntry(
        id: id,
        action: action,
        summary: summary,
        userName: userName,
        createdAt: createdAt,
        orderCode: MappingValidator.nonEmpty(dto.orderCode),
        customerName: MappingValidator.nonEmpty(dto.customerName),
      ),
    );
  }
}
