import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/injector.dart';

/// Tab "Lịch sử" — PLACEHOLDER Phase 1.
///
/// Đã wire [HistoryCubit] qua BlocProvider để Task 15 chỉ cần thay body;
/// UI đầy đủ (chọn ngày + danh sách đơn) sẽ về trong Task 15.
class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<HistoryCubit>(
      create: (_) => sl<HistoryCubit>(),
      child: Scaffold(
        appBar: AppBar(title: const Text(AppStrings.navHistory)),
        body: const Center(child: Text(AppStrings.historyComingSoon)),
      ),
    );
  }
}
