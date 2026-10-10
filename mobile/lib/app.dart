import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/router.dart';

/// Root của app: Material light + go_router, locale Việt Nam.
class IceFlowApp extends StatefulWidget {
  const IceFlowApp({super.key, required this.authCubit});

  /// Inject từ DI (main) hoặc test tự dựng cubit của riêng nó.
  final AuthCubit authCubit;

  @override
  State<IceFlowApp> createState() => _IceFlowAppState();
}

class _IceFlowAppState extends State<IceFlowApp> {
  late final GoRouter _router = createRouter(widget.authCubit);

  @override
  void initState() {
    super.initState();
    // Khôi phục phiên đã lưu ngay khi app mở. Router coi AuthUnknown là
    // "cho phép đứng yên" nên không splash — màn hình đổi ngay khi có kết quả.
    widget.authCubit.restore();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'IceFlow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: _router,
    );
  }
}
