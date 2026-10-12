import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/debt/domain/entities/customer_debt.dart';
import 'package:iceflow_mobile/features/debt/domain/repositories/debt_repository.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/debt_cubit.dart';
import 'package:iceflow_mobile/features/debt/presentation/cubit/ledger_cubit.dart';
import 'package:iceflow_mobile/features/debt/presentation/screens/debt_tab.dart';
import 'package:mocktail/mocktail.dart';

class _MockDebtRepository extends Mock implements DebtRepository {}

void main() {
  setUpAll(() => registerFallbackValue(const PageParams()));

  final minhTam = CustomerDebt(
    customerId: 'c-1',
    customerName: 'Đại Lý Nước Ngọt Minh Tâm',
    outstandingDebt: 3400000,
    lastPaymentAt: DateTime(2026, 10, 10, 9),
  );
  const namCan = CustomerDebt(
    customerId: 'c-2',
    customerName: 'Vựa Hải Sản Năm Căn',
    outstandingDebt: 2100000,
  );

  LedgerEntry entry(String id, LedgerEntryType type, double amount, {String? notes}) =>
      LedgerEntry(
        id: id,
        customerId: 'c-1',
        type: type,
        amount: amount,
        createdAt: DateTime(2026, 10, 10, 15, 30),
        notes: notes,
      );

  late _MockDebtRepository repo;

  setUp(() {
    repo = _MockDebtRepository();
    sl.registerFactory<DebtCubit>(() => DebtCubit(repo: repo));
    sl.registerFactoryParam<LedgerCubit, CustomerDebt, dynamic>(
      (debt, _) => LedgerCubit(repo: repo, debt: debt),
    );
    when(() => repo.getDebts()).thenAnswer((_) async => Ok([minhTam, namCan]));
    when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer(
      (_) async => Ok(
        Paginated(
          items: [
            entry('l-2', LedgerEntryType.payment, 100000, notes: 'Chuyển khoản'),
            entry('l-1', LedgerEntryType.debt, 3500000, notes: 'Order abc delivered'),
          ],
          page: 1,
          limit: 20,
          totalItems: 2,
          totalPages: 1,
        ),
      ),
    );
  });

  tearDown(() {
    sl.unregister<DebtCubit>();
    sl.unregister<LedgerCubit>();
  });

  Future<void> pumpTab(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: DebtTab()));
    await tester.pump();
  }

  Finder customer(String id) => find.byKey(Key('debt_customer_$id'));

  group('DebtTab', () {
    testWidgets('tổng nợ và từng khách: số nợ, lần trả gần nhất', (tester) async {
      await pumpTab(tester);

      expect(find.text(AppStrings.debtTotalLabel(2)), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('debt_total'))).data, '5.500.000đ');
      expect(find.descendant(of: customer('c-1'), matching: find.text('3.400.000đ')), findsOneWidget);
      expect(
        find.descendant(of: customer('c-1'), matching: find.text(AppStrings.debtLastPaid('10/10/2026'))),
        findsOneWidget,
      );
      expect(find.descendant(of: customer('c-2'), matching: find.text(AppStrings.debtNeverPaid)), findsOneWidget);
    });

    testWidgets('không ai nợ → câu báo', (tester) async {
      when(() => repo.getDebts()).thenAnswer((_) async => const Ok([]));
      await pumpTab(tester);

      expect(find.text(AppStrings.debtNone), findsOneWidget);
    });

    testWidgets('tải lỗi → câu báo lỗi và Thử lại', (tester) async {
      when(() => repo.getDebts()).thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpTab(tester);

      expect(find.text(FailureMessages.network), findsOneWidget);
      when(() => repo.getDebts()).thenAnswer((_) async => Ok([minhTam]));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pump();
      await tester.pump();
      expect(customer('c-1'), findsOneWidget);
    });
  });

  group('sổ nợ của một khách', () {
    Future<void> openLedger(WidgetTester tester) async {
      await pumpTab(tester);
      await tester.tap(customer('c-1'));
      await tester.pumpAndSettle();
    }

    testWidgets('bấm vào khách → số còn nợ, dòng thu (−) kèm ghi chú, dòng nợ '
        '(+) không hiện ghi chú kỹ thuật', (tester) async {
      await openLedger(tester);

      expect(find.text('Đại Lý Nước Ngọt Minh Tâm'), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('ledger_outstanding'))).data, '3.400.000đ');
      expect(find.text('−100.000đ'), findsOneWidget);
      expect(find.textContaining('Chuyển khoản'), findsOneWidget);
      expect(find.text('+3.500.000đ'), findsOneWidget);
      expect(find.textContaining('Order abc'), findsNothing);
      verify(() => repo.getLedger('c-1')).called(1);
    });

    testWidgets('Thu tiền: chặn số 0 và số vượt nợ ngay trên máy; số hợp lệ '
        'được gửi, sổ và số nợ cập nhật', (tester) async {
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer(
        (_) async => Ok(
          PaymentReceipt(
            entry: entry('l-9', LedgerEntryType.payment, 500000, notes: 'Tiền mặt'),
            outstandingDebt: 2900000,
          ),
        ),
      );
      await openLedger(tester);

      await tester.tap(find.byKey(const Key('ledger_pay')));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.paymentOutstanding('3.400.000đ')), findsOneWidget);

      await tester.tap(find.byKey(const Key('payment_submit')));
      await tester.pump();
      expect(find.text(AppStrings.paymentInvalid), findsOneWidget);

      await tester.enterText(find.byKey(const Key('payment_amount')), '9000000');
      await tester.tap(find.byKey(const Key('payment_submit')));
      await tester.pump();
      expect(find.text(AppStrings.paymentAboveDebt('3.400.000đ')), findsOneWidget);
      verifyNever(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          ));

      await tester.enterText(find.byKey(const Key('payment_amount')), '500000');
      await tester.enterText(find.byKey(const Key('payment_notes')), 'Tiền mặt');
      await tester.tap(find.byKey(const Key('payment_submit')));
      await tester.pumpAndSettle();

      verify(() => repo.recordPayment(customerId: 'c-1', amount: 500000, notes: 'Tiền mặt')).called(1);
      expect(find.text(AppStrings.paymentSaved('500.000đ', '2.900.000đ')), findsOneWidget);
      expect(tester.widget<Text>(find.byKey(const Key('ledger_outstanding'))).data, '2.900.000đ');
      expect(find.text('−500.000đ'), findsOneWidget);
    });

    testWidgets('server từ chối → câu của server hiện trong sheet', (tester) async {
      when(() => repo.recordPayment(
            customerId: any(named: 'customerId'),
            amount: any(named: 'amount'),
            notes: any(named: 'notes'),
          )).thenAnswer(
        (_) async => const Err(ServerFailure('Bạn thao tác quá nhanh', statusCode: 429)),
      );
      await openLedger(tester);
      await tester.tap(find.byKey(const Key('ledger_pay')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('payment_amount')), '1000');
      await tester.tap(find.byKey(const Key('payment_submit')));
      await tester.pumpAndSettle();

      expect(find.text(FailureMessages.tooManyAttempts), findsOneWidget);
      expect(find.text(AppStrings.paymentTitle), findsOneWidget);
    });

    testWidgets('quay lại danh sách → tải lại số nợ', (tester) async {
      await openLedger(tester);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();

      verify(() => repo.getDebts()).called(2);
    });

    testWidgets('còn trang sau → nút Xem thêm tải tiếp', (tester) async {
      when(() => repo.getLedger(any(), page: any(named: 'page'))).thenAnswer((invocation) async {
        final params = invocation.namedArguments[#page] as PageParams?;
        final first = (params?.page ?? 1) == 1;
        return Ok(
          Paginated(
            items: [entry(first ? 'l-2' : 'l-1', LedgerEntryType.debt, first ? 200000 : 100000)],
            page: first ? 1 : 2,
            limit: 20,
            totalItems: 21,
            totalPages: 2,
          ),
        );
      });
      await openLedger(tester);

      await tester.tap(find.byKey(const Key('ledger_load_more')));
      await tester.pumpAndSettle();

      expect(find.text('+200.000đ'), findsOneWidget);
      expect(find.text('+100.000đ'), findsOneWidget);
      expect(find.byKey(const Key('ledger_load_more')), findsNothing);
    });

    testWidgets('điện thoại hẹp (360dp), tên khách dài → không tràn bố cục',
        (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      when(() => repo.getDebts()).thenAnswer(
        (_) async => const Ok([
          CustomerDebt(
            customerId: 'c-1',
            customerName: 'Công Ty Trách Nhiệm Hữu Hạn Thương Mại Dịch Vụ Nước Giải Khát Minh Tâm',
            outstandingDebt: 123456789,
          ),
        ]),
      );
      await openLedger(tester);

      expect(tester.takeException(), isNull);
    });
  });
}
