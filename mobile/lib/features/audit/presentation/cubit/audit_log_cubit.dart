import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/pagination/page_params.dart';
import 'package:iceflow_mobile/core/pagination/pagination_entity.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/audit/domain/entities/audit_entry.dart';
import 'package:iceflow_mobile/features/audit/domain/repositories/audit_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Nhật ký".
class AuditLogState extends Equatable {
  const AuditLogState({
    required this.status,
    required this.filter,
    this.entries = const [],
    this.hasMore = false,
    this.nextPage = const PageParams(),
    this.loadingMore = false,
    this.errorMessage,
  });

  final ViewStatus status;
  final AuditFilter filter;

  /// Các dòng đã tải, mới nhất trước.
  final List<AuditEntry> entries;
  final bool hasMore;
  final PageParams nextPage;
  final bool loadingMore;
  final String? errorMessage;

  @override
  List<Object?> get props =>
      [status, filter, entries, hasMore, nextPage, loadingMore, errorMessage];
}

/// State management màn "Nhật ký": đọc nhật ký theo trang, lọc theo loại.
@injectable
class AuditLogCubit extends Cubit<AuditLogState> {
  AuditLogCubit({required this._repo})
      : super(
          const AuditLogState(
            status: ViewStatus.loading,
            filter: AuditFilter.all,
          ),
        );

  final AuditRepository _repo;

  /// Tải lại từ trang đầu với bộ lọc hiện tại.
  Future<void> load() => _loadFirstPage(state.filter, keep: state.entries);

  /// Đổi bộ lọc và tải lại từ đầu.
  Future<void> selectFilter(AuditFilter filter) {
    if (filter == state.filter) return Future.value();
    return _loadFirstPage(filter, keep: const []);
  }

  Future<void> _loadFirstPage(
    AuditFilter filter, {
    required List<AuditEntry> keep,
  }) async {
    emit(AuditLogState(status: ViewStatus.loading, filter: filter, entries: keep));
    final res = await _repo.getEntries(filter: filter);
    // Màn hình đã đóng, hoặc người dùng đã đổi bộ lọc trong lúc chờ.
    if (isClosed || state.filter != filter) return;
    switch (res) {
      case Ok<Paginated<AuditEntry>>(:final value):
        emit(
          AuditLogState(
            status: ViewStatus.loaded,
            filter: filter,
            entries: value.items,
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<AuditEntry>>(:final failure):
        emit(
          AuditLogState(
            status: ViewStatus.error,
            filter: filter,
            entries: keep,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Tải trang kế tiếp và nối vào cuối danh sách.
  Future<void> loadMore() async {
    if (!state.hasMore || state.loadingMore) return;
    final filter = state.filter;
    emit(_copy(loadingMore: true));
    final res = await _repo.getEntries(filter: filter, page: state.nextPage);
    if (isClosed || state.filter != filter) return;
    switch (res) {
      case Ok<Paginated<AuditEntry>>(:final value):
        emit(
          AuditLogState(
            status: ViewStatus.loaded,
            filter: filter,
            entries: [...state.entries, ...value.items],
            hasMore: value.hasNext,
            nextPage: PageParams(page: value.page + 1, limit: value.limit),
          ),
        );
      case Err<Paginated<AuditEntry>>(:final failure):
        emit(_copy(loadingMore: false, errorMessage: failureMessage(failure)));
    }
  }

  AuditLogState _copy({required bool loadingMore, String? errorMessage}) =>
      AuditLogState(
        status: state.status,
        filter: state.filter,
        entries: state.entries,
        hasMore: state.hasMore,
        nextPage: state.nextPage,
        loadingMore: loadingMore,
        errorMessage: errorMessage,
      );
}
