import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:iceflow_mobile/core/location/location.dart';
import 'package:iceflow_mobile/core/network/network.dart';
import 'package:iceflow_mobile/core/storage/auth_storage.dart';
import 'package:iceflow_mobile/features/auth/data/auth_repository_impl.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/data/driver_repository_impl.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/confirm_delivery.dart';
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';

/// Service locator toàn app.
final sl = GetIt.instance;

/// Đăng ký dependency — gọi đúng một lần lúc bootstrap (main).
///
/// Tối giản, không codegen: các constructor tự nối bằng `sl()` theo kiểu
/// lazy singleton / factory.
void configureDependencies() {
  sl
    ..registerSingleton<AuthEvents>(AuthEvents())
    ..registerLazySingleton<AuthStorage>(AuthStorage.new)
    ..registerLazySingleton<Dio>(
      () => createApiClient(authStorage: sl(), authEvents: sl()),
    )
    ..registerLazySingleton<AuthRepository>(
      () => AuthRepositoryImpl(dio: sl(), authStorage: sl()),
    )
    ..registerLazySingleton<LocationService>(LocationService.new)
    ..registerFactory<AuthCubit>(
      () => AuthCubit(repo: sl(), storage: sl(), authEvents: sl()),
    )
    // ---- Driver ----
    ..registerLazySingleton<DriverRepository>(
      () => DriverRepositoryImpl(dio: sl()),
    )
    ..registerLazySingleton<GetOrdersForDateUseCase>(
      () => GetOrdersForDateUseCase(sl()),
    )
    ..registerLazySingleton<ConfirmDeliveryUseCase>(
      () => ConfirmDeliveryUseCase(sl()),
    )
    ..registerFactory<TodayOrdersCubit>(
      () => TodayOrdersCubit(
        getOrders: sl(),
        confirmDelivery: sl(),
        locationService: sl(),
      ),
    )
    ..registerFactory<HistoryCubit>(
      () => HistoryCubit(getOrders: sl()),
    );
}
