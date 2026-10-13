import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/driver/presentation/cubit/history_cubit.dart';
import 'package:iceflow_mobile/features/driver/presentation/widgets/delivery_card.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Label ngày trên header: 'Thứ Ba, 06/10/2026' — thứ tiếng Việt (EEEE) +
/// ngày dd/MM/yyyy, gộp MỘT dòng [titleMedium]. Cần [initializeDateFormatting]
/// chạy trước ở bootstrap (main.dart).
String historyDateLabel(DateTime date) =>
    '${DateFormat.EEEE('vi').format(date)}, '
    '${DateFormat('dd/MM/yyyy').format(date)}';

/// Phạm vi date picker của tab lịch sử: từ hôm nay - 30 ngày đến hôm qua
/// (date-only, bỏ phần giờ của [now]). Biên xử lý ở cubit — hàm này chỉ để
/// picker không cho chọn sẵn ngày ngoài phạm vi.
({DateTime firstDate, DateTime lastDate}) historyPickerRange(DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  return (
    firstDate: today.subtract(const Duration(days: 30)),
    lastDate: today.subtract(const Duration(days: 1)),
  );
}

/// Tab "Lịch sử": driver xem lại các ngày đã giao trong 30 ngày gần nhất.
///
/// Read-only toàn bộ: card render bằng [DeliveryCard.readOnly] (không nút
/// Gọi / Chỉ đường / ĐÃ GIAO), không luồng xác nhận. Điều hướng ngày chỉ
/// gọi cubit — ràng buộc 30 ngày / tương lai do cubit chặn và báo message,
/// UI không tự kiểm tra gì (UI "ngu").
class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<HistoryCubit>(
      // Cubit KHÔNG tự load (Task 13) → create gọi load() lần đầu, giống
      // pattern TodayTab. Rời tab unmount cubit → quay lại tải lại từ đầu.
      create: (_) => sl<HistoryCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(title: AppStrings.navHistory),
        body: BlocBuilder<HistoryCubit, HistoryState>(
          builder: (context, state) {
            final cubit = context.read<HistoryCubit>();

            return Column(
              children: [
                _DateNavBar(
                  selectedDate: state.selectedDate,
                  onPickDate: () => _pickDate(context, state),
                ),
                // Message khi chưa có đơn để giữ (lỗi tải LẪN chặn range ở
                // lần bấm đầu — status có thể vẫn là loading): hiện message
                // bất kể status (handoff Task 13).
                if (state.orders.isEmpty && state.errorMessage != null)
                  Expanded(
                    child: ErrorView(
                      message: state.errorMessage,
                      onRetry: cubit.load,
                    ),
                  )
                else if (state.status == ViewStatus.loading)
                  const Expanded(child: LoadingView())
                else if (state.orders.isEmpty)
                  Expanded(
                    child: Center(
                      child: Text(
                        AppStrings.historyNoOrders,
                        style: context.textTheme.titleMedium,
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: Column(
                      children: [
                        // Chặn range khi đang có đơn của ngày cũ → banner
                        // trên đầu, danh sách ngày cũ vẫn hiển thị.
                        if (state.errorMessage != null)
                          ErrorBanner(
                            message: state.errorMessage!,
                            onRetry: cubit.load,
                          ),
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: state.orders.length,
                            itemBuilder: (context, index) {
                              // Read-only: KHÔNG truyền callback nào.
                              return DeliveryCard(
                                order: state.orders[index],
                                readOnly: true,
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _pickDate(BuildContext context, HistoryState state) async {
    final range = historyPickerRange(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: state.selectedDate,
      firstDate: range.firstDate,
      lastDate: range.lastDate,
    );
    if (picked == null || !context.mounted) return;
    context.read<HistoryCubit>().selectDate(picked);
  }
}

/// Header điều hướng ngày: "◀" | label ngày (bấm để mở picker) | "▶".
/// Nút luôn enabled — tua ra ngoài phạm vi do cubit chặn.
class _DateNavBar extends StatelessWidget {
  const _DateNavBar({required this.selectedDate, required this.onPickDate});

  final DateTime selectedDate;
  final VoidCallback onPickDate;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<HistoryCubit>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 4, 4, 0),
      child: Row(
        children: [
          IconButton(
            onPressed: () => cubit.selectDate(
              selectedDate.subtract(const Duration(days: 1)),
            ),
            icon: const Icon(Icons.chevron_left),
          ),
          Expanded(
            child: InkWell(
              onTap: onPickDate,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  historyDateLabel(selectedDate),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.textTheme.titleMedium,
                ),
              ),
            ),
          ),
          IconButton(
            onPressed: () => cubit.selectDate(
              selectedDate.add(const Duration(days: 1)),
            ),
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
    );
  }
}
