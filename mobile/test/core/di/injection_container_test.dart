import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/team_schedule_repository.dart';
import 'package:iceflow_mobile/features/schedule/presentation/cubit/schedule_cubit.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/theme/theme_cubit.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';

void main() {
  tearDown(sl.reset);

  test('configureDependencies → dựng được mọi dependency app dùng', () async {
    SharedPreferencesAsyncPlatform.instance =
        InMemorySharedPreferencesAsync.empty();
    configureDependencies();

    expect(sl<AuthRepository>(), isNotNull);
    expect(sl<DriverRepository>(), isNotNull);
    expect(sl<ScheduleRepository>(), isNotNull);
    // Lớp dữ liệu của Quản lý.
    expect(sl<TeamScheduleRepository>(), isNotNull);
    expect(sl<InventoryRepository>(), isNotNull);
    expect(sl<DebtRepository>(), isNotNull);

    // Repository và Dio là singleton; cubit là factory (mỗi màn một cubit).
    expect(sl<Dio>(), same(sl<Dio>()));
    // Một ThemeCubit cho cả app: Cài đặt đổi là gốc app đổi theo.
    expect(sl<ThemeCubit>(), same(sl<ThemeCubit>()));
    expect(sl<DriverRepository>(), same(sl<DriverRepository>()));
    final authCubit = sl<AuthCubit>();
    final todayCubit = sl<TodayOrdersCubit>();
    final historyCubit = sl<HistoryCubit>();
    final scheduleCubit = sl<ScheduleCubit>();
    expect(sl<TodayOrdersCubit>(), isNot(same(todayCubit)));

    await authCubit.close();
    await todayCubit.close();
    await historyCubit.close();
    await scheduleCubit.close();
  });
}
