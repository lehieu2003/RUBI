import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:iceflow_mobile/core/constants/app_constants.dart';
import 'package:iceflow_mobile/core/router/app_router.dart';
import 'package:iceflow_mobile/core/theme/app_theme.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';

/// Root của app: Material sáng / tối + go_router, locale Việt Nam.
class IceFlowApp extends HookWidget {
  const IceFlowApp({
    super.key,
    required this.authCubit,
    required this.themeCubit,
  });

  /// Inject từ DI (main) hoặc test tự dựng cubit của riêng nó.
  final AuthCubit authCubit;

  /// Giao diện sáng / tối; cấp cho cả app để tab Cài đặt đổi được.
  final ThemeCubit themeCubit;

  @override
  Widget build(BuildContext context) {
    final router = useMemoized(() => createRouter(authCubit));
    final messengerKey = useMemoized(GlobalKey<ScaffoldMessengerState>.new);
    useEffect(() {
      // Câu báo của người vừa đăng xuất không theo sang phiên của người kế
      // tiếp (và không nằm đè lên nút ở đáy màn hình của họ).
      final subscription = authCubit.stream.listen((state) {
        if (state is Unauthenticated) {
          messengerKey.currentState?.clearSnackBars();
        }
      });
      return subscription.cancel;
    }, const []);
    useEffect(() {
      // Khôi phục phiên đã lưu ngay khi app mở (một lần). Router coi
      // AuthUnknown là "cho phép đứng yên" nên không splash — màn hình đổi
      // ngay khi có kết quả.
      authCubit.restore();
      return null;
    }, const []);
    // Mở lại app (từ nền) → làm mới token nếu đã cũ, để người dùng hằng
    // ngày không bị đăng xuất cứng 7 ngày sau lần đăng nhập.
    useOnAppLifecycleStateChange((_, current) {
      if (current == AppLifecycleState.resumed) authCubit.refreshSession();
    });

    return BlocProvider<ThemeCubit>.value(
      value: themeCubit,
      child: BlocBuilder<ThemeCubit, ThemeMode>(
        builder: (context, themeMode) => MaterialApp.router(
          title: AppConstants.appName,
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeMode,
          locale: const Locale('vi'),
          supportedLocales: const [Locale('vi')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          routerConfig: router,
          scaffoldMessengerKey: messengerKey,
        ),
      ),
    );
  }
}
