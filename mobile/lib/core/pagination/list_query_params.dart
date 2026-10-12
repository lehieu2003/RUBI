import 'package:equatable/equatable.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';

/// Tham số của một API danh sách có tìm kiếm: trang + từ khoá `q`.
class ListQueryParams extends Equatable {
  const ListQueryParams({this.page = const PageParams(), this.search});

  final PageParams page;

  /// Từ khoá tìm kiếm; rỗng hoặc toàn khoảng trắng thì không gửi.
  final String? search;

  Map<String, dynamic> toQuery() {
    final keyword = search?.trim();
    return {
      ...page.toQuery(),
      if (keyword != null && keyword.isNotEmpty) 'q': keyword,
    };
  }

  @override
  List<Object?> get props => [page, search];
}
