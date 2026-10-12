import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:iceflow_mobile/core/constants/app_constants.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/router.dart';

/// Root của app: Material light + go_router, locale Việt Nam.
class IceFlowApp extends HookWidget {
  const IceFlowApp({super.key, required this.authCubit});

  /// Inject từ DI (main) hoặc test tự dựng cubit của riêng nó.
  final AuthCubit authCubit;

  @override
  Widget build(BuildContext context) {
    final router = useMemoized(() => createRouter(authCubit));
    useEffect(() {
      // Khôi phục phiên đã lưu ngay khi app mở (một lần). Router coi
      // AuthUnknown là "cho phép đứng yên" nên không splash — màn hình đổi
      // ngay khi có kết quả.
      authCubit.restore();
      return null;
    }, const []);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
      ),
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      routerConfig: router,
    );
  }
}
