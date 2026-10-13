import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:iceflow_mobile/core/localization/strings.dart';
import 'package:iceflow_mobile/core/network/api_failure_messages.dart';
import 'package:iceflow_mobile/core/result/result.dart';
import 'package:iceflow_mobile/core/view_state/view_status.dart';
import 'package:iceflow_mobile/features/auth/domain/entities/user.dart';
import 'package:iceflow_mobile/features/staff/domain/entities/staff_account.dart';
import 'package:iceflow_mobile/features/staff/domain/repositories/staff_repository.dart';
import 'package:injectable/injectable.dart';

/// State của màn "Nhân sự" (Quản lý).
class StaffState extends Equatable {
  const StaffState({
    required this.status,
    this.accounts = const [],
    this.errorMessage,
  });

  final ViewStatus status;

  /// Mọi tài khoản của nhà máy, mới nhất trước.
  final List<StaffAccount> accounts;
  final String? errorMessage;

  @override
  List<Object?> get props => [status, accounts, errorMessage];
}

/// Kết quả một thao tác trên tài khoản, để màn hình báo cho người dùng.
typedef StaffActionResult = ({bool ok, String message});

/// State management màn "Nhân sự": danh sách tài khoản, thêm, sửa, đổi vai
/// trò, đặt lại mật khẩu, khóa / mở khóa.
@injectable
class StaffCubit extends Cubit<StaffState> {
  StaffCubit({required this._repo})
      : super(const StaffState(status: ViewStatus.loading));

  final StaffRepository _repo;

  Future<void> load() async {
    emit(StaffState(status: ViewStatus.loading, accounts: state.accounts));
    final res = await _repo.getAccounts();
    if (isClosed) return;
    switch (res) {
      case Ok<List<StaffAccount>>(:final value):
        emit(StaffState(status: ViewStatus.loaded, accounts: value));
      case Err<List<StaffAccount>>(:final failure):
        emit(
          StaffState(
            status: ViewStatus.error,
            // Lỗi khi làm mới thì giữ danh sách đang xem.
            accounts: state.accounts,
            errorMessage: failureMessage(failure),
          ),
        );
    }
  }

  /// Tạo tài khoản với mật khẩu tạm; thành công thì tải lại danh sách.
  Future<StaffActionResult> create({
    required String name,
    required String email,
    required String password,
    required UserRole role,
    String? phone,
  }) async {
    final res = await _repo.createAccount(
      name: name,
      email: email,
      password: password,
      role: role,
      phone: phone,
    );
    switch (res) {
      case Ok<StaffAccount>(:final value):
        if (!isClosed) await load();
        return (ok: true, message: AppStrings.staffCreated(value.name));
      case Err<StaffAccount>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }

  /// Sửa tên và số điện thoại ([phone] rỗng là xoá số).
  Future<StaffActionResult> edit(
    StaffAccount account, {
    required String name,
    required String phone,
  }) =>
      _update(
        _repo.updateAccount(account.id, name: name, phone: phone),
        (update) => AppStrings.staffSaved(update.account.name),
      );

  /// Đổi vai trò giữa Nhân viên và Tài xế.
  Future<StaffActionResult> setRole(StaffAccount account, UserRole role) =>
      _update(
        _repo.updateAccount(account.id, role: role),
        (update) => _withUnassigned(
          AppStrings.staffRoleChanged(
            update.account.name,
            AppStrings.staffRoleLabel(update.account.role.name),
          ),
          update,
        ),
      );

  /// Khóa hoặc mở khóa tài khoản.
  Future<StaffActionResult> setActive(StaffAccount account, {required bool active}) =>
      _update(
        _repo.updateAccount(account.id, isActive: active),
        (update) => _withUnassigned(
          active
              ? AppStrings.staffUnlocked(update.account.name)
              : AppStrings.staffLocked(update.account.name),
          update,
        ),
      );

  /// Đặt lại mật khẩu; người đó phải đổi ở lần đăng nhập kế.
  Future<StaffActionResult> resetPassword(StaffAccount account, String password) =>
      _update(
        _repo.updateAccount(account.id, password: password),
        (update) => AppStrings.staffPasswordReset(update.account.name),
      );

  /// Gỡ đơn khỏi một tài xế là hệ quả đáng báo: đơn phải được gán lại.
  String _withUnassigned(String message, StaffUpdate update) =>
      update.unassignedOrders == 0
          ? message
          : '$message ${AppStrings.staffOrdersUnassigned(update.unassignedOrders)}';

  Future<StaffActionResult> _update(
    Future<Result<StaffUpdate>> request,
    String Function(StaffUpdate update) message,
  ) async {
    switch (await request) {
      case Ok<StaffUpdate>(:final value):
        if (!isClosed) {
          emit(
            StaffState(
              status: state.status,
              accounts: [
                for (final account in state.accounts)
                  account.id == value.account.id ? value.account : account,
              ],
              errorMessage: state.errorMessage,
            ),
          );
        }
        return (ok: true, message: message(value));
      case Err<StaffUpdate>(:final failure):
        return (ok: false, message: failureMessage(failure));
    }
  }
}
