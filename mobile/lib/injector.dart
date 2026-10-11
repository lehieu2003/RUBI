import 'package:get_it/get_it.dart';
import 'package:iceflow_mobile/injector.config.dart';
import 'package:injectable/injectable.dart';

/// Service locator toàn app.
final sl = GetIt.instance;

/// Đăng ký dependency — gọi đúng một lần lúc bootstrap (main).
///
/// Danh sách đăng ký do injectable sinh ra (`injector.config.dart`) từ các
/// annotation `@injectable` / `@lazySingleton` / `@module` trên từng class;
/// thêm hay đổi annotation xong chạy `dart run build_runner build`.
@InjectableInit()
void configureDependencies() => sl.init();
