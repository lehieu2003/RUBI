import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';

/// Khôi phục phiên đăng nhập từ token đã lưu — ủy thác cho [AuthRepository].
class RestoreSessionUseCase {
  const RestoreSessionUseCase(this._repository);

  final AuthRepository _repository;

  /// `Ok(null)` nghĩa là chưa đăng nhập / phiên hết hạn.
  Future<Result<User?>> call() {
    return _repository.restoreSession();
  }
}
