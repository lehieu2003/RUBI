import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/orders/domain/entities/order_entry.dart';
import 'package:iceflow_mobile/features/orders/domain/repositories/order_entry_repository.dart';
import 'package:iceflow_mobile/features/orders/presentation/cubit/order_entry_cubit.dart';
import 'package:mocktail/mocktail.dart';

import 'order_entry_fixtures.dart';

class _MockRepo extends Mock implements OrderEntryRepository {}

void main() {
  late _MockRepo repo;
  late OrderEntryCubit cubit;

  void stubCreate(Result<CreatedOrder> result) {
    when(
      () => repo.createOrder(
        customerId: any(named: 'customerId'),
        quantities: any(named: 'quantities'),
        notes: any(named: 'notes'),
        idempotencyKey: any(named: 'idempotencyKey'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockRepo();
    cubit = OrderEntryCubit(repo: repo);
    when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    when(() => repo.getPriceList(any())).thenAnswer((_) async => const Ok(priceList));
  });

  tearDown(() => cubit.close());

  group('chọn khách', () {
    test('loadCustomers → danh sách khách; lỗi → câu báo lỗi', () async {
      await cubit.loadCustomers();
      expect(cubit.state.customersStatus, ViewStatus.loaded);
      expect(cubit.state.matches, customers);

      when(() => repo.getCustomers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.loadCustomers();
      expect(cubit.state.customersStatus, ViewStatus.error);
      expect(cubit.state.customersError, FailureMessages.network);
    });

    test('tìm theo tên không dấu, theo mã, theo số điện thoại', () async {
      await cubit.loadCustomers();

      cubit.search('gio bien');
      expect(cubit.state.matches, [gioBien]);
      cubit.search('  kh-002 ');
      expect(cubit.state.matches, [minhTam]);
      cubit.search('0908123');
      expect(cubit.state.matches, [gioBien]);
      cubit.search('không có ai');
      expect(cubit.state.matches, isEmpty);
      cubit.search('');
      expect(cubit.state.matches, customers);
    });

    test('selectCustomer → tải bảng giá của đúng khách đó', () async {
      await cubit.loadCustomers();
      await cubit.selectCustomer(gioBien);

      expect(cubit.state.customer, gioBien);
      expect(cubit.state.productsStatus, ViewStatus.loaded);
      expect(cubit.state.products, priceList);
      verify(() => repo.getPriceList('c-1')).called(1);
    });

    test('bảng giá lỗi → câu báo; loadPrices tải lại', () async {
      when(() => repo.getPriceList(any()))
          .thenAnswer((_) async => const Err(ServerFailure('Không tìm thấy khách hàng')));
      await cubit.selectCustomer(gioBien);
      expect(cubit.state.productsStatus, ViewStatus.error);
      expect(cubit.state.productsError, 'Không tìm thấy khách hàng');

      when(() => repo.getPriceList(any())).thenAnswer((_) async => const Ok(priceList));
      await cubit.loadPrices();
      expect(cubit.state.productsStatus, ViewStatus.loaded);
    });

    test('đổi khách → bỏ số lượng đã nhập; bảng giá về muộn của khách cũ bị bỏ',
        () async {
      await cubit.loadCustomers();
      await cubit.selectCustomer(gioBien);
      cubit.setQuantity('p-1', 5);

      cubit.changeCustomer();
      expect(cubit.state.customer, isNull);
      expect(cubit.state.quantities, isEmpty);
      expect(cubit.state.customers, customers);

      final slow = Completer<Result<List<PricedProduct>>>();
      when(() => repo.getPriceList('c-1')).thenAnswer((_) => slow.future);
      when(() => repo.getPriceList('c-2')).thenAnswer(
        (_) async => const Ok([
          PricedProduct(productId: 'p-9', name: 'Đá Cây', sizeKg: 50, unit: 'Cây', price: 30000),
        ]),
      );
      final first = cubit.selectCustomer(gioBien);
      await cubit.selectCustomer(minhTam);
      slow.complete(const Ok(priceList));
      await first;

      expect(cubit.state.customer, minhTam);
      expect(cubit.state.products.single.productId, 'p-9');
    });
  });

  group('số lượng', () {
    setUp(() async {
      await cubit.loadCustomers();
      await cubit.selectCustomer(gioBien);
    });

    test('nhập số lượng → số dòng và tạm tính theo giá của khách', () {
      cubit.setQuantity('p-1', 3);
      cubit.setQuantity('p-2', 2);

      expect(cubit.state.lineCount, 2);
      expect(cubit.state.total, 3 * 12000 + 2 * 22000);
      expect(cubit.state.canSubmit, isTrue);
    });

    test('về 0 → bỏ dòng; âm → 0; quá trần → trần', () {
      cubit.setQuantity('p-1', 3);
      cubit.setQuantity('p-1', 0);
      expect(cubit.state.quantities, isEmpty);
      expect(cubit.state.canSubmit, isFalse);

      cubit.setQuantity('p-1', -4);
      expect(cubit.state.quantities, isEmpty);

      cubit.setQuantity('p-1', 123456);
      expect(cubit.state.quantityOf('p-1'), OrderEntryCubit.maxQuantity);
    });

    test('sản phẩm chưa có giá hoặc không có trong bảng giá → không đặt được',
        () {
      cubit.setQuantity('p-3', 2);
      cubit.setQuantity('p-khong-co', 2);

      expect(cubit.state.quantities, isEmpty);
    });
  });

  group('lưu đơn', () {
    setUp(() async {
      await cubit.loadCustomers();
      await cubit.selectCustomer(gioBien);
      cubit.setQuantity('p-1', 3);
    });

    test('thành công → trả đơn vừa lên; gửi đúng khách, số lượng, ghi chú',
        () async {
      stubCreate(const Ok(created));

      final result = await cubit.submit(notes: 'Giao cổng sau');

      expect(result, created);
      expect(cubit.state.submitting, isFalse);
      expect(cubit.state.submitError, isNull);
      verify(
        () => repo.createOrder(
          customerId: 'c-1',
          quantities: {'p-1': 3},
          notes: 'Giao cổng sau',
          idempotencyKey: any(named: 'idempotencyKey'),
        ),
      ).called(1);
    });

    test('server từ chối → null và câu báo của server; sửa số lượng thì hết báo',
        () async {
      stubCreate(const Err(ServerFailure('Có sản phẩm đã ngừng bán')));

      expect(await cubit.submit(), isNull);
      expect(cubit.state.submitError, 'Có sản phẩm đã ngừng bán');
      expect(cubit.state.quantityOf('p-1'), 3, reason: 'giữ nguyên để sửa');

      cubit.setQuantity('p-1', 2);
      expect(cubit.state.submitError, isNull);
    });

    test('rớt mạng → nhắc xem lại danh sách đơn trước khi lưu lại', () async {
      stubCreate(const Err(NetworkFailure()));

      expect(await cubit.submit(), isNull);
      expect(cubit.state.submitError, AppStrings.orderEntryUnsure);
    });

    test(
        'gửi lại cùng đơn → cùng Idempotency-Key; đổi số lượng hoặc ghi chú → '
        'mã mới; lưu xong rồi lên đơn tiếp → mã mới', () async {
      stubCreate(const Err(NetworkFailure()));
      await cubit.submit(notes: 'Giao cổng sau');
      await cubit.submit(notes: 'Giao cổng sau'); // gửi lại sau khi rớt mạng
      cubit.setQuantity('p-1', 4);
      await cubit.submit(notes: 'Giao cổng sau');
      await cubit.submit(notes: 'Giao trước 7h');
      stubCreate(const Ok(created));
      await cubit.submit(notes: 'Giao trước 7h');
      // Đơn tiếp theo, cùng khách, cùng số: một lần lên đơn khác.
      await cubit.selectCustomer(gioBien);
      cubit.setQuantity('p-1', 4);
      await cubit.submit(notes: 'Giao trước 7h');

      final keys = verify(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
          idempotencyKey: captureAny(named: 'idempotencyKey'),
        ),
      ).captured;
      expect(keys, hasLength(6));
      expect(keys, everyElement(isA<String>()));
      expect(keys[1], keys[0], reason: 'gửi lại đúng lần đó');
      expect(keys[2], isNot(keys[1]), reason: 'đổi số lượng');
      expect(keys[3], isNot(keys[2]), reason: 'đổi ghi chú');
      expect(keys[4], keys[3], reason: 'gửi lại đúng lần đó');
      expect(keys[5], isNot(keys[4]), reason: 'đơn trước đã lưu xong');
    });

    test('đang gửi → lần bấm thứ hai bị bỏ qua, số lượng bị khoá', () async {
      final pending = Completer<Result<CreatedOrder>>();
      when(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
          idempotencyKey: any(named: 'idempotencyKey'),
        ),
      ).thenAnswer((_) => pending.future);

      final first = cubit.submit();
      expect(cubit.state.submitting, isTrue);
      expect(await cubit.submit(), isNull);
      cubit.setQuantity('p-1', 9);
      expect(cubit.state.quantityOf('p-1'), 3);
      pending.complete(const Ok(created));

      expect(await first, created);
      verify(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
          idempotencyKey: any(named: 'idempotencyKey'),
        ),
      ).called(1);
    });

    test('chưa nhập dòng nào → không gọi server', () async {
      cubit.setQuantity('p-1', 0);

      expect(await cubit.submit(), isNull);
      verifyNever(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
          idempotencyKey: any(named: 'idempotencyKey'),
        ),
      );
    });

    test('đóng khi đang gửi → không lỗi', () async {
      final pending = Completer<Result<CreatedOrder>>();
      when(
        () => repo.createOrder(
          customerId: any(named: 'customerId'),
          quantities: any(named: 'quantities'),
          notes: any(named: 'notes'),
          idempotencyKey: any(named: 'idempotencyKey'),
        ),
      ).thenAnswer((_) => pending.future);

      final running = cubit.submit();
      await cubit.close();
      pending.complete(const Ok(created));

      expect(await running, isNull);
    });
  });
}
