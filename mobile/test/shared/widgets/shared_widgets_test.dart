import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/theme/app_theme.dart';
import 'package:iceflow_mobile/shared/widgets/app_button.dart';
import 'package:iceflow_mobile/shared/widgets/app_header.dart';
import 'package:iceflow_mobile/shared/widgets/load_more_button.dart';
import 'package:iceflow_mobile/shared/widgets/search_field.dart';
import 'package:iceflow_mobile/shared/widgets/snack_bars.dart';
import 'package:iceflow_mobile/shared/widgets/state_views.dart';

void main() {
  Future<void> pump(WidgetTester tester, Widget body, {ThemeData? theme}) =>
      tester.pumpWidget(
        MaterialApp(theme: theme ?? AppTheme.light, home: Scaffold(body: body)),
      );

  group('AppHeader', () {
    Future<void> pumpHeader(
      WidgetTester tester,
      AppHeader header, {
      ThemeData? theme,
    }) =>
        tester.pumpWidget(
          MaterialApp(
            theme: theme ?? AppTheme.light,
            home: Scaffold(appBar: header, body: const SizedBox()),
          ),
        );

    testWidgets('tiêu đề và dòng mô tả; có mô tả thì thanh cao hơn',
        (tester) async {
      await pumpHeader(
        tester,
        const AppHeader(title: 'Đơn hàng', subtitle: 'Xem, gán tài xế'),
      );
      expect(find.text('Đơn hàng'), findsOneWidget);
      expect(find.text('Xem, gán tài xế'), findsOneWidget);
      expect(
        const AppHeader(title: 'A', subtitle: 'B').preferredSize.height,
        greaterThan(const AppHeader(title: 'A').preferredSize.height),
      );
    });

    testWidgets('màn mở chồng lên màn khác → có nút quay lại, bấm thì về',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              appBar: const AppHeader(title: 'Thêm'),
              body: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const Scaffold(
                      appBar: AppHeader(title: 'Nhật ký'),
                    ),
                  ),
                ),
                child: const Text('mở'),
              ),
            ),
          ),
        ),
      );
      expect(find.byType(BackButton), findsNothing);

      await tester.tap(find.text('mở'));
      await tester.pumpAndSettle();
      expect(find.text('Nhật ký'), findsOneWidget);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text('Nhật ký'), findsNothing);
    });

    testWidgets('chữ đủ tương phản với nền ở cả bản sáng lẫn bản tối',
        (tester) async {
      for (final theme in [AppTheme.light, AppTheme.dark]) {
        await pumpHeader(tester, const AppHeader(title: 'Kho lạnh'), theme: theme);
        final bar = tester.widget<AppBar>(find.byType(AppBar));
        final background = bar.backgroundColor!.computeLuminance();
        final foreground = bar.foregroundColor!.computeLuminance();
        final lighter = background > foreground ? background : foreground;
        final darker = background > foreground ? foreground : background;
        // WCAG AA cho chữ thường: 4.5.
        expect(
          (lighter + 0.05) / (darker + 0.05),
          greaterThan(4.5),
          reason: theme.brightness.name,
        );
      }
    });

    testWidgets('tiêu đề và mô tả rất dài trên màn 320dp → không overflow',
        (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await pumpHeader(
        tester,
        AppHeader(
          title: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia ' * 2,
          subtitle: 'Ai đã làm gì với đơn hàng và công nợ ' * 2,
          actions: [IconButton(onPressed: () {}, icon: const Icon(Icons.add))],
        ),
      );
      expect(tester.takeException(), isNull);
    });
  });

  group('AppButton', () {
    testWidgets('ba mức nhấn dựng đúng loại nút, đều cao tối thiểu 48dp',
        (tester) async {
      await pump(
        tester,
        Column(
          children: [
            AppButton(label: 'Chính', onPressed: () {}),
            AppButton(
              label: 'Phụ',
              onPressed: () {},
              variant: AppButtonVariant.secondary,
            ),
            AppButton(
              label: 'Chữ',
              onPressed: () {},
              variant: AppButtonVariant.text,
            ),
          ],
        ),
      );
      expect(find.widgetWithText(FilledButton, 'Chính'), findsOneWidget);
      expect(find.widgetWithText(OutlinedButton, 'Phụ'), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Chữ'), findsOneWidget);
      for (final label in ['Chính', 'Phụ', 'Chữ']) {
        final size = tester.getSize(
          find.ancestor(of: find.text(label), matching: find.byType(AppButton)),
        );
        expect(size.height, greaterThanOrEqualTo(48), reason: label);
        expect(size.width, 800, reason: label);
      }
    });

    testWidgets('bấm → gọi onPressed; loading → khoá, hiện vòng xoay, giữ chữ',
        (tester) async {
      var taps = 0;
      await pump(tester, AppButton(label: 'Chốt', onPressed: () => taps++));
      await tester.tap(find.text('Chốt'));
      expect(taps, 1);

      await pump(
        tester,
        AppButton(
          label: 'Chốt',
          icon: Icons.check,
          onPressed: () => taps++,
          loading: true,
        ),
      );
      await tester.tap(find.text('Chốt'));
      expect(taps, 1);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.byIcon(Icons.check), findsNothing);
    });

    testWidgets('onPressed null → khoá; danger → màu lỗi', (tester) async {
      await pump(
        tester,
        const AppButton(
          label: 'Hủy đơn',
          onPressed: null,
          variant: AppButtonVariant.text,
          danger: true,
        ),
      );
      final button = tester.widget<TextButton>(find.byType(TextButton));
      expect(button.onPressed, isNull);
      expect(
        button.style!.foregroundColor!.resolve({}),
        AppTheme.light.colorScheme.error,
      );
    });
  });

  group('SearchField', () {
    testWidgets('chờ ngừng gõ rồi mới tìm, chỉ với chữ cuối cùng',
        (tester) async {
      final searches = <String>[];
      await pump(tester, SearchField(hint: 'Tìm khách', onSearch: searches.add));
      expect(find.text('Tìm khách'), findsOneWidget);

      await tester.enterText(find.byType(SearchField), 'cô');
      await tester.enterText(find.byType(SearchField), 'cô ba');
      await tester.pump(const Duration(milliseconds: 100));
      expect(searches, isEmpty);

      await tester.pump(const Duration(milliseconds: 300));
      expect(searches, ['cô ba']);
    });

    testWidgets('rời màn khi đang chờ → không tìm nữa', (tester) async {
      final searches = <String>[];
      await pump(tester, SearchField(hint: 'Tìm', onSearch: searches.add));
      await tester.enterText(find.byType(SearchField), 'cô');
      await pump(tester, const SizedBox());
      await tester.pump(const Duration(milliseconds: 500));

      expect(searches, isEmpty);
    });
  });

  testWidgets('LoadMoreButton: bấm → gọi; đang tải → vòng xoay thay nút',
      (tester) async {
    var taps = 0;
    await pump(tester, LoadMoreButton(loading: false, onPressed: () => taps++));
    await tester.tap(find.text(AppStrings.loadMoreButton));
    expect(taps, 1);

    await pump(tester, LoadMoreButton(loading: true, onPressed: () => taps++));
    expect(find.text(AppStrings.loadMoreButton), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('LoadingView và EmptyView', (tester) async {
    await pump(tester, const LoadingView());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await pump(tester, const EmptyView(message: 'Chưa có đơn nào'));
    expect(find.text('Chưa có đơn nào'), findsOneWidget);
  });

  testWidgets('showMessage: câu mới thay câu đang hiện; lỗi thì tô màu lỗi',
      (tester) async {
    await pump(tester, const SizedBox());
    final messenger = tester.state<ScaffoldMessengerState>(
      find.byType(ScaffoldMessenger),
    );

    messenger.showMessage('Đã lưu');
    await tester.pumpAndSettle();
    expect(find.text('Đã lưu'), findsOneWidget);

    messenger.showMessage('Không lưu được', errorColor: Colors.red);
    await tester.pumpAndSettle();
    expect(find.text('Đã lưu'), findsNothing);
    expect(find.text('Không lưu được'), findsOneWidget);
    expect(tester.widget<SnackBar>(find.byType(SnackBar)).backgroundColor, Colors.red);
  });
}
