import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/customers/domain/entities/customer.dart';
import 'package:iceflow_mobile/features/customers/domain/repositories/customers_repository.dart';
import 'package:iceflow_mobile/features/customers/presentation/cubit/customers_cubit.dart';
import 'package:mocktail/mocktail.dart';

import 'customers_fixtures.dart';

class _MockRepo extends Mock implements CustomersRepository {}

void main() {
  late _MockRepo repo;

  setUp(() {
    repo = _MockRepo();
    when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
    when(() => repo.getPrices(any())).thenAnswer((_) async => const Ok(prices));
  });

  group('CustomersCubit', () {
    late CustomersCubit cubit;
    setUp(() => cubit = CustomersCubit(repo: repo));
    tearDown(() => cubit.close());

    test('load → danh sách khách', () async {
      await cubit.load();

      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.matches, customers);
    });

    test('lỗi lần đầu → câu báo; lỗi khi làm mới → giữ danh sách đang xem',
        () async {
      when(() => repo.getCustomers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);
      expect(cubit.state.customers, isEmpty);

      when(() => repo.getCustomers()).thenAnswer((_) async => const Ok(customers));
      await cubit.load();
      when(() => repo.getCustomers())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.customers, customers);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    test('tìm theo tên không dấu, mã, số điện thoại; giữ từ khoá khi tải lại',
        () async {
      await cubit.load();

      cubit.search('minh tam');
      expect(cubit.state.matches, [minhTam]);
      cubit.search('kh-001');
      expect(cubit.state.matches, [gioBien]);
      cubit.search('0908');
      expect(cubit.state.matches, [gioBien]);

      await cubit.load();
      expect(cubit.state.query, '0908');
      expect(cubit.state.matches, [gioBien]);
    });

    test('create → báo tên khách mới và tải lại danh sách', () async {
      const created = Customer(id: 'c-9', code: 'KH-009', name: 'Quán Cô Ba');
      when(
        () => repo.createCustomer(
          code: any(named: 'code'),
          name: any(named: 'name'),
          address: any(named: 'address'),
          phone: any(named: 'phone'),
        ),
      ).thenAnswer((_) async => const Ok(created));

      final result = await cubit.create(
        code: 'KH-009',
        name: 'Quán Cô Ba',
        phone: '0903123456',
      );

      expect(result, (ok: true, message: AppStrings.customerCreated('Quán Cô Ba')));
      verify(
        () => repo.createCustomer(
          code: 'KH-009',
          name: 'Quán Cô Ba',
          address: null,
          phone: '0903123456',
        ),
      ).called(1);
      verify(() => repo.getCustomers()).called(1);
    });

    test('create trùng mã → câu của server, không tải lại', () async {
      when(
        () => repo.createCustomer(
          code: any(named: 'code'),
          name: any(named: 'name'),
          address: any(named: 'address'),
          phone: any(named: 'phone'),
        ),
      ).thenAnswer(
        (_) async => const Err(ServerFailure('Mã khách hàng "KH-001" đã tồn tại')),
      );

      final result = await cubit.create(code: 'KH-001', name: 'Trùng');

      expect(result, (ok: false, message: 'Mã khách hàng "KH-001" đã tồn tại'));
      verifyNever(() => repo.getCustomers());
    });

    test('đóng khi đang chờ mạng → không lỗi', () async {
      final pending = Completer<Result<List<Customer>>>();
      when(() => repo.getCustomers()).thenAnswer((_) => pending.future);

      final running = cubit.load();
      await cubit.close();
      pending.complete(const Ok(customers));

      await expectLater(running, completes);
    });
  });

  group('CustomerDetailCubit', () {
    test('load → bảng giá của đúng khách; lỗi → câu báo, load lại được',
        () async {
      final cubit = CustomerDetailCubit(repo: repo, customer: gioBien);
      addTearDown(cubit.close);

      await cubit.load();
      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.prices, prices);
      verify(() => repo.getPrices('c-1')).called(1);

      when(() => repo.getPrices(any()))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);
    });
  });
}
