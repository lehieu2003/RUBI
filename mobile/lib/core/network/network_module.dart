import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_client.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:injectable/injectable.dart';

/// Đăng ký [Dio] dùng chung của app (class ngoài, không gắn annotation được).
@module
abstract class NetworkModule {
  @lazySingleton
  Dio dio(AuthStorage authStorage, AuthEvents authEvents) =>
      createApiClient(authStorage: authStorage, authEvents: authEvents);
}
