import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';

/// Ô số lượng với nút giảm / tăng. Gõ thẳng số vào ô cho nhanh với số lớn;
/// xoá trắng ô nghĩa là 0.
///
/// Key của ba phần là `<keyPrefix>_minus_<id>`, `<keyPrefix>_qty_<id>`,
/// `<keyPrefix>_plus_<id>`.
class QuantityStepper extends HookWidget {
  const QuantityStepper({
    required this.keyPrefix,
    required this.id,
    required this.quantity,
    required this.onChanged,
    this.enabled = true,
    this.showZero = false,
    this.highlighted = false,
    super.key,
  });

  final String keyPrefix;
  final String id;
  final int quantity;
  final ValueChanged<int> onChanged;
  final bool enabled;

  /// Số 0 hiện thành "0" thay vì ô trống — cho chỗ mà 0 là một câu trả lời
  /// (thực giao 0 bao), không phải "chưa nhập".
  final bool showZero;

  /// Tô màu cảnh báo cho con số (lệch so với số đặt...).
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final controller = useTextEditingController();
    // Nút giảm / tăng đổi số → ô chữ theo; đang gõ thì không đụng con trỏ.
    useEffect(() {
      if ((int.tryParse(controller.text) ?? 0) != quantity ||
          (showZero && controller.text.isEmpty)) {
        controller.text = quantity == 0 && !showZero ? '' : '$quantity';
      }
      return null;
    }, [quantity]);

    final colorScheme = context.colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          key: Key('${keyPrefix}_minus_$id'),
          tooltip: AppStrings.settleDecreaseTooltip,
          onPressed: enabled && quantity > 0 ? () => onChanged(quantity - 1) : null,
          icon: const Icon(Icons.remove_circle_outline),
        ),
        SizedBox(
          width: 60,
          child: TextField(
            key: Key('${keyPrefix}_qty_$id'),
            controller: controller,
            enabled: enabled,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            textAlign: TextAlign.center,
            style: context.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: highlighted ? colorScheme.error : null,
            ),
            decoration: const InputDecoration(
              hintText: '0',
              border: OutlineInputBorder(),
              isDense: true,
              contentPadding: EdgeInsets.symmetric(vertical: 10),
            ),
            onChanged: (text) => onChanged(int.tryParse(text) ?? 0),
          ),
        ),
        IconButton(
          key: Key('${keyPrefix}_plus_$id'),
          tooltip: AppStrings.settleIncreaseTooltip,
          onPressed: enabled ? () => onChanged(quantity + 1) : null,
          icon: const Icon(Icons.add_circle_outline),
        ),
      ],
    );
  }
}
