import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/inventory/domain/entities/stock.dart';
import 'package:iceflow_mobile/features/inventory/domain/repositories/inventory_repository.dart';
import 'package:injectable/injectable.dart';

/// State của tab "Kho lạnh" (Quản lý).
class InventoryState extends Equatable {
  const InventoryState({required this.status, this.stock, this.errorMessage});

  final ViewStatus status;

  /// Tồn kho; `null` khi chưa tải được lần nào.
  final Stock? stock;
  final String? errorMessage;

  @override
  List<Object?> get props => [status, stock, errorMessage];
}

/// Kết quả một lần nhập mẻ / kiểm kho, để màn hình báo cho người dùng.
/// [unsure]: mất response, không biết server đã lưu chưa — kho đã được tải
/// lại, màn hình đóng sheet thay vì mời gửi lại.
typedef StockActionResult = ({bool ok, bool unsure, String message});

/// State management tab "Kho lạnh": tồn kho, nhập mẻ sản xuất, kiểm kho.
@injectable
class InventoryCubit extends Cubit<InventoryState> {
  InventoryCubit({required this._repo})
      : super(const InventoryState(status: ViewStatus.loading));

  final InventoryRepository _repo;

  /// Tải (lại) tồn kho; giữ số đang hiện trong lúc tải.
  Future<void> load() async {
    emit(InventoryState(status: ViewStatus.loading, stock: state.stock));
    final res = await _repo.getStock();
    if (isClosed) return;
    switch (res) {
      case Ok<Stock>(:final value):
        emit(InventoryState(status: ViewStatus.loaded, stock: value));
      case Err<Stock>(:final failure):
        emit(
          InventoryState(
            status: ViewStatus.error,
            stock: state.stock,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Nhập một mẻ: cộng [quantity] vào tồn của [item].
  Future<StockActionResult> recordProduction(StockItem item, int quantity) {
    return _record(
      _repo.recordProduction(productId: item.productId, quantity: quantity),
      (onHand) => AppStrings.stockProductionSaved(quantity, item.unit, onHand),
    );
  }

  /// Kiểm kho: số đếm [counted] thay cho tồn trên sổ của [item].
  Future<StockActionResult> recordCount(
    StockItem item,
    int counted, {
    String? note,
  }) {
    return _record(
      _repo.recordCount(productId: item.productId, counted: counted, note: note),
      (onHand) => AppStrings.stockCountSaved(onHand, item.unit),
    );
  }

  Future<StockActionResult> _record(
    Future<Result<int>> call,
    String Function(int onHand) success,
  ) async {
    final res = await call;
    switch (res) {
      case Ok<int>(:final value):
        // Lấy lại cả kho: tổng, số còn bán được và cảnh báo đều đổi theo.
        if (!isClosed) await load();
        return (ok: true, unsure: false, message: success(value));
      case Err<int>(:final failure):
        if (failure is NetworkFailure && failure.outcomeUnknown) {
          // Server có thể đã ghi: tải lại kho để người dùng tự kiểm.
          if (!isClosed) await load();
          return (ok: false, unsure: true, message: AppStrings.stockUnsure);
        }
        return (ok: false, unsure: false, message: failureMessage(failure));
    }
  }
}
