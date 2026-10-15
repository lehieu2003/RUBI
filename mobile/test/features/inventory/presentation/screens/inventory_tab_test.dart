import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_error_decoder.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart';
import 'package:iceflow_mobile/features/inventory/presentation/cubit/inventory_cubit.dart';
import 'package:iceflow_mobile/features/inventory/presentation/screens/inventory_tab.dart';
import 'package:mocktail/mocktail.dart';

class _MockInventoryRepository extends Mock implements InventoryRepository {}

void main() {
  const plenty = StockItem(
    productId: 'prod-bi-5',
    productName: 'Đá Bi',
    sizeKg: 5,
    unit: 'Bao',
    quantityOnHand: 1200,
    totalKg: 6000,
    sellable: 1150,
    minStock: null,
    lowStock: false,
  );
  const low = StockItem(
    productId: 'prod-vien-5',
    productName: 'Đá Viên',
    sizeKg: 5,
    unit: 'Bao',
    quantityOnHand: 30,
    totalKg: 150,
    sellable: 18,
    minStock: 20,
    lowStock: true,
  );
  const stock = Stock(items: [plenty, low], totalBags: 1230, totalKg: 6150);

  late _MockInventoryRepository repo;

  setUp(() {
    repo = _MockInventoryRepository();
    sl.registerFactory<InventoryCubit>(() => InventoryCubit(repo: repo));
  });

  tearDown(() => sl.unregister<InventoryCubit>());

  Future<void> pumpTab(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: InventoryTab()));
    await tester.pump();
  }

  Finder card(String productId) => find.byKey(Key('inventory_item_$productId'));
  Finder inCard(String productId, String text) =>
      find.descendant(of: card(productId), matching: find.text(text));

  group('InventoryTab', () {
    testWidgets('tổng, từng sản phẩm, và cảnh báo sắp hết theo số còn bán được',
        (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      await pumpTab(tester);

      expect(find.text('1.230'), findsOneWidget);
      expect(find.text('6.150 kg'), findsOneWidget);
      expect(inCard('prod-bi-5', 'Tồn: 1.200 Bao'), findsOneWidget);
      expect(inCard('prod-bi-5', 'Còn bán được: 1.150'), findsOneWidget);
      expect(inCard('prod-bi-5', AppStrings.stockLowBadge), findsNothing);
      expect(inCard('prod-vien-5', AppStrings.stockLowBadge), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('inventory_low_stock_alert')),
          matching: find.text('Đá Viên 5kg: còn bán được 18 Bao (mức cảnh báo 20)'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('không sản phẩm nào sắp hết → không có khung cảnh báo',
        (tester) async {
      when(() => repo.getStock()).thenAnswer(
        (_) async => const Ok(Stock(items: [plenty], totalBags: 1200, totalKg: 6000)),
      );
      await pumpTab(tester);

      expect(find.byKey(const Key('inventory_low_stock_alert')), findsNothing);
    });

    testWidgets('tồn âm → chữ đỏ kèm lời nhắc', (tester) async {
      when(() => repo.getStock()).thenAnswer(
        (_) async => const Ok(
          Stock(
            items: [
              StockItem(
                productId: 'p',
                productName: 'Đá Cây',
                sizeKg: 50,
                unit: 'Cây',
                quantityOnHand: -4,
                totalKg: -200,
                sellable: -4,
                minStock: null,
                lowStock: false,
              ),
            ],
            totalBags: -4,
            totalKg: -200,
          ),
        ),
      );
      await pumpTab(tester);

      expect(inCard('p', 'Tồn: -4 Cây'), findsOneWidget);
      expect(inCard('p', AppStrings.stockNegativeHint), findsOneWidget);
    });

    testWidgets('Nhập mẻ: số không hợp lệ bị chặn; số hợp lệ được gửi và báo '
        'tồn mới', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => const Ok(70));
      await pumpTab(tester);

      await tester.tap(inCard('prod-vien-5', AppStrings.stockProductionButton));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.stockProductionTitle), findsOneWidget);

      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '0');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pump();
      expect(find.text(AppStrings.stockProductionInvalid), findsOneWidget);
      verifyNever(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')));

      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '40');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();

      verify(() => repo.recordProduction(productId: 'prod-vien-5', quantity: 40, idempotencyKey: any(named: 'idempotencyKey'))).called(1);
      expect(find.text(AppStrings.stockProductionTitle), findsNothing);
      expect(find.text(AppStrings.stockProductionSaved(40, 'Bao', 70)), findsOneWidget);
    });

    testWidgets('Kiểm kho: nhận số 0, gửi kèm ghi chú', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      when(() => repo.recordCount(
            productId: any(named: 'productId'),
            counted: any(named: 'counted'),
            note: any(named: 'note'),
          )).thenAnswer((_) async => const Ok(0));
      await pumpTab(tester);

      await tester.tap(inCard('prod-vien-5', AppStrings.stockCountButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '0');
      await tester.enterText(find.byKey(const Key('stock_sheet_note')), 'Hết đá');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();

      verify(() => repo.recordCount(productId: 'prod-vien-5', counted: 0, note: 'Hết đá')).called(1);
      expect(find.text(AppStrings.stockCountSaved(0, 'Bao')), findsOneWidget);
    });

    testWidgets('server từ chối → câu của server hiện trong sheet, sheet còn mở',
        (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => const Err(ServerFailure('Không tìm thấy sản phẩm', statusCode: 404)));
      await pumpTab(tester);

      await tester.tap(inCard('prod-bi-5', AppStrings.stockProductionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '5');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();

      expect(find.text('Không tìm thấy sản phẩm'), findsOneWidget);
      expect(find.text(AppStrings.stockProductionTitle), findsOneWidget);
    });

    testWidgets('Nhập mẻ mất response (receive timeout) → báo chưa chắc đã '
        'lưu, đóng sheet, tải lại kho; không gửi lần hai', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      // Đúng thứ guardApi trả khi request đã đi mà response không về kịp.
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => Err(mapDioError(DioException(
                requestOptions: RequestOptions(path: '/api/inventory'),
                type: DioExceptionType.receiveTimeout,
              ))));
      await pumpTab(tester);
      clearInteractions(repo);

      await tester.tap(inCard('prod-vien-5', AppStrings.stockProductionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '40');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();

      expect(find.textContaining('Mất kết nối khi đang lưu'), findsOneWidget);
      expect(find.text(FailureMessages.network), findsNothing);
      // Sheet đã đóng: không còn nút để bấm gửi lại.
      expect(find.text(AppStrings.stockProductionTitle), findsNothing);
      expect(find.byKey(const Key('stock_sheet_submit')), findsNothing);
      verify(() => repo.getStock()).called(1);
      verify(() => repo.recordProduction(productId: 'prod-vien-5', quantity: 40, idempotencyKey: any(named: 'idempotencyKey'))).called(1);
    });

    testWidgets('Nhập mẻ gửi lại cùng số trong sheet → cùng Idempotency-Key; đổi '
        'số → mã mới', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => const Err<int>(ServerFailure('Lỗi máy chủ', statusCode: 500)));
      await pumpTab(tester);

      await tester.tap(inCard('prod-vien-5', AppStrings.stockProductionButton));
      await tester.pumpAndSettle();
      for (final quantity in ['40', '40', '30']) {
        await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), quantity);
        await tester.tap(find.byKey(const Key('stock_sheet_submit')));
        await tester.pumpAndSettle();
      }

      final keys = verify(() => repo.recordProduction(
            productId: 'prod-vien-5',
            quantity: any(named: 'quantity'),
            idempotencyKey: captureAny(named: 'idempotencyKey'),
          )).captured;
      expect(keys, hasLength(3));
      expect(keys[0], isA<String>());
      expect(keys[1], keys[0]);
      expect(keys[2], isNot(keys[0]));
    });

    testWidgets('Nhập mẻ bị server từ chối (400) → câu của server; sửa số rồi '
        'gửi lại được', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      var calls = 0;
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async {
        calls++;
        return calls == 1
            ? const Err<int>(ServerFailure('Số lượng không hợp lệ', statusCode: 400))
            : const Ok(60);
      });
      await pumpTab(tester);

      await tester.tap(inCard('prod-vien-5', AppStrings.stockProductionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '40');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();
      expect(find.text('Số lượng không hợp lệ'), findsOneWidget);
      expect(find.text(AppStrings.stockProductionTitle), findsOneWidget);

      await tester.enterText(find.byKey(const Key('stock_sheet_quantity')), '30');
      await tester.tap(find.byKey(const Key('stock_sheet_submit')));
      await tester.pumpAndSettle();
      expect(calls, 2);
      verify(() => repo.recordProduction(productId: 'prod-vien-5', quantity: 30, idempotencyKey: any(named: 'idempotencyKey'))).called(1);
      expect(find.text(AppStrings.stockProductionSaved(30, 'Bao', 60)), findsOneWidget);
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getStock()).thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpTab(tester);

      expect(find.text(FailureMessages.network), findsOneWidget);
      when(() => repo.getStock()).thenAnswer((_) async => const Ok(stock));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();
      await tester.pump();
      expect(card('prod-bi-5'), findsOneWidget);
    });

    testWidgets('điện thoại hẹp (360dp), tên sản phẩm dài → không tràn bố cục',
        (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      when(() => repo.getStock()).thenAnswer(
        (_) async => const Ok(
          Stock(
            items: [
              StockItem(
                productId: 'p',
                productName: 'Đá Viên Tinh Khiết Loại Đặc Biệt Cho Nhà Hàng',
                sizeKg: 20,
                unit: 'Bao',
                quantityOnHand: 12,
                totalKg: 240,
                sellable: 3,
                minStock: 10,
                lowStock: true,
              ),
            ],
            totalBags: 12,
            totalKg: 240,
          ),
        ),
      );
      await pumpTab(tester);

      expect(find.byKey(const Key('inventory_low_stock_alert')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
