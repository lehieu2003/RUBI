import 'package:flutter/material.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/bootstrap/app_startup.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

Future<void> main() async {
  appStartup();
  // Trước khung hình đầu tiên, để app không mở ra sáng rồi mới chuyển tối.
  final themeCubit = sl<ThemeCubit>();
  await themeCubit.load();
  runApp(IceFlowApp(authCubit: sl<AuthCubit>(), themeCubit: themeCubit));
}
