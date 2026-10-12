import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:injectable/injectable.dart';

/// Thông báo khi user không phải DRIVER bị chặn khỏi app (giới hạn Phase 1).
const _roleBlockedMessage = 'Tài khoản này chưa dùng được trên app';

/// Trạng thái phiên đăng nhập.
sealed class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => const [];
}

/// Chưa biết — phiên đang được khôi phục (`restore()` chưa có kết quả).
class AuthUnknown extends AuthState {
  const AuthUnknown();
}

/// Đã đăng nhập.
class Authenticated extends AuthState {
  const Authenticated(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

/// Chưa đăng nhập (đăng xuất, sai thông tin, bị chặn vai trò...).
class Unauthenticated extends AuthState {
  const Unauthenticated({this.message});

  /// Thông báo hiển thị cho người dùng, nếu có.
  final String? message;

  @override
  List<Object?> get props => [message];
}

/// Quản lý phiên đăng nhập: khôi phục khi mở app, đăng nhập, đăng xuất, và
/// nghe sự kiện bị buộc đăng xuất từ tầng network (`authEvents.onLogout`).
@injectable
class AuthCubit extends Cubit<AuthState> {
  AuthCubit({
    required this._repo,
    required this._storage,
    required this._preferences,
    required AuthEvents authEvents,
  }) : super(const AuthUnknown()) {
    _authEventsSub = authEvents.onLogout.listen((_) {
      // Interceptor đã xoá token trước khi emit — chỉ cần cập nhật state.
      // Trùng state hiện tại thì bloc tự bỏ qua (emit dedupe).
      emit(const Unauthenticated());
    });
  }

  final AuthRepository _repo;
  final AuthStorage _storage;
  final AppPreferences _preferences;
  StreamSubscription<void>? _authEventsSub;

  /// Khôi phục phiên từ token đã lưu. Gọi một lần khi app mở.
  ///
  /// `Ok(null)` (chưa có token / token hết hạn) → Unauthenticated im lặng;
  /// lỗi khác (mạng...) → Unauthenticated kèm message.
  Future<void> restore() async {
    final res = await _repo.restoreSession();
    // Cubit đã đóng trong lúc chờ: không emit nữa.
    if (isClosed) return;
    switch (res) {
      case Ok<User?>(:final value):
        emit(value != null ? Authenticated(value) : const Unauthenticated());
      case Err<User?>(:final failure):
        emit(Unauthenticated(message: failureMessage(failure)));
    }
  }

  /// Đăng nhập. Chỉ vai trò DRIVER được vào app (giới hạn Phase 1).
  Future<void> login(String email, String password) async {
    final res = await _repo.login(email: email, password: password);
    if (isClosed) return;
    switch (res) {
      case Ok<User>(:final value):
        if (value.role == UserRole.driver) {
          // Nhớ email cho lần đăng nhập sau. Best-effort: lỗi lưu tuỳ chọn
          // không được làm hỏng lần đăng nhập đã thành công.
          try {
            await _preferences.saveLastEmail(email);
          } on Object catch (_) {
            // ignored
          }
          if (isClosed) return;
          emit(Authenticated(value));
        } else {
          // Repo đã lưu token cho user này trước khi trả Ok — phải xoá để
          // phiên không "sống sót" qua lần restore kế tiếp. Best-effort:
          // kể cả khi xoá lỗi, user vẫn bị chặn ở màn đăng nhập.
          try {
            await _storage.clear();
          } on Object catch (_) {
            // ignored — chặn vai trò luôn đứng trước.
          }
          if (isClosed) return;
          emit(const Unauthenticated(message: _roleBlockedMessage));
        }
      case Err<User>(:final failure):
        emit(Unauthenticated(message: failureMessage(failure)));
    }
  }

  /// Email của lần đăng nhập thành công gần nhất (điền sẵn màn đăng nhập);
  /// `null` nếu chưa có hoặc không đọc được.
  Future<String?> lastEmail() async {
    try {
      return await _preferences.readLastEmail();
    } on Object catch (_) {
      return null;
    }
  }

  /// Đăng xuất. Mọi `Err` từ repo (lỗi secure-storage cục bộ, hiếm) vẫn coi
  /// như đã đăng xuất phía app — surface nothing.
  Future<void> logout() async {
    await _repo.logout();
    if (isClosed) return;
    emit(const Unauthenticated());
  }

  @override
  Future<void> close() {
    _authEventsSub?.cancel();
    return super.close();
  }
}
