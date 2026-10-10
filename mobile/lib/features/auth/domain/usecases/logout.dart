import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';

/// Đăng xuất — ủy thác cho [AuthRepository]. `Ok(null)` bất kể server phản
/// hồi thế nào; chỉ lỗi secure-storage cục bộ mới trả `Err`.
class LogoutUseCase {
  const LogoutUseCase(this._repository);

  final AuthRepository _repository;

  Future<Result<void>> call() {
    return _repository.logout();
  }
}
