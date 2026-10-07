import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/error/failure.dart';
import 'package:iceflow_mobile/core/network/auth_interceptor.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/data/auth_api.dart';
import 'package:iceflow_mobile/features/auth/data/dto/auth_dtos.dart';
import 'package:iceflow_mobile/features/auth/data/mappers/user_mapper.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';

/// Impl của [AuthRepository] trên Dio + [AuthStorage].
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
    }
  }

  @override
  Future<Result<User?>> restoreSession() async {
    final token = await _storage.readToken();
    if (token == null || token.isEmpty) {
      return const Ok<User?>(null); // không gọi network
    }

    try {
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
        // caller chỉ thấy "chưa đăng nhập".
        await _storage.clear();
        return const Ok<User?>(null);
      }
      return Err(mapDioError(err));
    }
  }

  @override
  Future<Result<void>> logout() async {
    try {
      await _api.logout();
    } on Object catch (_) {
      // Bỏ qua mọi kết quả (success/error/exception) — token local luôn xoá.
    }
    await _storage.clear();
    return const Ok<void>(null);
  }

  /// Lấy object `data` từ envelope; `null` nếu payload không có `data` map.
  Map<String, dynamic>? _dataOf(Map<String, dynamic> body) {
    final data = body['data'];
    return data is Map<String, dynamic> ? data : null;
  }
}
