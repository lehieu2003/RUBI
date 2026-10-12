// `meta` của response danh sách: `{ page, limit, total_item, total_page }`.
//
// `fromJson` do json_serializable sinh (`pagination_dto.g.dart`; sửa file này
// xong chạy `dart run build_runner build`).
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pagination_dto.g.dart';

@JsonSerializable(createToJson: false)
class PaginationDto {
  const PaginationDto({this.page, this.limit, this.totalItem, this.totalPage});

  factory PaginationDto.fromJson(Map<String, dynamic> json) =>
      _$PaginationDtoFromJson(json);

  final int? page;
  final int? limit;
  @JsonKey(name: 'total_item')
  final int? totalItem;
  @JsonKey(name: 'total_page')
  final int? totalPage;

  /// Ghép [items] đã map với metadata này. Thiếu field nào là payload hỏng.
  Result<Paginated<T>> toPage<T>(List<T> items) {
    final page = this.page;
    final limit = this.limit;
    final totalItem = this.totalItem;
    final totalPage = this.totalPage;
    if (page == null || limit == null || totalItem == null || totalPage == null) {
      return const Err(UnexpectedFailure('List response has incomplete `meta`'));
    }
    return Ok(
      Paginated(
        items: items,
        page: page,
        limit: limit,
        totalItems: totalItem,
        totalPages: totalPage,
      ),
    );
  }
}
