import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';

/// Contract cho nhật ký đơn hàng và công nợ (chỉ Quản lý — server trả 403
/// cho vai trò khác). Chỉ đọc: nhật ký không sửa, không xoá được.
abstract class AuditRepository {
  const AuditRepository();

  /// Các dòng nhật ký, mới nhất trước.
  Future<Result<Paginated<AuditEntry>>> getEntries({
    AuditFilter filter = AuditFilter.all,
    PageParams page = const PageParams(),
  });
}
