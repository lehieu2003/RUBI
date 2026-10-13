import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/extensions/build_context_extensions.dart';
import 'package:iceflow_mobile/core/extensions/number_format.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';
import 'package:iceflow_mobile/features/products/presentation/cubit/products_cubit.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/error_views.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

/// Màn "Sản phẩm & giá" của Quản lý: mọi sản phẩm với giá mặc định. Thêm sản
/// phẩm; bấm một sản phẩm để đổi giá, sửa, ngừng bán hoặc bán lại.
class ProductsScreen extends StatelessWidget {
  const ProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ProductsCubit>(
      create: (_) => sl<ProductsCubit>()..load(),
      child: Scaffold(
        appBar: AppHeader(
          title: AppStrings.productsTitle,
          subtitle: AppStrings.productsSubtitle,
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Builder(
                builder: (context) => FilledButton.tonalIcon(
                  key: const Key('products_new'),
                  onPressed: () => _show(
                    context,
                    (cubit) => showDialog<ProductActionResult>(
                      context: context,
                      builder: (_) => _NewProductDialog(cubit: cubit),
                    ),
                  ),
                  icon: const Icon(Icons.add),
                  label: const Text(AppStrings.productAddButton),
                ),
              ),
            ),
          ],
        ),
        body: const _ProductsBody(),
      ),
    );
  }
}

/// Mở một hộp / bảng thao tác rồi báo kết quả nó trả về.
Future<void> _show(
  BuildContext context,
  Future<ProductActionResult?> Function(ProductsCubit cubit) open,
) async {
  // Capture trước await — context không dùng được qua async gap an toàn.
  final messenger = ScaffoldMessenger.of(context);
  final errorColor = context.colorScheme.error;
  final result = await open(context.read<ProductsCubit>());
  if (result == null) return;
  messenger.showMessage(
    result.message,
    errorColor: result.ok ? null : errorColor,
  );
}

class _ProductsBody extends StatelessWidget {
  const _ProductsBody();

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<ProductsCubit>();
    return BlocBuilder<ProductsCubit, ProductsState>(
      builder: (context, state) {
        if (state.products.isEmpty && state.status == ViewStatus.error) {
          return ErrorView(message: state.errorMessage, onRetry: cubit.load);
        }
        if (state.products.isEmpty && state.status == ViewStatus.loading) {
          return const LoadingView();
        }
        final discontinued = state.discontinued;
        Widget tile(Product product) => _ProductTile(
              product: product,
              onTap: () => _show(
                context,
                (cubit) => showModalBottomSheet<ProductActionResult>(
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) => _ProductSheet(product: product, cubit: cubit),
                ),
              ),
            );
        return RefreshIndicator(
          onRefresh: cubit.load,
          child: ListView(
            padding: const EdgeInsets.only(top: 8, bottom: 16),
            children: [
              if (state.errorMessage != null)
                ErrorBanner(message: state.errorMessage!, onRetry: cubit.load),
              if (state.products.isEmpty)
                const EmptyView(message: AppStrings.productsEmpty),
              for (final product in state.onSale) tile(product),
              if (discontinued.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                  child: Text(
                    AppStrings.productsDiscontinued,
                    style: context.textTheme.titleSmall?.copyWith(
                      color: context.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              for (final product in discontinued) tile(product),
            ],
          ),
        );
      },
    );
  }
}

/// Một sản phẩm trong danh sách.
class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = context.colorScheme;
    final textTheme = context.textTheme;
    final muted = colorScheme.onSurfaceVariant;
    final price = product.price;
    final alert = product.minStock;
    return ListTile(
      key: Key('product_${product.id}'),
      title: Text(
        product.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: textTheme.titleMedium?.copyWith(
          color: product.isActive ? null : muted,
        ),
      ),
      subtitle: Text(
        alert == null
            ? product.unit
            : '${product.unit} · ${AppStrings.productAlertAt(alert)}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Text(
        price == null ? AppStrings.customerPriceMissing : formatVnd(price),
        style: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          // Đang bán mà chưa có giá thì không lên đơn được: nổi lên.
          color: price == null && product.isActive
              ? colorScheme.error
              : product.isActive
                  ? null
                  : muted,
        ),
      ),
      onTap: onTap,
    );
  }
}

/// Một sản phẩm và các thao tác trên nó. Đóng lại với kết quả của thao tác
/// vừa làm.
class _ProductSheet extends HookWidget {
  const _ProductSheet({required this.product, required this.cubit});

  final Product product;
  final ProductsCubit cubit;

  @override
  Widget build(BuildContext context) {
    final busy = useState(false);
    final textTheme = context.textTheme;
    final muted = context.colorScheme.onSurfaceVariant;
    final price = product.price;

    Future<void> run(Future<ProductActionResult> Function() action) async {
      if (busy.value) return;
      busy.value = true;
      final result = await action();
      if (context.mounted) Navigator.of(context).pop(result);
    }

    Future<void> changePrice() async {
      final next = await showDialog<double>(
        context: context,
        builder: (_) => _PriceDialog(product: product),
      );
      if (next == null) return;
      await run(() => cubit.setPrice(product, next));
    }

    Future<void> edit() async {
      final input = await showDialog<({String name, String unit, int? minStock})>(
        context: context,
        builder: (_) => _EditDialog(product: product),
      );
      if (input == null) return;
      await run(
        () => cubit.edit(
          product,
          name: input.name,
          unit: input.unit,
          minStock: input.minStock,
        ),
      );
    }

    Future<void> toggleSale() async {
      if (!product.isActive) {
        await run(() => cubit.setActive(product, active: true));
        return;
      }
      final ok = await showDialog<bool>(
            context: context,
            builder: (dialogContext) => AlertDialog(
              title: Text(AppStrings.productStopTitle(product.label)),
              content: const Text(AppStrings.productStopBody),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(false),
                  style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                  child: const Text(AppStrings.cancelButton),
                ),
                TextButton(
                  key: const Key('product_confirm'),
                  onPressed: () => Navigator.of(dialogContext).pop(true),
                  style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
                  child: const Text(AppStrings.productStopButton),
                ),
              ],
            ),
          ) ??
          false;
      if (ok) await run(() => cubit.setActive(product, active: false));
    }

    Widget action(String label, IconData icon, VoidCallback onPressed, {required String keyName, bool primary = false, bool danger = false}) =>
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: AppButton(
            key: Key(keyName),
            label: label,
            icon: icon,
            variant: primary ? AppButtonVariant.primary : AppButtonVariant.secondary,
            danger: danger,
            onPressed: busy.value ? null : onPressed,
          ),
        );

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(product.label, style: textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              price == null
                  ? AppStrings.productNoPriceHint
                  : AppStrings.orderEntryPrice(formatVnd(price), product.unit),
              style: textTheme.titleMedium?.copyWith(
                color: price == null ? context.colorScheme.error : null,
              ),
            ),
            Text(
              product.minStock == null
                  ? AppStrings.productAlertOff
                  : AppStrings.productAlertAt(product.minStock!),
              style: textTheme.bodyMedium?.copyWith(color: muted),
            ),
            const SizedBox(height: 8),
            action(
              AppStrings.productPriceButton,
              Icons.sell_outlined,
              changePrice,
              keyName: 'product_price',
              primary: true,
            ),
            action(AppStrings.productEditButton, Icons.edit_outlined, edit, keyName: 'product_edit'),
            action(
              product.isActive
                  ? AppStrings.productStopButton
                  : AppStrings.productResumeButton,
              product.isActive ? Icons.block : Icons.play_arrow_outlined,
              toggleSale,
              keyName: 'product_sale',
              danger: product.isActive,
            ),
            if (busy.value)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: LoadingView(),
              ),
          ],
        ),
      ),
    );
  }
}

InputDecoration _field(String label, {String? helper, String? suffix}) =>
    InputDecoration(
      labelText: label,
      helperText: helper,
      helperMaxLines: 2,
      suffixText: suffix,
      isDense: true,
      counterText: '',
    );

final _digits = [FilteringTextInputFormatter.digitsOnly];

List<Widget> _dialogActions(
  BuildContext context, {
  required VoidCallback? onSave,
  required String saveKey,
  bool busy = false,
}) =>
    [
      TextButton(
        onPressed: busy ? null : () => Navigator.of(context).pop(),
        style: TextButton.styleFrom(minimumSize: const Size(64, 48)),
        child: const Text(AppStrings.cancelButton),
      ),
      FilledButton(
        key: Key(saveKey),
        onPressed: busy ? null : onSave,
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48)),
        child: busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              )
            : const Text(AppStrings.customerSaveButton),
      ),
    ];

/// Giá hợp lệ (VND, lớn hơn 0) từ chuỗi chỉ gồm chữ số; `null` nếu không.
double? _parsePrice(String text) {
  final value = int.tryParse(text.trim());
  return value == null || value <= 0 || value > 99999999 ? null : value.toDouble();
}

/// Hộp thêm sản phẩm; đóng lại với kết quả khi đã thêm xong.
class _NewProductDialog extends HookWidget {
  const _NewProductDialog({required this.cubit});

  final ProductsCubit cubit;

  @override
  Widget build(BuildContext context) {
    final name = useTextEditingController();
    final size = useTextEditingController();
    final unit = useTextEditingController(text: AppStrings.productDefaultUnit);
    final price = useTextEditingController();
    final alert = useTextEditingController();
    final error = useState<String?>(null);
    final busy = useState(false);

    Future<void> submit() async {
      if (busy.value) return;
      final sizeKg = int.tryParse(size.text.trim());
      final parsedPrice = _parsePrice(price.text);
      if (name.text.trim().isEmpty) {
        error.value = AppStrings.productNameRequired;
      } else if (sizeKg == null || sizeKg <= 0 || sizeKg > 1000) {
        error.value = AppStrings.productSizeInvalid;
      } else if (parsedPrice == null) {
        error.value = AppStrings.productPriceInvalid;
      } else {
        busy.value = true;
        error.value = null;
        final result = await cubit.create(
          name: name.text,
          sizeKg: sizeKg,
          price: parsedPrice,
          unit: unit.text,
          minStock: int.tryParse(alert.text.trim()),
        );
        if (!context.mounted) return;
        if (result.ok) {
          Navigator.of(context).pop(result);
        } else {
          busy.value = false;
          error.value = result.message;
        }
      }
    }

    return AlertDialog(
      title: const Text(AppStrings.productAddTitle),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: const Key('product_new_name'),
              controller: name,
              autofocus: true,
              enabled: !busy.value,
              maxLength: 100,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: _field(AppStrings.productNameLabel),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const Key('product_new_size'),
                    controller: size,
                    enabled: !busy.value,
                    maxLength: 4,
                    keyboardType: TextInputType.number,
                    inputFormatters: _digits,
                    textInputAction: TextInputAction.next,
                    decoration: _field(AppStrings.productSizeLabel, suffix: 'kg'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    key: const Key('product_new_unit'),
                    controller: unit,
                    enabled: !busy.value,
                    maxLength: 20,
                    textInputAction: TextInputAction.next,
                    decoration: _field(AppStrings.productUnitLabel),
                  ),
                ),
              ],
            ),
            TextField(
              key: const Key('product_new_price'),
              controller: price,
              enabled: !busy.value,
              maxLength: 8,
              keyboardType: TextInputType.number,
              inputFormatters: _digits,
              textInputAction: TextInputAction.next,
              decoration: _field(AppStrings.productPriceLabel, suffix: 'đ'),
            ),
            TextField(
              key: const Key('product_new_alert'),
              controller: alert,
              enabled: !busy.value,
              maxLength: 7,
              keyboardType: TextInputType.number,
              inputFormatters: _digits,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => submit(),
              decoration: _field(
                AppStrings.productAlertLabel,
                helper: AppStrings.productAlertHelper,
              ),
            ),
            if (error.value != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  error.value!,
                  key: const Key('product_new_error'),
                  style: TextStyle(color: context.colorScheme.error),
                ),
              ),
          ],
        ),
      ),
      actions: _dialogActions(
        context,
        onSave: submit,
        saveKey: 'product_new_save',
        busy: busy.value,
      ),
    );
  }
}

/// Hộp nhập giá mặc định mới; đóng lại với giá hợp lệ.
class _PriceDialog extends HookWidget {
  const _PriceDialog({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final price = useTextEditingController(
      text: product.price == null ? '' : product.price!.round().toString(),
    );
    final error = useState<String?>(null);

    void submit() {
      final parsed = _parsePrice(price.text);
      if (parsed == null) {
        error.value = AppStrings.productPriceInvalid;
        return;
      }
      Navigator.of(context).pop(parsed);
    }

    return AlertDialog(
      title: Text(AppStrings.productPriceTitle(product.label)),
      content: TextField(
        key: const Key('product_price_input'),
        controller: price,
        autofocus: true,
        maxLength: 8,
        keyboardType: TextInputType.number,
        inputFormatters: _digits,
        onSubmitted: (_) => submit(),
        decoration: _field(
          AppStrings.productPriceLabel,
          helper: AppStrings.productPriceHelper,
          suffix: 'đ',
        ).copyWith(errorText: error.value),
      ),
      actions: _dialogActions(context, onSave: submit, saveKey: 'product_price_save'),
    );
  }
}

/// Hộp sửa tên, đơn vị và mức cảnh báo; đóng lại với giá trị mới.
class _EditDialog extends HookWidget {
  const _EditDialog({required this.product});

  final Product product;

  @override
  Widget build(BuildContext context) {
    final name = useTextEditingController(text: product.name);
    final unit = useTextEditingController(text: product.unit);
    final alert = useTextEditingController(
      text: product.minStock?.toString() ?? '',
    );
    final error = useState<String?>(null);

    void submit() {
      if (name.text.trim().isEmpty || unit.text.trim().isEmpty) {
        error.value = AppStrings.productNameUnitRequired;
        return;
      }
      Navigator.of(context).pop(
        (
          name: name.text,
          unit: unit.text,
          // Để trống là tắt cảnh báo.
          minStock: int.tryParse(alert.text.trim()),
        ),
      );
    }

    return AlertDialog(
      title: const Text(AppStrings.productEditButton),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            key: const Key('product_edit_name'),
            controller: name,
            maxLength: 100,
            textCapitalization: TextCapitalization.words,
            decoration: _field(AppStrings.productNameLabel)
                .copyWith(errorText: error.value),
          ),
          TextField(
            key: const Key('product_edit_unit'),
            controller: unit,
            maxLength: 20,
            decoration: _field(AppStrings.productUnitLabel),
          ),
          TextField(
            key: const Key('product_edit_alert'),
            controller: alert,
            maxLength: 7,
            keyboardType: TextInputType.number,
            inputFormatters: _digits,
            onSubmitted: (_) => submit(),
            decoration: _field(
              AppStrings.productAlertLabel,
              helper: AppStrings.productAlertHelper,
            ),
          ),
        ],
      ),
      actions: _dialogActions(context, onSave: submit, saveKey: 'product_edit_save'),
    );
  }
}
