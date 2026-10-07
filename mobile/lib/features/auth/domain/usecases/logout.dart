import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';

/// Đăng xuất — ủy thác cho [AuthRepository]; luôn thành công (`Ok(null)`)
/// vì token local bị xoá bất kể server phản hồi thế nào.
class LogoutUseCase {
  const LogoutUseCase(this._repository);

  final AuthRepository _repository;

  Future<Result<void>> call() {
    return _repository.logout();
  }
}
