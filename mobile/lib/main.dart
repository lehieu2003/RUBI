import 'package:flutter/material.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/bootstrap/app_startup.dart';
import 'package:iceflow_mobile/core/config/app_config.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

Future<void> main() async {
  // Bản prod phải được build với URL thật từ config/prod.json; chạy tiếp với
  // URL dev hoặc thiếu URL nghĩa là APK release sẽ gọi localhost của điện thoại.
  const config = AppConfig();
  if (config.isProdUrlMissing) {
    throw StateError(
      'API_BASE_URL chưa đặt cho bản prod — sửa config/prod.json rồi build '
      'lại với --dart-define-from-file=config/prod.json',
    );
  }
  appStartup();
  // Trước khung hình đầu tiên, để app không mở ra sáng rồi mới chuyển tối.
  final themeCubit = sl<ThemeCubit>();
  await themeCubit.load();
  runApp(IceFlowApp(authCubit: sl<AuthCubit>(), themeCubit: themeCubit));
}
