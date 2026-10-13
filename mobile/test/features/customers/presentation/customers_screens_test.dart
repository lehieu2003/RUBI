import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/domain/repositories/customers_repository.dart';
import 'package:iceflow_mobile/features/customers/presentation/cubit/customers_cubit.dart';
import 'package:iceflow_mobile/features/customers/presentation/screens/customer_detail_screen.dart';
import 'package:iceflow_mobile/features/customers/presentation/screens/customers_tab.dart';
import 'package:mocktail/mocktail.dart';

import 'customers_fixtures.dart';

class _MockRepo extends Mock implements CustomersRepository {}

void main() {
  late _MockRepo repo;

  void stubCreate(Result<Customer> result) {
    when(
      () => repo.createCustomer(
        code: any(named: 'code'),
        name: any(named: 'name'),
        address: any(named: 'address'),
        phone: any(named: 'phone'),
      ),
    ).thenAnswer((_) async => result);
  }

  setUp(() {
    repo = _MockRepo();
    sl.registerFactory<CustomersCubit>(() => CustomersCubit(repo: repo));
    sl.registerFactoryParam<CustomerDetailCubit, Customer, dynamic>(
      (customer, _) => CustomerDetailCubit(repo: repo, customer: customer),
    );
    when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    when(() => repo.getPrices(any())).thenAnswer((_) async => const Ok(prices));
  });

  tearDown(() {
    sl.unregister<CustomersCubit>();
    sl.unregister<CustomerDetailCubit>();
  });

  Future<void> pumpTab(
    WidgetTester tester, {
    bool canManage = false,
    CustomerLedgerOpener? onOpenLedger,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CustomersTab(canManage: canManage, onOpenLedger: onOpenLedger),
      ),
    );
    await tester.pump();
  }

  group('CustomersTab', () {
    testWidgets('liệt kê khách với mã, số điện thoại, địa chỉ', (tester) async {
      await pumpTab(tester);

      expect(find.text('Quán Nhậu Gió Biển'), findsOneWidget);
      expect(
        find.text('KH-001 · 0908123456 · 45 Đường Số 7, Thủ Đức'),
        findsOneWidget,
      );
      expect(find.text('KH-002'), findsOneWidget);
    });

    testWidgets('gõ không dấu → lọc ngay trên máy; không khớp → câu báo',
        (tester) async {
      await pumpTab(tester);

      await tester.enterText(find.byKey(const Key('customers_search')), 'gio bien');
      await tester.pump();
      expect(find.text('Quán Nhậu Gió Biển'), findsOneWidget);
      expect(find.text('Đại Lý Nước Ngọt Minh Tâm'), findsNothing);
      verify(() => repo.getCustomers()).called(1);

      await tester.enterText(find.byKey(const Key('customers_search')), 'zzz');
      await tester.pump();
      expect(find.text(AppStrings.customersNoMatch), findsOneWidget);
    });

    testWidgets('chưa có khách nào → câu báo; tải lỗi → Thử lại', (tester) async {
      when(() => repo.getCustomers()).thenAnswer((_) async => const Ok([]));
      await pumpTab(tester);
      expect(find.text(AppStrings.customersEmpty), findsOneWidget);

      when(() => repo.getCustomers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await tester.pumpWidget(const SizedBox());
      await pumpTab(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);
      when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
      await tester.tap(find.text(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(find.text('Quán Nhậu Gió Biển'), findsOneWidget);
    });

    testWidgets('Nhân viên không có nút thêm khách; Quản lý có', (tester) async {
      await pumpTab(tester);
      expect(find.byKey(const Key('customers_new')), findsNothing);

      await tester.pumpWidget(const SizedBox());
      await pumpTab(tester, canManage: true);
      expect(find.byKey(const Key('customers_new')), findsOneWidget);
    });
  });

  group('thêm khách hàng (Quản lý)', () {
    Future<void> openDialog(WidgetTester tester) async {
      await pumpTab(tester, canManage: true);
      await tester.tap(find.byKey(const Key('customers_new')));
      await tester.pumpAndSettle();
    }

    testWidgets('thiếu mã hoặc tên → báo ngay, không gọi server', (tester) async {
      await openDialog(tester);
      await tester.enterText(find.byKey(const Key('customer_new_code')), 'KH-009');
      await tester.tap(find.byKey(const Key('customer_new_save')));
      await tester.pump();

      expect(find.text(AppStrings.customerCodeNameRequired), findsOneWidget);
      verifyNever(
        () => repo.createCustomer(
          code: any(named: 'code'),
          name: any(named: 'name'),
          address: any(named: 'address'),
          phone: any(named: 'phone'),
        ),
      );
    });

    testWidgets('lưu → gửi các ô đã nhập, đóng hộp, báo tên khách mới',
        (tester) async {
      stubCreate(const Ok(Customer(id: 'c-9', code: 'KH-009', name: 'Quán Cô Ba')));
      await openDialog(tester);
      await tester.enterText(find.byKey(const Key('customer_new_code')), 'KH-009');
      await tester.enterText(find.byKey(const Key('customer_new_name')), 'Quán Cô Ba');
      await tester.enterText(find.byKey(const Key('customer_new_phone')), '0903123456');
      await tester.enterText(find.byKey(const Key('customer_new_address')), '12 Nguyễn Trãi');
      await tester.tap(find.byKey(const Key('customer_new_save')));
      await tester.pumpAndSettle();

      verify(
        () => repo.createCustomer(
          code: 'KH-009',
          name: 'Quán Cô Ba',
          address: '12 Nguyễn Trãi',
          phone: '0903123456',
        ),
      ).called(1);
      expect(find.byKey(const Key('customer_new_save')), findsNothing);
      expect(find.text(AppStrings.customerCreated('Quán Cô Ba')), findsOneWidget);
    });

    testWidgets('trùng mã → hộp vẫn mở với câu của server để sửa', (tester) async {
      stubCreate(const Err(ServerFailure('Mã khách hàng "KH-001" đã tồn tại')));
      await openDialog(tester);
      await tester.enterText(find.byKey(const Key('customer_new_code')), 'KH-001');
      await tester.enterText(find.byKey(const Key('customer_new_name')), 'Trùng');
      await tester.tap(find.byKey(const Key('customer_new_save')));
      await tester.pumpAndSettle();

      expect(find.text('Mã khách hàng "KH-001" đã tồn tại'), findsOneWidget);
      expect(find.byKey(const Key('customer_new_save')), findsOneWidget);
    });
  });

  group('CustomerDetailScreen', () {
    Future<void> pumpDetail(
      WidgetTester tester,
      Customer customer, {
      CustomerLedgerOpener? onOpenLedger,
    }) async {
      await tester.pumpWidget(
        MaterialApp(
          home: CustomerDetailScreen(customer: customer, onOpenLedger: onOpenLedger),
        ),
      );
      await tester.pump();
    }

    testWidgets('bấm một khách trong danh sách → liên hệ và bảng giá của khách',
        (tester) async {
      await pumpTab(tester);
      await tester.tap(find.byKey(const Key('customer_c-1')));
      await tester.pumpAndSettle();

      expect(find.text('0908123456'), findsOneWidget);
      expect(find.text('45 Đường Số 7, Thủ Đức'), findsOneWidget);
      expect(find.text('Đá Bi 5kg'), findsOneWidget);
      expect(find.text('12.000đ/Bao'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('customer_price_p-2')),
          matching: find.text(AppStrings.customerPriceMissing),
        ),
        findsOneWidget,
      );
      verify(() => repo.getPrices('c-1')).called(1);
    });

    testWidgets('khách chưa có số điện thoại / địa chỉ → câu báo, không gọi được',
        (tester) async {
      await pumpDetail(tester, minhTam);

      expect(find.text(AppStrings.customerNoPhone), findsOneWidget);
      expect(find.text(AppStrings.customerNoAddress), findsOneWidget);
      expect(
        tester.widget<ListTile>(find.byKey(const Key('customer_call'))).onTap,
        isNull,
      );
    });

    testWidgets('Nhân viên không thấy sổ nợ; Quản lý bấm thì mở cho đúng khách',
        (tester) async {
      await pumpDetail(tester, gioBien);
      expect(find.byKey(const Key('customer_ledger')), findsNothing);

      Customer? opened;
      await tester.pumpWidget(const SizedBox());
      await pumpDetail(
        tester,
        gioBien,
        onOpenLedger: (_, customer) async => opened = customer,
      );
      await tester.tap(find.byKey(const Key('customer_ledger')));

      expect(opened, gioBien);
    });

    testWidgets('bảng giá lỗi → câu báo lỗi, thử lại được', (tester) async {
      when(() => repo.getPrices(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await pumpDetail(tester, gioBien);
      expect(find.text(FailureMessages.network), findsOneWidget);

      when(() => repo.getPrices(any())).thenAnswer((_) async => const Ok(prices));
      await tester.tap(find.byTooltip(AppStrings.retryButton));
      await tester.pumpAndSettle();
      expect(find.text('Đá Bi 5kg'), findsOneWidget);
    });

    testWidgets('màn hình 360dp, tên và địa chỉ dài → không overflow',
        (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      const long = Customer(
        id: 'c-1',
        code: 'KH-001',
        name: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia Phú Mỹ Hưng Quận Bảy',
        address: 'Số 1 đại lộ Nguyễn Văn Linh, phường Tân Phong, Quận 7, TP.HCM',
        phone: '0908123456',
      );
      when(() => repo.getCustomers()).thenAnswer((_) async => const Ok([long]));
      when(() => repo.getPrices(any())).thenAnswer(
        (_) async => const Ok([
          CustomerPrice(
            productId: 'p-1',
            name: 'Đá viên tinh khiết loại đặc biệt cho nhà hàng',
            sizeKg: 10,
            unit: 'Bao',
            price: 1250000,
          ),
        ]),
      );
      await pumpTab(tester, canManage: true, onOpenLedger: (_, _) async {});
      expect(tester.takeException(), isNull);

      await tester.tap(find.byKey(const Key('customer_c-1')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
