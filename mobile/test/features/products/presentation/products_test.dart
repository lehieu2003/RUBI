import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/products/domain/entities/product.dart';
import 'package:iceflow_mobile/features/products/domain/repositories/products_repository.dart';
import 'package:iceflow_mobile/features/products/presentation/cubit/products_cubit.dart';
import 'package:iceflow_mobile/features/products/presentation/screens/products_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockRepo extends Mock implements ProductsRepository {}

const bi5 = Product(id: 'p-1', name: 'Đá Bi', sizeKg: 5, unit: 'Bao', isActive: true, price: 12000, minStock: 20);
const tuyet = Product(id: 'p-2', name: 'Đá Tuyết', sizeKg: 20, unit: 'Bao', isActive: true);
const cay = Product(id: 'p-3', name: 'Đá Cây', sizeKg: 50, unit: 'Cây', isActive: false, price: 35000);
const products = [bi5, tuyet, cay];

Product changed(Product p, {String? name, String? unit, bool? isActive, int? minStock, bool clearAlert = false}) =>
    Product(
      id: p.id,
      name: name ?? p.name,
      sizeKg: p.sizeKg,
      unit: unit ?? p.unit,
      isActive: isActive ?? p.isActive,
      price: p.price,
      minStock: clearAlert ? null : minStock ?? p.minStock,
    );

void main() {
  late _MockRepo repo;

  void stubUpdate(Result<Product> result) {
    when(
      () => repo.updateProduct(
        any(),
        name: any(named: 'name'),
        unit: any(named: 'unit'),
        minStock: any(named: 'minStock'),
        clearMinStock: any(named: 'clearMinStock'),
        isActive: any(named: 'isActive'),
        currentPrice: any(named: 'currentPrice'),
      ),
    ).thenAnswer((_) async => result);
  }

  void stubCreate(Result<Product> result) {
    when(
      () => repo.createProduct(
        name: any(named: 'name'),
        sizeKg: any(named: 'sizeKg'),
        price: any(named: 'price'),
        unit: any(named: 'unit'),
        minStock: any(named: 'minStock'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockRepo();
    when(() => repo.getProducts()).thenAnswer((_) async => const Ok(products));
    when(() => repo.setPrice(any(), any())).thenAnswer((_) async => const Ok<void>(null));
  });

  group('ProductsCubit', () {
    late ProductsCubit cubit;
    setUp(() async {
      cubit = ProductsCubit(repo: repo);
      await cubit.load();
    });
    tearDown(() => cubit.close());

    test('load → tách sản phẩm đang bán và đã ngừng bán', () {
      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.onSale, [bi5, tuyet]);
      expect(cubit.state.discontinued, [cay]);
    });

    test('lỗi khi làm mới → giữ danh sách đang xem', () async {
      when(() => repo.getProducts())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();

      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.products, products);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    test('setPrice → gửi giá mới, danh sách hiện giá mới, báo kết quả', () async {
      final result = await cubit.setPrice(bi5, 12500);

      expect(result, (ok: true, message: AppStrings.productPriceSet('Đá Bi 5kg', '12.500đ')));
      verify(() => repo.setPrice('p-1', 12500)).called(1);
      expect(cubit.state.products.first.price, 12500);
      expect(cubit.state.products.first.minStock, 20, reason: 'các trường khác giữ nguyên');
    });

    test('setPrice lỗi → câu của server, giá giữ nguyên', () async {
      when(() => repo.setPrice(any(), any()))
          .thenAnswer((_) async => const Err<void>(ServerFailure('Không tìm thấy sản phẩm')));

      final result = await cubit.setPrice(bi5, 12500);

      expect(result, (ok: false, message: 'Không tìm thấy sản phẩm'));
      expect(cubit.state.products.first.price, 12000);
    });

    test('edit → gửi tên, đơn vị, mức cảnh báo; để trống mức là tắt cảnh báo',
        () async {
      stubUpdate(Ok(changed(bi5, name: 'Đá Bi Lớn', unit: 'Túi', clearAlert: true)));

      final result = await cubit.edit(bi5, name: 'Đá Bi Lớn', unit: 'Túi', minStock: null);

      expect(result, (ok: true, message: AppStrings.productSaved('Đá Bi Lớn 5kg')));
      verify(
        () => repo.updateProduct(
          'p-1',
          name: 'Đá Bi Lớn',
          unit: 'Túi',
          minStock: null,
          clearMinStock: true,
          currentPrice: 12000,
        ),
      ).called(1);
      expect(cubit.state.products.first.name, 'Đá Bi Lớn');
      expect(cubit.state.products.first.minStock, isNull);
    });

    test('setActive: ngừng bán → sang nhóm đã ngừng; bán lại → về nhóm đang bán',
        () async {
      stubUpdate(Ok(changed(bi5, isActive: false)));
      final stopped = await cubit.setActive(bi5, active: false);
      expect(stopped, (ok: true, message: AppStrings.productStopped('Đá Bi 5kg')));
      verify(() => repo.updateProduct('p-1', isActive: false, currentPrice: 12000)).called(1);
      expect(cubit.state.onSale, [tuyet]);

      stubUpdate(Ok(changed(cay, isActive: true)));
      final resumed = await cubit.setActive(cay, active: true);
      expect(resumed, (ok: true, message: AppStrings.productResumed('Đá Cây 50kg')));
      expect(cubit.state.discontinued.map((p) => p.id), ['p-1']);
    });

    test('create → báo tên sản phẩm mới, tải lại; trùng → câu của server', () async {
      stubCreate(const Ok(Product(id: 'p-9', name: 'Đá Mi', sizeKg: 10, unit: 'Bao', isActive: true, price: 18000)));
      clearInteractions(repo);
      final result = await cubit.create(name: 'Đá Mi', sizeKg: 10, price: 18000, unit: 'Bao');
      expect(result, (ok: true, message: AppStrings.productCreated('Đá Mi 10kg')));
      verify(() => repo.getProducts()).called(1);

      stubCreate(const Err(ServerFailure('Đã có sản phẩm đá mi 10kg')));
      clearInteractions(repo);
      final again = await cubit.create(name: 'Đá Mi', sizeKg: 10, price: 18000);
      expect(again, (ok: false, message: 'Đã có sản phẩm đá mi 10kg'));
      verifyNever(() => repo.getProducts());
    });
  });

  group('ProductsScreen', () {
    setUp(() => sl.registerFactory<ProductsCubit>(() => ProductsCubit(repo: repo)));
    tearDown(() => sl.unregister<ProductsCubit>());

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: ProductsScreen()));
      await tester.pump();
    }

    Finder tile(String id) => find.byKey(Key('product_$id'));

    Future<void> open(WidgetTester tester, String id) async {
      await tester.tap(tile(id));
      await tester.pumpAndSettle();
    }

    testWidgets('mỗi sản phẩm: tên kèm cỡ, đơn vị, mức cảnh báo, giá', (tester) async {
      await pumpScreen(tester);

      expect(find.descendant(of: tile('p-1'), matching: find.text('Đá Bi 5kg')), findsOneWidget);
      expect(
        find.descendant(
          of: tile('p-1'),
          matching: find.text('Bao · ${AppStrings.productAlertAt(20)}'),
        ),
        findsOneWidget,
      );
      expect(find.descendant(of: tile('p-1'), matching: find.text('12.000đ')), findsOneWidget);
      expect(
        find.descendant(of: tile('p-2'), matching: find.text(AppStrings.customerPriceMissing)),
        findsOneWidget,
      );
      expect(find.text(AppStrings.productsDiscontinued), findsOneWidget);
      // Nhóm đã ngừng bán đứng sau các sản phẩm đang bán.
      expect(tester.getTopLeft(tile('p-3')).dy, greaterThan(tester.getTopLeft(tile('p-2')).dy));
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getProducts())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getProducts()).thenAnswer((_) async => const Ok(products));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(tile('p-1'), findsOneWidget);
    });

    testWidgets('đổi giá: ô mở sẵn giá cũ; giá 0 bị chặn; giá hợp lệ thì lưu',
        (tester) async {
      await pumpScreen(tester);
      await open(tester, 'p-1');
      await tester.tap(find.byKey(const Key('product_price')));
      await tester.pumpAndSettle();

      final input = find.byKey(const Key('product_price_input'));
      expect(tester.widget<TextField>(input).controller!.text, '12000');
      await tester.enterText(input, '0');
      await tester.tap(find.byKey(const Key('product_price_save')));
      await tester.pump();
      expect(find.text(AppStrings.productPriceInvalid), findsOneWidget);
      verifyNever(() => repo.setPrice(any(), any()));

      await tester.enterText(input, '12500');
      await tester.tap(find.byKey(const Key('product_price_save')));
      await tester.pumpAndSettle();
      verify(() => repo.setPrice('p-1', 12500)).called(1);
      expect(find.text(AppStrings.productPriceSet('Đá Bi 5kg', '12.500đ')), findsOneWidget);
      expect(find.descendant(of: tile('p-1'), matching: find.text('12.500đ')), findsOneWidget);
    });

    testWidgets('sản phẩm chưa có giá: bảng nói rõ chưa lên đơn được', (tester) async {
      await pumpScreen(tester);
      await open(tester, 'p-2');

      expect(find.text(AppStrings.productNoPriceHint), findsOneWidget);
      expect(find.text(AppStrings.productAlertOff), findsOneWidget);
    });

    testWidgets('sửa: xoá trắng mức cảnh báo → tắt cảnh báo', (tester) async {
      stubUpdate(Ok(changed(bi5, clearAlert: true)));
      await pumpScreen(tester);
      await open(tester, 'p-1');
      await tester.tap(find.byKey(const Key('product_edit')));
      await tester.pumpAndSettle();

      expect(
        tester.widget<TextField>(find.byKey(const Key('product_edit_alert'))).controller!.text,
        '20',
      );
      await tester.enterText(find.byKey(const Key('product_edit_alert')), '');
      await tester.tap(find.byKey(const Key('product_edit_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.updateProduct(
          'p-1',
          name: 'Đá Bi',
          unit: 'Bao',
          minStock: null,
          clearMinStock: true,
          currentPrice: 12000,
        ),
      ).called(1);
      expect(find.descendant(of: tile('p-1'), matching: find.text('Bao')), findsOneWidget);
    });

    testWidgets('ngừng bán: hỏi lại rồi mới ngừng; sản phẩm đã ngừng thì bán lại ngay',
        (tester) async {
      stubUpdate(Ok(changed(bi5, isActive: false)));
      await pumpScreen(tester);
      await open(tester, 'p-1');
      await tester.tap(find.byKey(const Key('product_sale')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.productStopTitle('Đá Bi 5kg')), findsOneWidget);
      verifyNever(() => repo.updateProduct(any(), isActive: any(named: 'isActive'), currentPrice: any(named: 'currentPrice')));
      await tester.tap(find.byKey(const Key('product_confirm')));
      await tester.pumpAndSettle();
      verify(() => repo.updateProduct('p-1', isActive: false, currentPrice: 12000)).called(1);
      expect(find.text(AppStrings.productStopped('Đá Bi 5kg')), findsOneWidget);

      stubUpdate(Ok(changed(cay, isActive: true)));
      await open(tester, 'p-3');
      expect(find.text(AppStrings.productResumeButton), findsOneWidget);
      await tester.tap(find.byKey(const Key('product_sale')));
      await tester.pumpAndSettle();
      verify(() => repo.updateProduct('p-3', isActive: true, currentPrice: 35000)).called(1);
    });

    testWidgets('thêm sản phẩm: thiếu tên / cỡ / giá bị chặn; đủ thì gửi', (tester) async {
      stubCreate(const Ok(Product(id: 'p-9', name: 'Đá Mi', sizeKg: 10, unit: 'Bao', isActive: true, price: 18000)));
      await pumpScreen(tester);
      await tester.tap(find.byKey(const Key('products_new')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('product_new_save')));
      await tester.pump();
      expect(find.text(AppStrings.productNameRequired), findsOneWidget);
      await tester.enterText(find.byKey(const Key('product_new_name')), 'Đá Mi');
      await tester.tap(find.byKey(const Key('product_new_save')));
      await tester.pump();
      expect(find.text(AppStrings.productSizeInvalid), findsOneWidget);
      await tester.enterText(find.byKey(const Key('product_new_size')), '10');
      await tester.tap(find.byKey(const Key('product_new_save')));
      await tester.pump();
      expect(find.text(AppStrings.productPriceInvalid), findsOneWidget);

      await tester.enterText(find.byKey(const Key('product_new_price')), '18000');
      await tester.enterText(find.byKey(const Key('product_new_alert')), '15');
      await tester.tap(find.byKey(const Key('product_new_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.createProduct(name: 'Đá Mi', sizeKg: 10, price: 18000, unit: 'Bao', minStock: 15),
      ).called(1);
      expect(find.text(AppStrings.productCreated('Đá Mi 10kg')), findsOneWidget);
    });

    testWidgets('thêm trùng → hộp vẫn mở với câu của server', (tester) async {
      stubCreate(const Err(ServerFailure('Đã có sản phẩm đá mi 10kg')));
      await pumpScreen(tester);
      await tester.tap(find.byKey(const Key('products_new')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('product_new_name')), 'Đá Mi');
      await tester.enterText(find.byKey(const Key('product_new_size')), '10');
      await tester.enterText(find.byKey(const Key('product_new_price')), '18000');
      await tester.tap(find.byKey(const Key('product_new_save')));
      await tester.pumpAndSettle();

      expect(find.text('Đã có sản phẩm đá mi 10kg'), findsOneWidget);
      expect(find.byKey(const Key('product_new_save')), findsOneWidget);
    });

    testWidgets('màn hình 360dp, tên dài → không overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      when(() => repo.getProducts()).thenAnswer(
        (_) async => const Ok([
          Product(
            id: 'p-1',
            name: 'Đá viên tinh khiết loại đặc biệt cho nhà hàng khách sạn',
            sizeKg: 1000,
            unit: 'Thùng carton lớn',
            isActive: true,
            price: 99999999,
            minStock: 1000000,
          ),
        ]),
      );
      await pumpScreen(tester);
      expect(tester.takeException(), isNull);
      await open(tester, 'p-1');
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const Key('product_edit')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.text(AppStrings.cancelButton));
      await tester.pumpAndSettle();
      Navigator.of(tester.element(find.byKey(const Key('product_sale')))).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('products_new')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
