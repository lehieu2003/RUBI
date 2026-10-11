import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:iceflow_mobile/features/auth/presentation/cubit/auth_cubit.dart';
import 'package:iceflow_mobile/features/driver/domain/repositories/driver_repository.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/schedule/domain/repositories/schedule_repository.dart';
import 'package:iceflow_mobile/injector.dart';
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

    // Repository và Dio là singleton; cubit là factory (mỗi màn một cubit).
    expect(sl<Dio>(), same(sl<Dio>()));
    expect(sl<DriverRepository>(), same(sl<DriverRepository>()));
    final authCubit = sl<AuthCubit>();
    final todayCubit = sl<TodayOrdersCubit>();
    final historyCubit = sl<HistoryCubit>();
    expect(sl<TodayOrdersCubit>(), isNot(same(todayCubit)));

    await authCubit.close();
    await todayCubit.close();
    await historyCubit.close();
  });
}
