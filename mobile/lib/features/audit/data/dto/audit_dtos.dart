// DTO cho `GET /api/audit-logs` (envelope phân trang `{ success, data, meta }`).
//
// `fromJson` do json_serializable sinh (`audit_dtos.g.dart`; sửa file này xong
// chạy `dart run build_runner build`). Mọi field nullable, không validate —
// mapper quyết định thiếu field nào là payload hỏng.
import 'package:json_annotation/json_annotation.dart';

part 'audit_dtos.g.dart';

/// Một phần tử của `data`.
@JsonSerializable(createToJson: false)
class AuditEntryDto {
  const AuditEntryDto({
    this.id,
    this.action,
    this.summary,
    this.userName,
    this.orderCode,
    this.customerName,
    this.createdAt,
  });

  factory AuditEntryDto.fromJson(Map<String, dynamic> json) =>
      _$AuditEntryDtoFromJson(json);

  final String? id;
  final String? action;
  final String? summary;
  final String? userName;
  final String? orderCode;
  final String? customerName;
  final String? createdAt;
}
