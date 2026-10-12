import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/services/app_logger.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/data/auth_api.dart';
import 'package:iceflow_mobile/features/auth/data/dto/auth_dtos.dart';
import 'package:iceflow_mobile/features/auth/data/mappers/user_mapper.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:injectable/injectable.dart';

/// Impl của [AuthRepository] trên Dio + [AuthStorage].
@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({required Dio dio, required AuthStorage authStorage})
      : _api = AuthApi(dio),
        _storage = authStorage;

  final AuthApi _api;
  final AuthStorage _storage;

  @override
  Future<Result<User>> login({
    required String email,
    required String password,
  }) async {
    try {
      final body = await _api.login(email: email, password: password);
      final data = _dataOf(body);
      if (data == null) {
        return const Err(UnexpectedFailure('Login response missing `data`'));
      }

      final loginData = LoginDataDto.fromJson(data);
      if (loginData.user == null) {
        return const Err(
          UnexpectedFailure('Login response missing `data.user`'),
        );
      }
      final userResult = UserMapper.fromDto(loginData.user!);
      if (userResult is Err<User>) return userResult;

      // Token bắt buộc trong contract 200 — thiếu thì coi payload hỏng.
      final token = loginData.token;
      if (token == null || token.isEmpty) {
        return const Err(
          UnexpectedFailure('Login response missing `data.token`'),
        );
      }
      await _storage.saveToken(token);
      return userResult;
    } on DioException catch (err) {
      // Message từ server (VD: "Email hoặc mật khẩu không đúng") giữ nguyên.
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      // Guarantee Result: TypeError parse (field sai kiểu), lỗi
      // secure-storage... không được phép xuyên qua biên Result.
      AppLogger.error(
        'Unexpected login failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'auth',
      );
      return Err(UnexpectedFailure('Unexpected login failure: $e'));
    }
  }

  @override
  Future<Result<User?>> restoreSession() async {
    try {
      final token = await _storage.readToken();
      if (token == null || token.isEmpty) {
        return const Ok<User?>(null); // không gọi network
      }

      final body = await _api.me();
      final data = _dataOf(body);
      if (data == null) {
        return const Err(UnexpectedFailure('Me response missing `data`'));
      }

      final meData = MeDataDto.fromJson(data);
      if (meData.user == null) {
        return const Err(UnexpectedFailure('Me response missing `data.user`'));
      }
      switch (UserMapper.fromDto(meData.user!)) {
        case Ok<User>(:final value):
          return Ok<User?>(value);
        case Err<User>(:final failure):
          return Err<User?>(failure);
      }
    } on DioException catch (err) {
      if (err.response?.statusCode == 401) {
        // Token hết hạn: xoá token và IM LẶNG (không surface error) —
        // caller chỉ thấy "chưa đăng nhập". Clear là best-effort: phiên đã
        // chết, nếu storage lỗi hiếm gặp thì token còn lại sẽ bị xoá ở lần
        // restore/401 kế tiếp chứ không phá vỡ contract im lặng.
        try {
          await _storage.clear();
        } on Object catch (e) {
          // Không surface — phiên 401 luôn im lặng.
          AppLogger.warning(
            'Could not clear the expired token: $e',
            tag: 'auth',
          );
        }
        return const Ok<User?>(null);
      }
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      AppLogger.error(
        'Unexpected restoreSession failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'auth',
      );
      return Err(UnexpectedFailure('Unexpected restoreSession failure: $e'));
    }
  }

  @override
  Future<Result<void>> logout() async {
    try {
      await _api.logout();
    } on Object catch (_) {
      // Bỏ qua mọi kết quả server (success/error/exception).
    }
    try {
      await _storage.clear();
    } on Object catch (e, stackTrace) {
      // Lỗi storage cục bộ: token chưa chắc đã bị xoá → phải surface.
      AppLogger.error(
        'Unexpected logout failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'auth',
      );
      return Err(UnexpectedFailure('Unexpected logout failure: $e'));
    }
    return const Ok<void>(null);
  }

  @override
  Future<Result<void>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final body = await _api.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      final data = _dataOf(body);
      if (data == null) {
        return const Err(
          UnexpectedFailure('Change password response missing `data`'),
        );
      }

      // Token cũ còn mang cờ mustChangePassword → phải thay bằng token mới.
      final token = ChangePasswordDataDto.fromJson(data).token;
      if (token == null || token.isEmpty) {
        return const Err(
          UnexpectedFailure('Change password response missing `data.token`'),
        );
      }
      await _storage.saveToken(token);
      return const Ok<void>(null);
    } on DioException catch (err) {
      // Message từ server (VD: "Mật khẩu hiện tại không đúng") giữ nguyên.
      return Err(mapDioError(err));
    } catch (e, stackTrace) {
      AppLogger.error(
        'Unexpected changePassword failure',
        error: e,
        stackTrace: stackTrace,
        tag: 'auth',
      );
      return Err(UnexpectedFailure('Unexpected changePassword failure: $e'));
    }
  }

  /// Lấy object `data` từ envelope; `null` nếu payload không có `data` map.
  Map<String, dynamic>? _dataOf(Map<String, dynamic> body) {
    final data = body['data'];
    return data is Map<String, dynamic> ? data : null;
  }
}
