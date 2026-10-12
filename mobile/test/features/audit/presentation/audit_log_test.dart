import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/di/injection_container.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';
import 'package:iceflow_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:iceflow_mobile/features/audit/presentation/cubit/audit_log_cubit.dart';
import 'package:iceflow_mobile/features/audit/presentation/screens/audit_log_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockAuditRepository extends Mock implements AuditRepository {}

void main() {
  setUpAll(() {
    registerFallbackValue(const PageParams());
    registerFallbackValue(AuditFilter.all);
  });

  final payment = AuditEntry(
    id: 'a-2',
    action: 'DEBT_PAYMENT',
    summary: 'Thu tiền 500.000đ (Tiền mặt). Còn nợ 2.900.000đ',
    userName: 'Nguyễn Văn Chủ Xưởng',
    createdAt: DateTime(2026, 10, 11, 9, 40),
    customerName: 'Đại Lý Nước Ngọt Minh Tâm',
  );
  final settled = AuditEntry(
    id: 'a-1',
    action: 'ORDER_SETTLED',
    summary: 'Chốt đơn: Đá Bi 5kg đặt 3, thực giao 2. Ghi nợ 24.000đ',
    userName: 'Nguyễn Văn Chủ Xưởng',
    createdAt: DateTime(2026, 10, 11, 9, 37),
    orderCode: 'DH-9LW7YQ',
    customerName: 'Đại Lý Nước Ngọt Minh Tâm',
  );

  Paginated<AuditEntry> page(List<AuditEntry> items, {int page = 1, int totalPages = 1}) =>
      Paginated(items: items, page: page, limit: 20, totalItems: 25, totalPages: totalPages);

  late _MockAuditRepository repo;

  setUp(() => repo = _MockAuditRepository());

  void stubEntries(Result<Paginated<AuditEntry>> Function(AuditFilter filter, PageParams page) answer) {
    when(() => repo.getEntries(filter: any(named: 'filter'), page: any(named: 'page')))
        .thenAnswer((invocation) async => answer(
              invocation.namedArguments[#filter] as AuditFilter? ?? AuditFilter.all,
              invocation.namedArguments[#page] as PageParams? ?? const PageParams(),
            ));
  }

  group('AuditLogCubit', () {
    test('load → trang đầu, không lọc', () async {
      stubEntries((_, _) => Ok(page([payment, settled], totalPages: 2)));
      final cubit = AuditLogCubit(repo: repo);
      addTearDown(cubit.close);

      await cubit.load();

      verify(() => repo.getEntries(filter: AuditFilter.all)).called(1);
      expect(cubit.state.status, ViewStatus.loaded);
      expect(cubit.state.entries, [payment, settled]);
      expect(cubit.state.hasMore, isTrue);
    });

    test('đổi bộ lọc → tải lại từ đầu với bộ lọc mới; chọn lại bộ lọc cũ thì thôi',
        () async {
      stubEntries((filter, _) => Ok(page(filter == AuditFilter.debt ? [payment] : [payment, settled])));
      final cubit = AuditLogCubit(repo: repo);
      addTearDown(cubit.close);
      await cubit.load();

      await cubit.selectFilter(AuditFilter.debt);
      expect(cubit.state.filter, AuditFilter.debt);
      expect(cubit.state.entries, [payment]);

      await cubit.selectFilter(AuditFilter.debt);
      verify(() => repo.getEntries(filter: AuditFilter.debt)).called(1);
    });

    test('đổi bộ lọc nhanh: kết quả của bộ lọc cũ về muộn không đè lên', () async {
      final slowAll = Completer<Result<Paginated<AuditEntry>>>();
      when(() => repo.getEntries(filter: AuditFilter.all)).thenAnswer((_) => slowAll.future);
      when(() => repo.getEntries(filter: AuditFilter.debt))
          .thenAnswer((_) async => Ok(page([payment])));
      final cubit = AuditLogCubit(repo: repo);
      addTearDown(cubit.close);

      final loading = cubit.load();
      await cubit.selectFilter(AuditFilter.debt);
      slowAll.complete(Ok(page([payment, settled])));
      await loading;

      expect(cubit.state.filter, AuditFilter.debt);
      expect(cubit.state.entries, [payment]);
    });

    test('loadMore → trang kế nối vào cuối, giữ bộ lọc', () async {
      stubEntries((_, params) => params.page == 1
          ? Ok(page([payment], totalPages: 2))
          : Ok(page([settled], page: 2, totalPages: 2)));
      final cubit = AuditLogCubit(repo: repo);
      addTearDown(cubit.close);
      await cubit.selectFilter(AuditFilter.order);

      await cubit.loadMore();

      verify(() => repo.getEntries(filter: AuditFilter.order, page: const PageParams(page: 2))).called(1);
      expect(cubit.state.entries, [payment, settled]);
      expect(cubit.state.hasMore, isFalse);
    });

    test('lỗi lần đầu → trạng thái lỗi; đóng khi đang tải → không lỗi', () async {
      stubEntries((_, _) => const Err(NetworkFailure()));
      final cubit = AuditLogCubit(repo: repo);
      await cubit.load();
      expect(cubit.state.status, ViewStatus.error);
      expect(cubit.state.errorMessage, FailureMessages.network);

      final slow = Completer<Result<Paginated<AuditEntry>>>();
      when(() => repo.getEntries(filter: any(named: 'filter'), page: any(named: 'page')))
          .thenAnswer((_) => slow.future);
      final loading = cubit.load();
      await cubit.close();
      slow.complete(Ok(page([payment])));
      await expectLater(loading, completes);
    });
  });

  group('AuditLogScreen', () {
    setUp(() => sl.registerFactory<AuditLogCubit>(() => AuditLogCubit(repo: repo)));
    tearDown(() => sl.unregister<AuditLogCubit>());

    Future<void> pumpScreen(WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: AuditLogScreen()));
      await tester.pump();
    }

    Finder inEntry(String id, String text) => find.descendant(
          of: find.byKey(Key('audit_entry_$id')),
          matching: find.text(text),
        );

    testWidgets('mỗi dòng: thao tác, nội dung, ai, đơn nào, khách nào, lúc nào',
        (tester) async {
      stubEntries((_, _) => Ok(page([payment, settled])));
      await pumpScreen(tester);

      expect(inEntry('a-2', 'Thu tiền'), findsOneWidget);
      expect(inEntry('a-2', 'Thu tiền 500.000đ (Tiền mặt). Còn nợ 2.900.000đ'), findsOneWidget);
      expect(inEntry('a-2', 'Nguyễn Văn Chủ Xưởng · Đại Lý Nước Ngọt Minh Tâm'), findsOneWidget);
      expect(inEntry('a-2', '09:40 11/10/2026'), findsOneWidget);
      expect(inEntry('a-1', 'Chốt đơn'), findsOneWidget);
      expect(
        inEntry('a-1', 'Nguyễn Văn Chủ Xưởng · DH-9LW7YQ · Đại Lý Nước Ngọt Minh Tâm'),
        findsOneWidget,
      );
    });

    testWidgets('bấm Công nợ → chỉ còn các dòng của bộ lọc đó', (tester) async {
      stubEntries((filter, _) => Ok(page(filter == AuditFilter.debt ? [payment] : [payment, settled])));
      await pumpScreen(tester);

      await tester.tap(find.text(AppStrings.auditFilterDebt));
      await tester.pump();
      await tester.pump();

      expect(find.byKey(const Key('audit_entry_a-2')), findsOneWidget);
      expect(find.byKey(const Key('audit_entry_a-1')), findsNothing);
    });

    testWidgets('còn trang sau → Xem thêm; mã thao tác lạ hiện nguyên mã',
        (tester) async {
      final unknown = AuditEntry(
        id: 'a-0',
        action: 'PRICE_CHANGED',
        summary: 'Đổi giá Đá Bi 5kg',
        userName: 'Chủ',
        createdAt: DateTime(2026, 10, 10, 8),
      );
      stubEntries((_, params) => params.page == 1
          ? Ok(page([payment], totalPages: 2))
          : Ok(page([unknown], page: 2, totalPages: 2)));
      await pumpScreen(tester);

      await tester.tap(find.byKey(const Key('audit_load_more')));
      await tester.pump();
      await tester.pump();

      expect(inEntry('a-0', 'PRICE_CHANGED'), findsOneWidget);
      expect(find.byKey(const Key('audit_load_more')), findsNothing);
    });

    testWidgets('chưa có dòng nào → câu báo; tải lỗi → Thử lại', (tester) async {
      stubEntries((_, _) => Ok(page(const [])));
      await pumpScreen(tester);
      expect(find.text(AppStrings.auditLogEmpty), findsOneWidget);

      stubEntries((_, _) => const Err(NetworkFailure()));
      await pumpScreen(tester);
      await tester.pumpWidget(const SizedBox());
      await pumpScreen(tester);
      expect(find.text(FailureMessages.network), findsOneWidget);
      expect(find.text(AppStrings.retryButton), findsOneWidget);
    });

    testWidgets('điện thoại hẹp (360dp), nội dung dài → không tràn bố cục',
        (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      stubEntries(
        (_, _) => Ok(
          page([
            AuditEntry(
              id: 'a-9',
              action: 'ORDER_STATUS_CHANGED',
              summary: 'Chốt đơn: Đá Viên Tinh Khiết 20kg đặt 30, thực giao 28; '
                  'Đá Bi 5kg đặt 12, thực giao 10. Ghi nợ 1.250.000đ',
              userName: 'Nguyễn Hoàng Thiên Phúc Trường An',
              createdAt: DateTime(2026, 10, 11, 9, 40),
              orderCode: 'DH-9LW7YQ',
              customerName: 'Công Ty TNHH Thương Mại Dịch Vụ Nước Giải Khát Minh Tâm',
            ),
          ]),
        ),
      );
      await pumpScreen(tester);

      expect(tester.takeException(), isNull);
    });
  });
}
