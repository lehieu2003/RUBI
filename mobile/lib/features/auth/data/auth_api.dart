import 'package:dio/dio.dart';
import 'package:iceflow_mobile/features/auth/data/auth_endpoints.dart';

/// Remote data source cho các endpoint xác thực (JSON envelope API).
///
/// Các method trả body map thô (`{ success, data|error }`); việc parse
/// `data` thuộc về repository. Bất kỳ payload nào không phải map đều được
/// coerce về map rỗng để repository xử lý thành `Err(UnexpectedFailure)`.
class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  /// `POST /api/auth/login`
  /// → 200 `{ success: true, data: { user, token } }`
  /// → 401 `{ success: false, error: "Email hoặc mật khẩu không đúng" }`.
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post<dynamic>(
      AuthEndpoints.login,
      data: {'email': email, 'password': password},
    );
    return _bodyOf(res.data);
  }

  /// `GET /api/auth/me` → 200 `{ success: true, data: { user, ... } }`.
  Future<Map<String, dynamic>> me() async {
    final res = await _dio.get<dynamic>(AuthEndpoints.me);
    return _bodyOf(res.data);
  }

  /// `POST /api/auth/refresh` (token còn hạn trong header)
  /// → 200 `{ success: true, data: { token } }` (token mới, hạn 7 ngày)
  /// → 401 khi token đã hết hạn / tài khoản bị khoá.
  Future<Map<String, dynamic>> refresh() async {
    final res = await _dio.post<dynamic>(AuthEndpoints.refresh);
    return _bodyOf(res.data);
  }

  /// `POST /api/auth/logout` — caller bỏ qua kết quả.
  Future<void> logout() {
    return _dio.post<dynamic>(AuthEndpoints.logout);
  }

  /// `POST /api/auth/password`
  /// → 200 `{ success: true, data: { token } }`
  /// → 400 `{ success: false, error: "Mật khẩu hiện tại không đúng" }`.
  Future<Map<String, dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final res = await _dio.post<dynamic>(
      AuthEndpoints.password,
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
    return _bodyOf(res.data);
  }

  Map<String, dynamic> _bodyOf(Object? data) =>
      data is Map<String, dynamic> ? data : const {};
}
