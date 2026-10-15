import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/idempotency.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/shells/domain/shell_balance.dart';
import 'package:iceflow_mobile/features/shells/presentation/shells_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Màn "Vỏ bao" của Quản lý: mỗi khách đang giữ bao nhiêu vỏ và bao nhiêu
/// tiền cọc. Bấm một khách để ghi vỏ giao thêm / thu về, hoặc sửa lại tổng.
class ShellsScreen extends StatelessWidget {
  const ShellsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ShellsCubit>(
      create: (_) => sl<ShellsCubit>()..load(),
      child: Scaffold(
        appBar: const AppHeader(
          title: AppStrings.shellsTitle,
          subtitle: AppStrings.shellsSubtitle,
        ),
        body: BlocBuilder<ShellsCubit, ShellsState>(
          builder: (context, state) {
            final cubit = context.read<ShellsCubit>();
            if (state.balances.isEmpty && state.status == ViewStatus.error) {
              return ErrorView(message: state.errorMessage, onRetry: cubit.load);
            }
            if (state.balances.isEmpty && state.status == ViewStatus.loading) {
              return const LoadingView();
            }
            final textTheme = context.textTheme;
            return RefreshIndicator(
              onRefresh: cubit.load,
              child: ListView(
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  if (state.errorMessage != null)
                    ErrorBanner(message: state.errorMessage!, onRetry: cubit.load),
                  Card(
                    margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppStrings.shellsTotalHeld(state.totalHeld),
                            key: const Key('shells_total_held'),
                            style: textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            AppStrings.shellsTotalDeposit(
                              formatVnd(state.totalDeposit),
                            ),
                            key: const Key('shells_total_deposit'),
                            style: textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (state.balances.isEmpty)
                    const EmptyView(message: AppStrings.shellsEmpty),
                  for (final balance in state.balances)
                    ListTile(
                      key: Key('shells_${balance.customerId}'),
                      title: Text(
                        balance.customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: textTheme.titleMedium,
                      ),
                      subtitle: Text(
                        AppStrings.shellsOutIn(balance.shellsOut, balance.shellsIn),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            AppStrings.shellsHeld(balance.held),
                            style: textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            formatVnd(balance.netDepositOwed),
                            style: textTheme.bodySmall,
                          ),
                        ],
                      ),
                      onTap: () => _edit(context, balance),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _edit(BuildContext context, ShellBalance balance) async {
    // Capture trước await — context không dùng được qua async gap an toàn.
    final messenger = ScaffoldMessenger.of(context);
    final cubit = context.read<ShellsCubit>();
    final result = await showDialog<ShellActionResult>(
      context: context,
      builder: (_) => _ShellDialog(balance: balance, cubit: cubit),
    );
    if (result != null) messenger.showMessage(result.message);
  }
}

/// Hộp ghi vỏ của một khách. "Ghi thêm": hai số cộng vào tổng. "Sửa tổng":
/// hai số thay cho tổng đang lưu. Đóng lại với kết quả khi đã lưu xong.
class _ShellDialog extends HookWidget {
  const _ShellDialog({required this.balance, required this.cubit});

  final ShellBalance balance;
  final ShellsCubit cubit;

  @override
  Widget build(BuildContext context) {
    final correcting = useState(false);
    final out = useTextEditingController();
    final back = useTextEditingController();
    final error = useState<String?>(null);
    final busy = useState(false);
    // Một mã cho lần ghi thêm này, giữ đến khi đóng hộp: bấm lưu lại sau lỗi
    // không cộng hai lần.
    final submission = useMemoized(SubmissionKey.new);

    void switchMode(bool toCorrecting) {
      correcting.value = toCorrecting;
      error.value = null;
      // Sửa tổng mở sẵn số đang lưu; ghi thêm bắt đầu từ ô trống.
      out.text = toCorrecting ? '${balance.shellsOut}' : '';
      back.text = toCorrecting ? '${balance.shellsIn}' : '';
    }

    Future<void> submit() async {
      if (busy.value) return;
      final shellsOut = int.tryParse(out.text.trim()) ?? 0;
      final shellsIn = int.tryParse(back.text.trim()) ?? 0;
      if (correcting.value) {
        if (shellsIn > shellsOut) {
          error.value = AppStrings.shellsInExceedsOut;
          return;
        }
      } else if (shellsOut == 0 && shellsIn == 0) {
        error.value = AppStrings.shellsNothingEntered;
        return;
      } else if (shellsIn > balance.held + shellsOut) {
        // Không thu về nhiều hơn số khách đang giữ.
        error.value = AppStrings.shellsReturnTooMany(balance.held + shellsOut);
        return;
      }
      busy.value = true;
      error.value = null;
      final result = correcting.value
          ? await cubit.correct(balance, shellsOut: shellsOut, shellsIn: shellsIn)
          : await cubit.record(
              balance,
              shellsOut: shellsOut,
              shellsIn: shellsIn,
              idempotencyKey: submission.keyFor((shellsOut, shellsIn)),
            );
      if (!context.mounted) return;
      if (result.ok || result.unsure) {
        Navigator.of(context).pop(result);
      } else {
        busy.value = false;
        error.value = result.message;
      }
    }

    InputDecoration field(String label) =>
        InputDecoration(labelText: label, isDense: true, counterText: '');

    return AlertDialog(
      title: Text(balance.customerName),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(AppStrings.shellsHeldNow(balance.held)),
            const SizedBox(height: 12),
            SegmentedButton<bool>(
              key: const Key('shells_mode'),
              segments: const [
                ButtonSegment(value: false, label: Text(AppStrings.shellsModeAdd)),
                ButtonSegment(value: true, label: Text(AppStrings.shellsModeSet)),
              ],
              selected: {correcting.value},
              onSelectionChanged:
                  busy.value ? null : (selection) => switchMode(selection.first),
            ),
            const SizedBox(height: 8),
            TextField(
              key: const Key('shells_out'),
              controller: out,
              autofocus: true,
              enabled: !busy.value,
              maxLength: 6,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              textInputAction: TextInputAction.next,
              decoration: field(
                correcting.value
                    ? AppStrings.shellsOutTotalLabel
                    : AppStrings.shellsOutLabel,
              ),
            ),
            TextField(
              key: const Key('shells_in'),
              controller: back,
              enabled: !busy.value,
              maxLength: 6,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onSubmitted: (_) => submit(),
              decoration: field(
                correcting.value
                    ? AppStrings.shellsInTotalLabel
                    : AppStrings.shellsInLabel,
              ),
            ),
            if (error.value != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  error.value!,
                  key: const Key('shells_error'),
                  style: TextStyle(color: context.colorScheme.error),
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: busy.value ? null : () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
          child: const Text(AppStrings.cancelButton),
        ),
        FilledButton(
          key: const Key('shells_save'),
          onPressed: busy.value ? null : submit,
          style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
          child: busy.value
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                )
              : const Text(AppStrings.customerSaveButton),
        ),
      ],
    );
  }
}
