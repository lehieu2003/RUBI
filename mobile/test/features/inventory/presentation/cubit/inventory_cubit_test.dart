import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart';
import 'package:iceflow_mobile/features/inventory/presentation/cubit/inventory_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockInventoryRepository extends Mock implements InventoryRepository {}

void main() {
  StockItem item({int onHand = 200}) => StockItem(
        productId: 'prod-bi-5',
        productName: 'Đá Bi',
        sizeKg: 5,
        unit: 'Bao',
        quantityOnHand: onHand,
        totalKg: onHand * 5,
        sellable: onHand,
        minStock: null,
        lowStock: false,
      );
  Stock stockOf(int onHand) =>
      Stock(items: [item(onHand: onHand)], totalBags: onHand, totalKg: onHand * 5);

  late _MockInventoryRepository repo;

  setUp(() => repo = _MockInventoryRepository());

  InventoryCubit buildCubit() => InventoryCubit(repo: repo);

  group('InventoryCubit', () {
    test('load → có tồn kho', () async {
      when(() => repo.getStock()).thenAnswer((_) async => Ok(stockOf(200)));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(cubit.state, const InventoryState(status: ViewStatus.loading));

      await cubit.load();

      expect(cubit.state, InventoryState(status: ViewStatus.loaded, stock: stockOf(200)));
    });

    test('load lỗi lần đầu → lỗi, chưa có số; lỗi khi đang có số → giữ số cũ',
        () async {
      when(() => repo.getStock()).thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.stock, isNull);
      expect(cubit.state.errorMessage, FailureMessages.network);

      when(() => repo.getStock()).thenAnswer((_) async => Ok(stockOf(200)));
      await cubit.load();
      when(() => repo.getStock()).thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.stock, stockOf(200));
    });

    test('nhập mẻ → gửi đúng sản phẩm và số lượng, báo tồn mới, tải lại kho',
        () async {
      var loads = 0;
      when(() => repo.getStock())
          .thenAnswer((_) async => Ok(stockOf(loads++ == 0 ? 200 : 240)));
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => const Ok(240));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.recordProduction(item(), 40);

      expect(result, (ok: true, unsure: false, message: AppStrings.stockProductionSaved(40, 'Bao', 240)));
      verify(() => repo.recordProduction(productId: 'prod-bi-5', quantity: 40, idempotencyKey: any(named: 'idempotencyKey'))).called(1);
      expect(cubit.state.stock, stockOf(240));
    });

    test('kiểm kho → gửi số đếm và ghi chú, báo tồn mới', () async {
      when(() => repo.getStock()).thenAnswer((_) async => Ok(stockOf(188)));
      when(() => repo.recordCount(
            productId: any(named: 'productId'),
            counted: any(named: 'counted'),
            note: any(named: 'note'),
          )).thenAnswer((_) async => const Ok(188));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      final result = await cubit.recordCount(item(), 188, note: 'Cuối tuần');

      expect(result, (ok: true, unsure: false, message: AppStrings.stockCountSaved(188, 'Bao')));
      verify(() => repo.recordCount(productId: 'prod-bi-5', counted: 188, note: 'Cuối tuần')).called(1);
    });

    test('server từ chối → giữ câu của server, không tải lại', () async {
      when(() => repo.getStock()).thenAnswer((_) async => Ok(stockOf(200)));
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) async => const Err(ServerFailure('Số lượng không hợp lệ', statusCode: 400)));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.recordProduction(item(), 1);

      expect(result, (ok: false, unsure: false, message: 'Số lượng không hợp lệ'));
      verify(() => repo.getStock()).called(1);
    });

    test('rời tab khi đang tải hoặc đang lưu → không lỗi', () async {
      final slow = Completer<Result<Stock>>();
      when(() => repo.getStock()).thenAnswer((_) => slow.future);
      final loadingCubit = buildCubit();
      final loading = loadingCubit.load();
      await loadingCubit.close();
      slow.complete(Ok(stockOf(1)));
      await expectLater(loading, completes);

      final slowSave = Completer<Result<int>>();
      when(() => repo.recordProduction(productId: any(named: 'productId'), quantity: any(named: 'quantity'), idempotencyKey: any(named: 'idempotencyKey')))
          .thenAnswer((_) => slowSave.future);
      final cubit = buildCubit();
      final saving = cubit.recordProduction(item(), 5);
      await cubit.close();
      slowSave.complete(const Ok(205));
      expect((await saving).ok, isTrue);
    });
  });
}
