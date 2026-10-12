import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/today_orders_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/confirm_sheet.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:url_launcher/url_launcher.dart';

/// Tab "Đơn hôm nay": AppBar "Đơn hôm nay" + danh sách [DeliveryCard] có
/// pull-to-refresh và luồng xác nhận đã giao.
///
/// Cubit lấy từ DI (factory) lúc tab mount — quay lại tab là danh sách được
/// tải lại từ đầu, driver luôn thấy dữ liệu mới nhất.
class TodayTab extends StatelessWidget {
  const TodayTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<TodayOrdersCubit>(
      create: (_) => sl<TodayOrdersCubit>()..load(),
      child: _RefreshOnResume(
        child: Scaffold(
          appBar: AppBar(title: const Text(AppStrings.todayTitle)),
          body: BlocBuilder<TodayOrdersCubit, TodayOrdersState>(
            builder: (context, state) {
              final cubit = context.read<TodayOrdersCubit>();

              // Lần tải đầu chưa có gì → spinner.
              if (state.status == ViewStatus.loading && state.orders.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }
              // Tải lỗi mà không có đơn cũ để giữ → màn lỗi + Thử lại.
              if (state.orders.isEmpty && state.status == ViewStatus.error) {
                return ErrorView(
                  message: state.errorMessage,
                  onRetry: cubit.load,
                );
              }

              return Column(
                children: [
                  // Lỗi tạm thời (refresh/confirm) nhưng danh sách còn → banner
                  // trên đầu danh sách, đơn cũ vẫn hiển thị.
                  if (state.errorMessage != null)
                    ErrorBanner(
                      message: state.errorMessage!,
                      onRetry: cubit.refresh,
                    ),
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: cubit.refresh,
                      child: state.orders.isEmpty
                          ? ListView(
                              // AlwaysScrollable để vẫn kéo được khi rỗng.
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(
                                  height:
                                      MediaQuery.of(context).size.height * 0.6,
                                  child: Center(
                                    child: Text(
                                      AppStrings.todayEmpty,
                                      style: context.textTheme
                                          .titleMedium,
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : ListView.builder(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              itemCount: state.orders.length,
                              itemBuilder: (context, index) {
                                final order = state.orders[index];
                                return DeliveryCard(
                                  order: order,
                                  isConfirming:
                                      state.confirmingOrderId == order.id,
                                  onConfirm: () => showConfirmSheet(
                                    context,
                                    order: order,
                                    onConfirmed: () {
                                      // State cubit tự cập nhật → card đổi
                                      // badge + tụt xuống cuối danh sách.
                                    },
                                  ),
                                  onCall: () =>
                                      _launchCall(context, order.customerPhone),
                                  onDirections: () => _launchDirections(
                                    context,
                                    order.customerAddress,
                                  ),
                                );
                              },
                            ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Mở lại app từ nền → tải lại danh sách (giữ đơn đang hiện), để đơn văn
/// phòng vừa gán xuất hiện mà tài xế không phải kéo xuống.
class _RefreshOnResume extends HookWidget {
  const _RefreshOnResume({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<TodayOrdersCubit>();
    useOnAppLifecycleStateChange((previous, current) {
      if (current == AppLifecycleState.resumed) cubit.refresh();
    });
    return child;
  }
}

Future<void> _launchCall(BuildContext context, String phone) async {
  try {
    await launchUrl(
      Uri(scheme: 'tel', path: phone),
      mode: LaunchMode.externalApplication,
    );
  } on Object {
    if (!context.mounted) return;
    _showLaunchError(context);
  }
}

Future<void> _launchDirections(BuildContext context, String address) async {
  try {
    await launchUrl(
      Uri.parse(
        'https://www.google.com/maps/search/'
        '?api=1&query=${Uri.encodeComponent(address)}',
      ),
      mode: LaunchMode.externalApplication,
    );
  } on Object {
    if (!context.mounted) return;
    _showLaunchError(context);
  }
}

void _showLaunchError(BuildContext context) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text(AppStrings.launchFailed)),
  );
}
