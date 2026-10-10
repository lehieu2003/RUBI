import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:iceflow_mobile/app.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/injector.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Nạp symbol date cho mọi locale TRƯỚC khi dựng UI (HistoryTab format
  // thứ bằng DateFormat('vi')). Data có sẵn trong binary — sync xong là dùng
  // được, không cần await.
  initializeDateFormatting();
  configureDependencies();
  runApp(IceFlowApp(authCubit: sl<AuthCubit>()));
}
