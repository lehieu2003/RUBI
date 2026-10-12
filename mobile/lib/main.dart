import 'package:flutter/material.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/core/bootstrap/app_startup.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

void main() {
  appStartup();
  runApp(IceFlowApp(authCubit: sl<AuthCubit>()));
}
