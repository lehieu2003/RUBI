import 'package:flutter/material.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';

/// Màn lỗi khi tải lần đầu không có dữ liệu cũ để giữ:
/// icon + message + nút Thử lại. Dùng chung TodayTab / HistoryTab.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry});

  final String? message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 48,
              color: colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              // Cubit luôn bắn message khi load lỗi — đây chỉ là phòng hờ.
              message ?? FailureMessages.unexpected,
              textAlign: TextAlign.center,
              style: context.textTheme.bodyLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(120, 48),
              ),
              child: const Text(AppStrings.retryButton),
            ),
          ],
        ),
      ),
    );
  }
}

/// Banner lỗi trên đầu danh sách (MaterialBanner-lite): nền errorContainer
/// + message + nút thử lại. Dùng chung TodayTab / HistoryTab.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    return Material(
      color: colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 4, 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                message,
                style: context.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onErrorContainer,
                ),
              ),
            ),
            IconButton(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              color: colorScheme.onErrorContainer,
              tooltip: AppStrings.retryButton,
            ),
          ],
        ),
      ),
    );
  }
}
