import 'package:flutter/material.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/injector.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  configureDependencies();
  runApp(IceFlowApp(authCubit: sl<AuthCubit>()));
}
