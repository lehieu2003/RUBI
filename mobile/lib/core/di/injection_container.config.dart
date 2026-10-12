// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format width=80

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes

import 'package:dio/dio.dart' as _i361;
import 'package:get_it/get_it.dart' as _i174;
import 'package:iceflow_mobile/core/di/injection_modules.dart' as _i648;
import 'package:iceflow_mobile/core/network/auth_events.dart' as _i1021;
import 'package:iceflow_mobile/core/storage/app_preferences.dart' as _i681;
import 'package:iceflow_mobile/core/storage/auth_storage.dart' as _i807;
import 'package:iceflow_mobile/core/theme/theme_cubit.dart' as _i521;
import 'package:iceflow_mobile/features/audit/data/audit_repository_impl.dart'
    as _i156;
import 'package:iceflow_mobile/features/audit/domain/repositories/audit_repository.dart'
    as _i971;
import 'package:iceflow_mobile/features/audit/presentation/cubit/audit_log_cubit.dart'
    as _i945;
import 'package:iceflow_mobile/features/auth/data/auth_repository_impl.dart'
    as _i1004;
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart'
    as _i452;
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart'
    as _i251;
import 'package:iceflow_mobile/features/debt/data/debt_repository_impl.dart'
    as _i61;
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart'
    as _i694;
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart'
    as _i360;
import 'package:iceflow_mobile/features/debt/presentation/cubit/debt_cubit.dart'
    as _i559;
import 'package:iceflow_mobile/features/debt/presentation/cubit/ledger_cubit.dart'
    as _i759;
import 'package:iceflow_mobile/features/driver/data/driver_repository_impl.dart'
    as _i340;
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart'
    as _i103;
import 'package:iceflow_mobile/features/driver/domain/usecases/confirm_delivery.dart'
    as _i504;
import 'package:iceflow_mobile/features/driver/domain/usecases/get_orders_for_date.dart'
    as _i787;
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart'
    as _i487;
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart'
    as _i673;
import 'package:iceflow_mobile/features/inventory/data/inventory_repository_impl.dart'
    as _i123;
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart'
    as _i793;
import 'package:iceflow_mobile/features/inventory/presentation/cubit/inventory_cubit.dart'
    as _i14;
import 'package:iceflow_mobile/features/schedule/data/schedule_repository_impl.dart'
    as _i110;
import 'package:iceflow_mobile/features/schedule/data/team_schedule_repository_impl.dart'
    as _i783;
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart'
    as _i285;
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart'
    as _i987;
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart'
    as _i755;
import 'package:iceflow_mobile/features/schedule/presentation/cubit/team_schedule_cubit.dart'
    as _i1;
import 'package:injectable/injectable.dart' as _i526;
import 'package:shared_preferences/shared_preferences.dart' as _i460;

extension GetItInjectableX on _i174.GetIt {
  // initializes the registration of main-scope dependencies inside of GetIt
  _i174.GetIt init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) {
    final gh = _i526.GetItHelper(this, environment, environmentFilter);
    final storageModule = _$StorageModule();
    final networkModule = _$NetworkModule();
    gh.singleton<_i1021.AuthEvents>(() => _i1021.AuthEvents());
    gh.lazySingleton<_i460.SharedPreferencesAsync>(
      () => storageModule.sharedPreferences,
    );
    gh.lazySingleton<_i807.AuthStorage>(() => _i807.AuthStorage());
    gh.lazySingleton<_i361.Dio>(
      () => networkModule.dio(gh<_i807.AuthStorage>(), gh<_i1021.AuthEvents>()),
    );
    gh.lazySingleton<_i681.AppPreferences>(
      () => _i681.AppPreferences(gh<_i460.SharedPreferencesAsync>()),
    );
    gh.lazySingleton<_i360.DebtRepository>(
      () => _i61.DebtRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.lazySingleton<_i971.AuditRepository>(
      () => _i156.AuditRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.lazySingleton<_i521.ThemeCubit>(
      () => _i521.ThemeCubit(preferences: gh<_i681.AppPreferences>()),
    );
    gh.factory<_i945.AuditLogCubit>(
      () => _i945.AuditLogCubit(repo: gh<_i971.AuditRepository>()),
    );
    gh.lazySingleton<_i452.AuthRepository>(
      () => _i1004.AuthRepositoryImpl(
        dio: gh<_i361.Dio>(),
        authStorage: gh<_i807.AuthStorage>(),
      ),
    );
    gh.factoryParam<_i759.LedgerCubit, _i694.CustomerDebt, dynamic>(
      (debt, _) =>
          _i759.LedgerCubit(repo: gh<_i360.DebtRepository>(), debt: debt),
    );
    gh.lazySingleton<_i285.ScheduleRepository>(
      () => _i110.ScheduleRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.lazySingleton<_i987.TeamScheduleRepository>(
      () => _i783.TeamScheduleRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.lazySingleton<_i103.DriverRepository>(
      () => _i340.DriverRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.factory<_i559.DebtCubit>(
      () => _i559.DebtCubit(repo: gh<_i360.DebtRepository>()),
    );
    gh.lazySingleton<_i793.InventoryRepository>(
      () => _i123.InventoryRepositoryImpl(dio: gh<_i361.Dio>()),
    );
    gh.factory<_i251.AuthCubit>(
      () => _i251.AuthCubit(
        repo: gh<_i452.AuthRepository>(),
        preferences: gh<_i681.AppPreferences>(),
        authEvents: gh<_i1021.AuthEvents>(),
      ),
    );
    gh.factory<_i1.TeamScheduleCubit>(
      () => _i1.TeamScheduleCubit(repo: gh<_i987.TeamScheduleRepository>()),
    );
    gh.factory<_i755.ScheduleCubit>(
      () => _i755.ScheduleCubit(repo: gh<_i285.ScheduleRepository>()),
    );
    gh.factory<_i14.InventoryCubit>(
      () => _i14.InventoryCubit(repo: gh<_i793.InventoryRepository>()),
    );
    gh.lazySingleton<_i504.ConfirmDeliveryUseCase>(
      () => _i504.ConfirmDeliveryUseCase(gh<_i103.DriverRepository>()),
    );
    gh.lazySingleton<_i787.GetOrdersForDateUseCase>(
      () => _i787.GetOrdersForDateUseCase(gh<_i103.DriverRepository>()),
    );
    gh.factory<_i673.TodayOrdersCubit>(
      () => _i673.TodayOrdersCubit(
        getOrders: gh<_i787.GetOrdersForDateUseCase>(),
        confirmDelivery: gh<_i504.ConfirmDeliveryUseCase>(),
      ),
    );
    gh.factory<_i487.HistoryCubit>(
      () => _i487.HistoryCubit(getOrders: gh<_i787.GetOrdersForDateUseCase>()),
    );
    return this;
  }
}

class _$StorageModule extends _i648.StorageModule {}

class _$NetworkModule extends _i648.NetworkModule {}
