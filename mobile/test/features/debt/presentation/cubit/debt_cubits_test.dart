import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/debt_cubit.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/ledger_cubit.dart';
import 'package:mocktail/mocktail.dart';

class _MockDebtRepository extends Mock implements DebtRepository {}

void main() {
  setUpAll(() => registerFallbackValue(const PageParams()));

  const debt = CustomerDebt(
    customerId: 'c-1',
    customerName: 'Đại Lý Nước Ngọt Minh Tâm',
    outstandingDebt: 3400000,
  );

  LedgerEntry entry(String id, LedgerEntryType type, double amount) => LedgerEntry(
        id: id,
        customerId: 'c-1',
        type: type,
        amount: amount,
        createdAt: DateTime.utc(2026, 10, 10, 15),
      );

  Paginated<LedgerEntry> page(List<LedgerEntry> items, {required int page, required int totalPages}) =>
      Paginated(items: items, page: page, limit: 20, totalItems: 30, totalPages: totalPages);

  late _MockDebtRepository repo;

  setUp(() => repo = _MockDebtRepository());

  group('DebtCubit', () {
    test('load → danh sách và tổng nợ (không cộng số âm)', () async {
      when(() => repo.getDebts()).thenAnswer(
        (_) async => const Ok([
          debt,
          CustomerDebt(customerId: 'c-2', customerName: 'B', outstandingDebt: 2100000),
          CustomerDebt(customerId: 'c-3', customerName: 'C', outstandingDebt: -5000),
        ]),
      );
      final cubit = DebtCubit(repo: repo);
      addTearDown(cubit.close);

      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.debts, hasLength(3));
      expect(cubit.state.totalOutstanding, 5500000);
    });

    test('lỗi lần đầu → lỗi; lỗi khi đang có danh sách → giữ danh sách',
        () async {
      when(() => repo.getDebts()).thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = DebtCubit(repo: repo);
      addTearDown(cubit.close);
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.debts, isNull);

      when(() => repo.getDebts()).thenAnswer((_) async => const Ok([debt]));
      await cubit.load();
      when(() => repo.getDebts()).thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.debts, const [debt]);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    test('rời tab khi đang tải → không lỗi', () async {
      final slow = Completer<Result<List<CustomerDebt>>>();
      when(() => repo.getDebts()).thenAnswer((_) => slow.future);
      final cubit = DebtCubit(repo: repo);
      final loading = cubit.load();
      await cubit.close();
      slow.complete(const Ok([debt]));
      await expectLater(loading, completes);
    });
  });

  group('LedgerCubit', () {
    LedgerCubit buildCubit() => LedgerCubit(repo: repo, debt: debt);

    // Mặc định server vẫn báo đúng số nợ lúc mở.
    setUp(() => when(() => repo.getDebts()).thenAnswer((_) async => const Ok([debt])));

    void stubBalance(double outstanding) {
      when(() => repo.getDebts()).thenAnswer(
        (_) async => Ok([
          const CustomerDebt(customerId: 'c-2', customerName: 'B', outstandingDebt: 999),
          CustomerDebt(customerId: 'c-1', customerName: debt.customerName, outstandingDebt: outstanding),
        ]),
      );
    }

    void stubFirstPage(List<LedgerEntry> items) {
      when(() => repo.getLedger(any(), page: any(named: 'page')))
          .thenAnswer((_) async => Ok(page(items, page: 1, totalPages: 1)));
    }

    test('load → số còn nợ đọc lại từ server, không giữ số lúc mở', () async {
      stubFirstPage([entry('l-1', LedgerEntryType.debt, 3250000)]);
      stubBalance(3250000);
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.outstandingDebt, 3250000);
    });

    test('load lại (kéo để làm mới) → số còn nợ mới, kể cả khi đã hết nợ',
        () async {
      stubFirstPage([entry('l-1', LedgerEntryType.debt, 3400000)]);
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      expect(cubit.state.outstandingDebt, 3400000);

      // Nợ thêm ở web → số mới.
      stubBalance(3660000);
      await cubit.load();
      expect(cubit.state.outstandingDebt, 3660000);

      // Báo cáo công nợ không còn khách này (đã trả hết) → 0.
      when(() => repo.getDebts()).thenAnswer((_) async => const Ok([]));
      await cubit.load();
      expect(cubit.state.outstandingDebt, 0);
    });

    test('không đọc được số nợ → lỗi, không coi số cũ là mới', () async {
      stubFirstPage([entry('l-1', LedgerEntryType.debt, 3400000)]);
      when(() => repo.getDebts()).thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.load();

      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);
      expect(cubit.state.outstandingDebt, 3400000);
    });

    test('thu tiền mất response → tải lại sổ và cả số còn nợ', () async {
      stubFirstPage([entry('l-1', LedgerEntryType.debt, 3400000)]);
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => const Err(NetworkFailure(outcomeUnknown: true)));
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      // Server thật ra đã lưu.
      stubFirstPage([
        entry('l-9', LedgerEntryType.payment, 150000),
        entry('l-1', LedgerEntryType.debt, 3400000),
      ]);
      stubBalance(3250000);
      final result = await cubit.recordPayment(150000);

      expect(result.unsure, isTrue);
      expect(cubit.state.entries.map((e) => e.id), ['l-9', 'l-1']);
      expect(cubit.state.outstandingDebt, 3250000);
    });

    test('thu tiền rồi Xem thêm → không lặp dòng, không sót dòng', () async {
      // Server: 21 dòng l-21 (mới nhất) … l-1, trang 20 dòng.
      final server = [for (var i = 21; i >= 1; i--) entry('l-$i', LedgerEntryType.debt, 1000)];
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer((invocation) async {
        final params = invocation.namedArguments[#page] as PageParams? ?? const PageParams();
        final start = (params.page - 1) * params.limit;
        return Ok(Paginated(
          items: server.skip(start).take(params.limit).toList(),
          page: params.page,
          limit: params.limit,
          totalItems: server.length,
          totalPages: (server.length / params.limit).ceil(),
        ));
      });
      final payment = entry('p-1', LedgerEntryType.payment, 1000);
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async {
        server.insert(0, payment);
        return Ok(PaymentReceipt(entry: payment, outstandingDebt: 3399000));
      });
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();
      expect(cubit.state.entries, hasLength(20));

      await cubit.recordPayment(1000);
      await cubit.loadMore();

      final ids = cubit.state.entries.map((e) => e.id).toList();
      expect(ids.toSet(), hasLength(ids.length), reason: 'trùng dòng: $ids');
      expect(ids, server.map((e) => e.id).toList());
      expect(cubit.state.hasMore, isFalse);
    });

    test('mở với số nợ của danh sách; load → trang đầu', () async {
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer(
        (_) async => Ok(page([entry('l-2', LedgerEntryType.payment, 1000)], page: 1, totalPages: 2)),
      );
      final cubit = buildCubit();
      addTearDown(cubit.close);
      expect(cubit.state.outstandingDebt, 3400000);

      await cubit.load();

      verify(() => repo.getLedger('c-1')).called(1);
      expect(cubit.state.entries.map((e) => e.id), ['l-2']);
      expect(cubit.state.hasMore, isTrue);
      expect(cubit.state.nextPage, const PageParams(page: 2));
    });

    test('loadMore → hỏi trang kế, nối vào cuối; hết trang thì không hỏi nữa',
        () async {
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer((invocation) async {
        final params = invocation.namedArguments[#page] as PageParams?;
        return (params?.page ?? 1) == 1
            ? Ok(page([entry('l-2', LedgerEntryType.payment, 1000)], page: 1, totalPages: 2))
            : Ok(page([entry('l-1', LedgerEntryType.debt, 260000)], page: 2, totalPages: 2));
      });
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      await cubit.loadMore();

      expect(cubit.state.entries.map((e) => e.id), ['l-2', 'l-1']);
      expect(cubit.state.hasMore, isFalse);
      await cubit.loadMore();
      verify(() => repo.getLedger('c-1', page: const PageParams(page: 2))).called(1);
    });

    test('thu tiền → dòng mới lên đầu, số còn nợ theo server, báo kết quả',
        () async {
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer(
        (_) async => Ok(page([entry('l-1', LedgerEntryType.debt, 3400000)], page: 1, totalPages: 1)),
      );
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer(
        (_) async => Ok(
          PaymentReceipt(
            entry: entry('l-9', LedgerEntryType.payment, 500000),
            outstandingDebt: 2900000,
          ),
        ),
      );
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.recordPayment(500000, notes: 'Tiền mặt');

      expect(result, (ok: true, unsure: false, message: AppStrings.paymentSaved('500.000đ', '2.900.000đ')));
      verify(() => repo.recordPayment(customerId: 'c-1', amount: 500000, notes: 'Tiền mặt')).called(1);
      expect(cubit.state.outstandingDebt, 2900000);
      expect(cubit.state.entries.map((e) => e.id), ['l-9', 'l-1']);
    });

    test('thu vượt số nợ (409) → giữ câu của server, sổ không đổi', () async {
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer(
        (_) async => Ok(page([entry('l-1', LedgerEntryType.debt, 3400000)], page: 1, totalPages: 1)),
      );
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer(
        (_) async => const Err(
          ServerFailure('Số tiền thu vượt quá công nợ hiện tại (3.400.000đ)', statusCode: 409),
        ),
      );
      final cubit = buildCubit();
      addTearDown(cubit.close);
      await cubit.load();

      final result = await cubit.recordPayment(9000000);

      expect(result, (ok: false, unsure: false, message: 'Số tiền thu vượt quá công nợ hiện tại (3.400.000đ)'));
      expect(cubit.state.outstandingDebt, 3400000);
      expect(cubit.state.entries, hasLength(1));
    });

    test('tải sổ lỗi → trạng thái lỗi, vẫn giữ số nợ', () async {
      when(() => repo.getLedger(any(), page: any(named: 'page')))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = buildCubit();
      addTearDown(cubit.close);

      await cubit.load();

      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.outstandingDebt, 3400000);
    });
  });
}
