import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/storage/app_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

void main() {
  late AppPreferences preferences;

  setUp(() {
    SharedPreferencesAsyncPlatform.instance =
        InMemorySharedPreferencesAsync.empty();
    preferences = AppPreferences(SharedPreferencesAsync());
  });

  test('chưa lưu gì → readLastEmail null', () async {
    expect(await preferences.readLastEmail(), isNull);
  });

  test('saveLastEmail → readLastEmail trả đúng, lần lưu sau ghi đè', () async {
    await preferences.saveLastEmail('tai@iceflow.vn');
    expect(await preferences.readLastEmail(), 'tai@iceflow.vn');

    await preferences.saveLastEmail('nam@iceflow.vn');
    expect(await preferences.readLastEmail(), 'nam@iceflow.vn');
  });

  test('giao diện: chưa chọn → null; chọn rồi thì đọc lại đúng, không lẫn với '
      'email', () async {
    expect(await preferences.readThemeMode(), isNull);

    await preferences.saveLastEmail('tai@iceflow.vn');
    await preferences.saveThemeMode('dark');

    expect(await preferences.readThemeMode(), 'dark');
    expect(await preferences.readLastEmail(), 'tai@iceflow.vn');
  });
}
