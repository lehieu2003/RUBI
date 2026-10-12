import 'package:dio/dio.dart';
import 'package:iceflow_mobile/core/network/api_client.dart';
import 'package:iceflow_mobile/core/network/auth_events.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Class ngoài (Dio, SharedPreferencesAsync) không gắn annotation được nên
// đăng ký qua module.

/// Đăng ký [Dio] dùng chung của app.
@module
abstract class NetworkModule {
  @lazySingleton
  Dio dio(AuthStorage authStorage, AuthEvents authEvents) =>
      createApiClient(authStorage: authStorage, authEvents: authEvents);
}

/// Đăng ký [SharedPreferencesAsync].
@module
abstract class StorageModule {
  @lazySingleton
  SharedPreferencesAsync get sharedPreferences => SharedPreferencesAsync();
}
