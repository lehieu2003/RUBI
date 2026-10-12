import 'package:flutter_test/flutter_test.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/pagination/list_query_params.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_dto.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/pagination/search_debouncer.dart';
import 'package:iceflow_mobile/core/result/result.dart';

void main() {
  group('PageParams', () {
    test('mặc định trang 1, 20 dòng; next sang trang kế', () {
      expect(const PageParams().toQuery(), {'page': 1, 'limit': 20});
      expect(const PageParams(page: 2, limit: 50).next,
          const PageParams(page: 3, limit: 50));
    });

    test('từ chối trang 0 và limit vượt mức server cho phép', () {
      expect(() => PageParams(page: 0), throwsAssertionError);
      expect(() => PageParams(limit: 201), throwsAssertionError);
    });
  });

  group('ListQueryParams', () {
    test('gửi q đã trim; từ khoá rỗng thì không gửi', () {
      expect(
        const ListQueryParams(search: '  minh tâm ').toQuery(),
        {'page': 1, 'limit': 20, 'q': 'minh tâm'},
      );
      expect(const ListQueryParams(search: '   ').toQuery(),
          {'page': 1, 'limit': 20});
    });
  });

  group('PaginationDto', () {
    // Đúng dạng `meta` của api/openapi/fixtures/responses/success/listOrders.json
    const meta = {'page': 2, 'limit': 20, 'total_item': 45, 'total_page': 3};

    test('meta của server → Paginated, còn trang sau', () {
      final page = PaginationDto.fromJson(meta).toPage(['a', 'b']);
      expect(
        page,
        const Ok(Paginated(
          items: ['a', 'b'],
          page: 2,
          limit: 20,
          totalItems: 45,
          totalPages: 3,
        )),
      );
      expect((page as Ok<Paginated<String>>).value.hasNext, isTrue);
    });

    test('trang cuối không còn trang sau', () {
      final page = PaginationDto.fromJson({...meta, 'page': 3}).toPage<int>([]);
      expect((page as Ok<Paginated<int>>).value.hasNext, isFalse);
    });

    test('meta thiếu field → Err(UnexpectedFailure)', () {
      final page = PaginationDto.fromJson({'page': 1}).toPage<int>([]);
      expect((page as Err<Paginated<int>>).failure, isA<UnexpectedFailure>());
    });
  });

  group('SearchDebouncer', () {
    // testWidgets chạy trong đồng hồ giả: pump(duration) cho thời gian trôi.
    testWidgets('chỉ chạy lần gõ cuối, sau khoảng chờ', (tester) async {
      final debouncer = SearchDebouncer();
      final ran = <String>[];
      debouncer.run(() => ran.add('m'));
      await tester.pump(const Duration(milliseconds: 200));
      debouncer.run(() => ran.add('mi'));
      await tester.pump(const Duration(milliseconds: 299));
      expect(ran, isEmpty);
      await tester.pump(const Duration(milliseconds: 1));
      expect(ran, ['mi']);
    });

    testWidgets('dispose huỷ lần đang chờ', (tester) async {
      final debouncer = SearchDebouncer();
      var ran = false;
      debouncer.run(() => ran = true);
      debouncer.dispose();
      await tester.pump(const Duration(seconds: 1));
      expect(ran, isFalse);
    });
  });
}
