import 'package:equatable/equatable.dart';

/// Trang cần lấy của một API danh sách: `?page=1&limit=20`.
class PageParams extends Equatable {
  const PageParams({this.page = 1, this.limit = defaultLimit})
      : assert(page >= 1, 'page bắt đầu từ 1'),
        assert(limit >= 1 && limit <= maxLimit, 'limit từ 1 tới $maxLimit');

  /// Mặc định và tối đa của server (`src/lib/pagination.ts`).
  static const defaultLimit = 20;
  static const maxLimit = 200;

  /// Số trang, bắt đầu từ 1.
  final int page;
  final int limit;

  PageParams get next => PageParams(page: page + 1, limit: limit);

  Map<String, dynamic> toQuery() => {'page': page, 'limit': limit};

  @override
  List<Object?> get props => [page, limit];
}
