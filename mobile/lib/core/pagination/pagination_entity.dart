import 'package:equatable/equatable.dart';

/// Một trang kết quả của API danh sách.
class Paginated<T> extends Equatable {
  const Paginated({
    required this.items,
    required this.page,
    required this.limit,
    required this.totalItems,
    required this.totalPages,
  });

  final List<T> items;

  /// Số trang hiện tại, bắt đầu từ 1.
  final int page;
  final int limit;
  final int totalItems;
  final int totalPages;

  bool get hasNext => page < totalPages;

  @override
  List<Object?> get props => [items, page, limit, totalItems, totalPages];
}
