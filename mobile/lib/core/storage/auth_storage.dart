import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

/// Secure (Keychain / EncryptedSharedPreferences) storage for the auth token.
@lazySingleton
class AuthStorage {
  AuthStorage();

  static const _key = 'auth_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> saveToken(String token) {
    return _storage.write(key: _key, value: token);
  }

  Future<String?> readToken() {
    return _storage.read(key: _key);
  }

  Future<void> clear() {
    return _storage.delete(key: _key);
  }
}
