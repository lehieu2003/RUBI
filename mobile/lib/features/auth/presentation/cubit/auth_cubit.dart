import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';
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
    _passwordChangeSub = authEvents.onPasswordChangeRequired.listen((_) {
      // Quản lý vừa đặt lại mật khẩu khi app đang mở: bật cờ để router đưa
      // người dùng sang màn đổi mật khẩu thay vì để các màn báo lỗi 403.
      final current = state;
      if (current is Authenticated && !current.user.mustChangePassword) {
        emit(Authenticated(current.user.copyWith(mustChangePassword: true)));
      }
    });
  }

  final AuthRepository _repo;
  final AuthStorage _storage;
  final AppPreferences _preferences;
  StreamSubscription<void>? _authEventsSub;
  StreamSubscription<void>? _passwordChangeSub;

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
          } on Object catch (e) {
            AppLogger.warning(
              'Could not remember the last email: $e',
              tag: 'auth',
            );
          }
          if (isClosed) return;
          emit(Authenticated(value));
        } else {
          // Repo đã lưu token cho user này trước khi trả Ok — phải xoá để
          // phiên không "sống sót" qua lần restore kế tiếp. Best-effort:
          // kể cả khi xoá lỗi, user vẫn bị chặn ở màn đăng nhập.
          try {
            await _storage.clear();
          } on Object catch (e) {
            // Không surface — chặn vai trò luôn đứng trước.
            AppLogger.warning(
              'Could not clear the token of a blocked role: $e',
              tag: 'auth',
            );
          }
          if (isClosed) return;
          emit(const Unauthenticated(message: _roleBlockedMessage));
        }
      case Err<User>(:final failure):
        // Ở màn đăng nhập, 401 là sai email/mật khẩu: giữ câu của server.
        // `failureMessage` coi mọi 401 là "phiên đăng nhập hết hạn", đúng
        // cho các API khác nhưng sai ở đây — chưa hề có phiên nào.
        final message = failure is AuthFailure && failure.statusCode == 401
            ? failure.message
            : failureMessage(failure);
        emit(Unauthenticated(message: message));
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

  /// Đổi mật khẩu của người đang đăng nhập. Trả `null` khi thành công, hoặc
  /// câu báo lỗi để màn hình hiện (mật khẩu hiện tại sai, mất mạng...).
  ///
  /// Thành công thì cờ bắt buộc đổi mật khẩu tắt: router cho vào app.
  Future<String?> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await _repo.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
    switch (res) {
      case Ok<void>():
        final current = state;
        if (!isClosed &&
            current is Authenticated &&
            current.user.mustChangePassword) {
          emit(
            Authenticated(
              current.user.copyWith(mustChangePassword: false),
            ),
          );
        }
        return null;
      case Err<void>(:final failure):
        return failureMessage(failure);
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
    _passwordChangeSub?.cancel();
    return super.close();
  }
}
