import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/shells/data/shells_repository_impl.dart';
import 'package:iceflow_mobile/features/shells/domain/shell_balance.dart';
import 'package:iceflow_mobile/features/shells/presentation/shells_cubit.dart';
import 'package:iceflow_mobile/features/shells/presentation/shells_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockRepo extends Mock implements ShellsRepository {}

/// Một response thật mà server đã trả, do `npm run contract:verify -- --record`
/// ghi lại ở gốc repo.
Map<String, dynamic> recordedFile(String kind, String name) =>
    jsonDecode(
      File('../api/openapi/fixtures/responses/$kind/$name.json').readAsStringSync(),
    ) as Map<String, dynamic>;

const namCan = ShellBalance(
  customerId: 'c-1',
  customerName: 'Vựa Hải Sản Năm Căn',
  shellsOut: 40,
  shellsIn: 10,
  depositPerShell: 50000,
  netDepositOwed: 1500000,
);
const minhTam = ShellBalance(
  customerId: 'c-2',
  customerName: 'Đại Lý Nước Ngọt Minh Tâm',
  shellsOut: 50,
  shellsIn: 25,
  depositPerShell: 50000,
  netDepositOwed: 1250000,
);

void main() {
  group('ShellsRepositoryImpl', () {
    late Dio dio;
    late DioAdapter adapter;
    late ShellsRepositoryImpl repo;
    late List<RequestOptions> requests;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: 'http://test.local'));
      adapter = DioAdapter(dio: dio, matcher: const UrlRequestMatcher());
      repo = ShellsRepositoryImpl(dio: dio);
      requests = [];
      dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
        requests.add(options);
        handler.next(options);
      }));
    });

    tearDown(() => dio.close());

    dynamic sentBody() {
      final raw = requests.last.data;
      return raw is String ? jsonDecode(raw) : raw;
    }

    test('getBalances: response thật của server → đúng từng field', () async {
      final body = recordedFile('success', 'listShellDeposits')['body'] as Map<String, dynamic>;
      adapter.onGet('/api/deposits/shells', (server) => server.reply(200, body));

      final balances = ((await repo.getBalances()) as Ok<List<ShellBalance>>).value;

      final rows = body['data'] as List;
      expect(balances, hasLength(rows.length));
      final first = rows.first as Map<String, dynamic>;
      expect(
        balances.first,
        ShellBalance(
          customerId: first['customerId'] as String,
          customerName: first['customerName'] as String,
          shellsOut: first['shellsOut'] as int,
          shellsIn: first['shellsIn'] as int,
          depositPerShell: (first['depositPerShell'] as num).toDouble(),
          netDepositOwed: (first['netDepositOwed'] as num).toDouble(),
        ),
      );
      expect(balances.first.held, (first['shellsOut'] as int) - (first['shellsIn'] as int));
    });

    test('getBalances: thiếu số vỏ → lỗi, không đoán', () async {
      adapter.onGet('/api/deposits/shells', (server) {
        server.reply(200, {
          'success': true,
          'data': [
            {'customerId': 'c-1', 'customerName': 'A', 'shellsOut': 40, 'depositPerShell': 50000, 'netDepositOwed': 0},
          ],
        });
      });

      expect(
        ((await repo.getBalances()) as Err<List<ShellBalance>>).failure,
        isA<UnexpectedFailure>(),
      );
    });

    test('record: response thật → Ok; chỉ gửi số lớn hơn 0, không gửi mode',
        () async {
      adapter.onPatch(
        '/api/deposits/shells',
        (server) => server.reply(200, recordedFile('success', 'updateShellDeposit')['body']),
        data: Matchers.any,
      );

      final res = await repo.record(customerId: 'c-1', shellsOut: 5);

      expect(res, isA<Ok<void>>());
      expect(sentBody(), {'customerId': 'c-1', 'shellsOut': 5});
    });

    test('correct: gửi mode SET kèm cả hai tổng, kể cả số 0', () async {
      adapter.onPatch(
        '/api/deposits/shells',
        (server) => server.reply(200, recordedFile('success', 'updateShellDeposit')['body']),
        data: Matchers.any,
      );

      await repo.correct(customerId: 'c-1', shellsOut: 7, shellsIn: 0);

      expect(sentBody(), {'customerId': 'c-1', 'mode': 'SET', 'shellsOut': 7, 'shellsIn': 0});
    });

    test('server từ chối (400) → response thật, giữ câu của server', () async {
      final fixture = recordedFile('error', 'updateShellDeposit.400');
      adapter.onPatch('/api/deposits/shells', (server) => server.reply(400, fixture['body']),
          data: Matchers.any);

      expect(
        ((await repo.correct(customerId: 'c-1', shellsOut: 7, shellsIn: 0)) as Err<void>).failure,
        ServerFailure(
          (fixture['body'] as Map<String, dynamic>)['error'] as String,
          statusCode: 400,
        ),
      );
    });
  });

  group('màn Vỏ bao', () {
    late _MockRepo repo;

    setUp(() {
      repo = _MockRepo();
      sl.registerFactory<ShellsCubit>(() => ShellsCubit(repo: repo));
      when(() => repo.getBalances()).thenAnswer((_) async => const Ok([namCan, minhTam]));
      when(
        () => repo.record(
          customerId: any(named: 'customerId'),
          shellsOut: any(named: 'shellsOut'),
          shellsIn: any(named: 'shellsIn'),
        ),
      ).thenAnswer((_) async => const Ok<void>(null));
      when(
        () => repo.correct(
          customerId: any(named: 'customerId'),
          shellsOut: any(named: 'shellsOut'),
          shellsIn: any(named: 'shellsIn'),
        ),
      ).thenAnswer((_) async => const Ok<void>(null));
    });

    tearDown(() => sl.unregister<ShellsCubit>());

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: ShellsScreen()));
      await tester.pump();
    }

    Future<void> open(WidgetTester tester, String id) async {
      await tester.tap(find.byKey(Key('shells_$id')));
      await tester.pumpAndSettle();
    }

    String text(WidgetTester tester, String key) =>
        tester.widget<Text>(find.byKey(Key(key))).data!;

    test('cubit: tổng vỏ đang giữ và tổng tiền cọc; lỗi khi làm mới giữ danh sách',
        () async {
      final cubit = ShellsCubit(repo: repo);
      addTearDown(cubit.close);
      await cubit.load();
      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.totalHeld, 55);
      expect(cubit.state.totalDeposit, 2750000);

      when(() => repo.getBalances())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.load();
      expect(cubit.state.balances, hasLength(2));
      expect(cubit.state.errorMessage, FailureMessages.network);
    });

    testWidgets('tổng, và từng khách: đã giao / đã thu, còn giữ, tiền cọc',
        (tester) async {
      await pumpScreen(tester);

      expect(text(tester, 'shells_total_held'), AppStrings.shellsTotalHeld(55));
      expect(text(tester, 'shells_total_deposit'), AppStrings.shellsTotalDeposit('2.750.000đ'));
      final row = find.byKey(const Key('shells_c-1'));
      expect(find.descendant(of: row, matching: find.text(AppStrings.shellsOutIn(40, 10))), findsOneWidget);
      expect(find.descendant(of: row, matching: find.text(AppStrings.shellsHeld(30))), findsOneWidget);
      expect(find.descendant(of: row, matching: find.text('1.500.000đ')), findsOneWidget);
    });

    testWidgets('ghi thêm: giao 5, thu 2 → gửi đúng số, báo kết quả, tải lại',
        (tester) async {
      await pumpScreen(tester);
      await open(tester, 'c-1');
      expect(find.text(AppStrings.shellsHeldNow(30)), findsOneWidget);
      clearInteractions(repo);

      await tester.enterText(find.byKey(const Key('shells_out')), '5');
      await tester.enterText(find.byKey(const Key('shells_in')), '2');
      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pumpAndSettle();

      verify(() => repo.record(customerId: 'c-1', shellsOut: 5, shellsIn: 2)).called(1);
      verify(() => repo.getBalances()).called(1);
      expect(
        find.text('Vựa Hải Sản Năm Căn: giao thêm 5 vỏ, thu về 2 vỏ'),
        findsOneWidget,
      );
    });

    testWidgets('không nhập gì, hoặc thu về nhiều hơn số đang giữ → bị chặn',
        (tester) async {
      await pumpScreen(tester);
      await open(tester, 'c-1');

      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pump();
      expect(find.text(AppStrings.shellsNothingEntered), findsOneWidget);

      await tester.enterText(find.byKey(const Key('shells_in')), '31');
      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pump();
      expect(find.text(AppStrings.shellsReturnTooMany(30)), findsOneWidget);
      verifyNever(
        () => repo.record(
          customerId: any(named: 'customerId'),
          shellsOut: any(named: 'shellsOut'),
          shellsIn: any(named: 'shellsIn'),
        ),
      );
    });

    testWidgets('sửa tổng: ô mở sẵn số đang lưu; thu lớn hơn giao bị chặn; hợp lệ thì gửi',
        (tester) async {
      await pumpScreen(tester);
      await open(tester, 'c-1');
      await tester.tap(find.text(AppStrings.shellsModeSet));
      await tester.pump();

      expect(tester.widget<TextField>(find.byKey(const Key('shells_out'))).controller!.text, '40');
      expect(tester.widget<TextField>(find.byKey(const Key('shells_in'))).controller!.text, '10');
      await tester.enterText(find.byKey(const Key('shells_in')), '41');
      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pump();
      expect(find.text(AppStrings.shellsInExceedsOut), findsOneWidget);

      await tester.enterText(find.byKey(const Key('shells_out')), '38');
      await tester.enterText(find.byKey(const Key('shells_in')), '10');
      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pumpAndSettle();
      verify(() => repo.correct(customerId: 'c-1', shellsOut: 38, shellsIn: 10)).called(1);
      expect(find.text(AppStrings.shellsCorrected('Vựa Hải Sản Năm Căn')), findsOneWidget);
    });

    testWidgets('server từ chối → hộp vẫn mở với câu của server', (tester) async {
      when(
        () => repo.record(
          customerId: any(named: 'customerId'),
          shellsOut: any(named: 'shellsOut'),
          shellsIn: any(named: 'shellsIn'),
        ),
      ).thenAnswer((_) async => const Err<void>(ServerFailure('Không tìm thấy khách hàng')));
      await pumpScreen(tester);
      await open(tester, 'c-1');
      await tester.enterText(find.byKey(const Key('shells_out')), '5');
      await tester.tap(find.byKey(const Key('shells_save')));
      await tester.pumpAndSettle();

      expect(find.text('Không tìm thấy khách hàng'), findsOneWidget);
      expect(find.byKey(const Key('shells_save')), findsOneWidget);
    });

    testWidgets('chưa có khách nào → câu báo; tải lỗi → Thử lại', (tester) async {
      when(() => repo.getBalances()).thenAnswer((_) async => const Ok([]));
      await pumpScreen(tester);
      expect(find.text(AppStrings.shellsEmpty), findsOneWidget);

      when(() => repo.getBalances())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      await tester.pumpWidget(const SizedBox());
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);
      expect(find.text(AppStrings.retryButton), findsOneWidget);
    });

    testWidgets('màn hình 360dp, tên dài, số lớn → không overflow', (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      when(() => repo.getBalances()).thenAnswer(
        (_) async => const Ok([
          ShellBalance(
            customerId: 'c-1',
            customerName: 'Nhà hàng tiệc cưới hội nghị Hoàng Gia Phú Mỹ Hưng Quận Bảy',
            shellsOut: 123456,
            shellsIn: 23456,
            depositPerShell: 50000,
            netDepositOwed: 5000000000,
          ),
        ]),
      );
      await pumpScreen(tester);
      expect(tester.takeException(), isNull);
      await open(tester, 'c-1');
      expect(tester.takeException(), isNull);
    });
  });
}
